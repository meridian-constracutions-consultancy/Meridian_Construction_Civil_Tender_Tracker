import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.setting import SystemSetting
from app.models.tender import Tender
from app.services.classification.engine import classification_engine

logger = logging.getLogger("settings_api")
router = APIRouter(prefix="/settings", tags=["settings"])

class KeywordCategoryUpdate(BaseModel):
    id: str
    name: str
    positive_keywords: List[str]
    phrases: Optional[List[str]] = []

class KeywordsUpdateRequest(BaseModel):
    search_keywords: Optional[List[str]] = None
    categories: Optional[List[Dict[str, Any]]] = None
    new_keyword: Optional[str] = None
    category_id: Optional[str] = None
    disqualifying_negative_keywords: Optional[List[str]] = None

@router.get("/keywords")
def get_keywords_settings(db: Session = Depends(get_db)):
    """
    Returns active keywords for search and classification.
    Checks persistent database settings first, falling back to rules.json.
    """
    db_setting = db.execute(
        select(SystemSetting).where(SystemSetting.key == "keywords_config")
    ).scalar_one_or_none()

    if db_setting:
        try:
            config = json.loads(db_setting.value)
            return config
        except Exception as e:
            logger.warning(f"Error parsing database keywords_config: {e}")

    # Fallback to in-engine rules
    return classification_engine.get_keywords_config()

@router.post("/keywords")
def update_keywords_settings(payload: KeywordsUpdateRequest, db: Session = Depends(get_db)):
    """
    Updates keywords configuration, saves permanently to database and rules.json,
    reloads classification engine, and triggers real-time tender re-classification.
    """
    current_config = classification_engine.get_keywords_config()

    # 1. Update search keywords
    if payload.search_keywords is not None:
        cleaned = []
        for k in payload.search_keywords:
            k_clean = k.strip()
            if k_clean and k_clean.lower() not in [c.lower() for c in cleaned]:
                cleaned.append(k_clean)
        current_config["search_keywords"] = cleaned

        # Auto-synchronize: Ensure every search keyword is also in category positive_keywords
        # so crawler discovered tenders with that keyword are guaranteed to be classified!
        cleaned_lower = {k.lower() for k in cleaned}
        for cat in current_config.get("categories", []):
            if cat.get("id") == "consultancy_pmc_dpr":
                pos_list = cat.get("positive_keywords", [])
                all_cat_pos = set()
                for c in current_config.get("categories", []):
                    for p in c.get("positive_keywords", []):
                        all_cat_pos.add(p.lower())
                for sk in cleaned:
                    if sk.lower() not in all_cat_pos:
                        pos_list.append(sk.lower())
                cat["positive_keywords"] = pos_list
                break

    # 2. Add single new keyword if provided
    if payload.new_keyword:
        kw_clean = payload.new_keyword.strip()
        if kw_clean:
            search_kws = current_config.get("search_keywords", [])
            if kw_clean.lower() not in [s.lower() for s in search_kws]:
                search_kws.append(kw_clean)
            current_config["search_keywords"] = search_kws

            cat_id = payload.category_id or "consultancy_pmc_dpr"
            for cat in current_config.get("categories", []):
                if cat.get("id") == cat_id:
                    pos_kws = cat.get("positive_keywords", [])
                    if kw_clean.lower() not in [p.lower() for p in pos_kws]:
                        pos_kws.append(kw_clean.lower())
                    cat["positive_keywords"] = pos_kws
                    break

    # 3. Update categories if provided
    if payload.categories is not None:
        current_config["categories"] = payload.categories

    # 4. Update disqualifying negatives if provided
    if payload.disqualifying_negative_keywords is not None:
        current_config["disqualifying_negative_keywords"] = payload.disqualifying_negative_keywords

    # 5. Persist to rules.json (Code & JSON database on disk)
    try:
        classification_engine.update_rules(current_config)
    except Exception as e:
        logger.error(f"Error saving to rules.json: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update rules on disk: {e}")

    # 6. Persist to database SystemSetting (DB level JSON persistence)
    config_json = json.dumps(current_config, indent=2)
    db_setting = db.execute(
        select(SystemSetting).where(SystemSetting.key == "keywords_config")
    ).scalar_one_or_none()

    if db_setting:
        db_setting.value = config_json
    else:
        db_setting = SystemSetting(key="keywords_config", value=config_json)
        db.add(db_setting)

    db.commit()

    # 7. Real-time tender re-classification with new rules
    reclassified_count = 0
    all_tenders = db.query(Tender).all()
    for t in all_tenders:
        result = classification_engine.classify(
            title=t.title,
            work_description=t.work_description,
            product_category=t.product_category,
            tender_category=t.tender_category
        )
        t.is_civil_construction = result.is_civil_construction
        t.classification_score = result.score
        t.category_id = result.category_id
        t.matched_keywords = ", ".join(result.matched_keywords) if result.matched_keywords else None
        if result.is_civil_construction:
            reclassified_count += 1

    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Keywords saved successfully! Re-evaluated {len(all_tenders)} tenders ({reclassified_count} design/consultancy matches).",
        "config": current_config
    }

@router.post("/sync-seed")
def sync_seed_endpoint(db: Session = Depends(get_db)):
    """
    Manually triggers upsert synchronization of all verified tenders from seed_tenders.json.
    Ensures complete parity across local and cloud environments.
    """
    import os, json, hashlib
    from datetime import datetime
    seed_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "seed_tenders.json")
    if not os.path.exists(seed_file):
        raise HTTPException(status_code=404, detail="seed_tenders.json not found")

    with open(seed_file, "r", encoding="utf-8") as sf:
        seed_items = json.load(sf)

    upserted_count = 0
    for s in seed_items:
        existing_t = db.query(Tender).filter(Tender.tender_id == s["tender_id"]).first()
        p_date = datetime.fromisoformat(s["published_date"]) if s.get("published_date") else None
        b_date = datetime.fromisoformat(s["bid_submission_deadline"]) if s.get("bid_submission_deadline") else None
        o_date = datetime.fromisoformat(s["bid_opening_date"]) if s.get("bid_opening_date") else None
        pre_date = datetime.fromisoformat(s["pre_bid_meeting_date"]) if s.get("pre_bid_meeting_date") else None
        clar_date = datetime.fromisoformat(s["clarification_end_date"]) if s.get("clarification_end_date") else None
        doc_start = datetime.fromisoformat(s["document_download_start_date"]) if s.get("document_download_start_date") else None
        doc_end = datetime.fromisoformat(s["document_download_end_date"]) if s.get("document_download_end_date") else None

        # Dynamically classify tender based on active keyword rules
        cls_res = classification_engine.classify(
            title=s.get("title", ""),
            work_description=s.get("work_description"),
            product_category=s.get("product_category"),
            tender_category=s.get("tender_category")
        )

        if existing_t:
            existing_t.published_date = p_date
            existing_t.bid_submission_deadline = b_date
            existing_t.bid_opening_date = o_date
            existing_t.pre_bid_meeting_date = pre_date
            existing_t.clarification_end_date = clar_date
            existing_t.document_download_start_date = doc_start
            existing_t.document_download_end_date = doc_end
            existing_t.estimated_value = s.get("estimated_value")
            existing_t.emd_amount = s.get("emd_amount")
            existing_t.tender_fee = s.get("tender_fee")
            existing_t.emd_exemption_allowed = s.get("emd_exemption_allowed")
            existing_t.is_civil_construction = cls_res.is_civil_construction
            existing_t.category_id = cls_res.category_id
            existing_t.classification_score = cls_res.score
            existing_t.matched_keywords = ", ".join(cls_res.matched_keywords) if cls_res.matched_keywords else None
            existing_t.classification_reason = cls_res.reason
            existing_t.is_joint_venture_allowed = s.get("is_joint_venture_allowed", True)
            existing_t.is_sub_contracting_allowed = s.get("is_sub_contracting_allowed", True)
            existing_t.bidding_type = s.get("bidding_type", "2-Cover (Technical + Financial BOQ)")
            existing_t.covers_count = s.get("covers_count", 2)
            existing_t.pre_bid_venue = s.get("pre_bid_venue", "Office of the Superintending Engineer / Chief Engineer (Procurement)")
        else:
            t_obj = Tender(
                tender_id=s["tender_id"],
                source_id=s.get("source_id", "central_gepnic"),
                reference_number=s.get("reference_number"),
                title=s["title"],
                work_description=s.get("work_description"),
                organization_name=s.get("organization_name"),
                department=s.get("department"),
                tender_category=s.get("tender_category"),
                product_category=s.get("product_category"),
                state=s.get("state"),
                district=s.get("district"),
                location=s.get("location"),
                portal_name=s.get("portal_name"),
                estimated_value=s.get("estimated_value"),
                currency=s.get("currency", "INR"),
                emd_amount=s.get("emd_amount"),
                tender_fee=s.get("tender_fee"),
                emd_exemption_allowed=s.get("emd_exemption_allowed"),
                published_date=p_date,
                bid_submission_deadline=b_date,
                bid_opening_date=o_date,
                pre_bid_meeting_date=pre_date,
                clarification_end_date=clar_date,
                document_download_start_date=doc_start,
                document_download_end_date=doc_end,
                is_civil_construction=cls_res.is_civil_construction,
                category_id=cls_res.category_id,
                classification_score=cls_res.score,
                matched_keywords=", ".join(cls_res.matched_keywords) if cls_res.matched_keywords else None,
                classification_reason=cls_res.reason,
                is_joint_venture_allowed=s.get("is_joint_venture_allowed", True),
                is_sub_contracting_allowed=s.get("is_sub_contracting_allowed", True),
                bidding_type=s.get("bidding_type", "2-Cover (Technical + Financial BOQ)"),
                covers_count=s.get("covers_count", 2),
                pre_bid_venue=s.get("pre_bid_venue", "Office of the Superintending Engineer / Chief Engineer (Procurement)"),
                content_hash=s.get("content_hash") or hashlib.sha256(f"{s['tender_id']}_{s.get('title', '')}".encode()).hexdigest(),
                classification_method="RULE_BASED",
                status=s.get("status", "ACTIVE"),
                original_url=s.get("original_url")
            )
            db.add(t_obj)
        upserted_count += 1
    db.commit()

    total_in_db = db.query(Tender).count()
    return {
        "status": "SUCCESS",
        "message": f"Successfully synchronized {upserted_count} verified seed tenders! Total in database: {total_in_db}",
        "total_tenders": total_in_db
    }

