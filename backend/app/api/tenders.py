from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, desc, asc

from app.db.session import get_db
from app.models.tender import Tender
from app.models.audit import SavedTender
from app.schemas.tender import TenderListItem, TenderDetail, TenderListResponse

router = APIRouter(prefix="/tenders", tags=["tenders"])

@router.get("", response_model=TenderListResponse)
def list_tenders(
    limit: int = Query(10, ge=1, le=100, description="Display limit (default 10 per page)"),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Keyword search in title, reference number, or organization"),
    is_civil_only: bool = Query(True, description="Strictly keyword-matched design & consultancy tenders only"),
    category_id: Optional[str] = Query(None, description="Filter by matched category ID"),
    state: Optional[str] = Query(None),
    source_id: Optional[str] = Query(None),
    min_value: Optional[float] = Query(None, ge=0),
    max_value: Optional[float] = Query(None, ge=0),
    closing_soon: bool = Query(False, description="Filter tenders closing within 7 days"),
    listed_today: bool = Query(False, description="Filter tenders published today"),
    under_15_days: bool = Query(False, description="Filter tenders published within last 15 days"),
    has_pre_bid: bool = Query(False, description="Filter tenders with upcoming pre-bid meeting"),
    jv_allowed: bool = Query(False, description="Filter tenders where Joint Venture / Consortium is allowed"),
    sort_by: str = Query("published_date", pattern="^(published_date|bid_submission_deadline|estimated_value|created_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """
    Returns only keyword-matched Design & Consultancy tenders in strict chronological order.
    """
    # Base filter criteria: ALWAYS strictly enforce keyword-matched tenders only
    conditions = [Tender.is_civil_construction == True]

    if category_id:
        conditions.append(Tender.category_id == category_id)

    if state:
        conditions.append(Tender.state.ilike(f"%{state}%"))

    if source_id:
        conditions.append(Tender.source_id == source_id)

    if min_value is not None:
        conditions.append(Tender.estimated_value >= min_value)

    if max_value is not None:
        conditions.append(Tender.estimated_value <= max_value)

    if jv_allowed:
        conditions.append(Tender.is_joint_venture_allowed == True)

    now = datetime.utcnow()
    # IST date threshold for "Listed Today"
    now_ist = now + timedelta(hours=5, minutes=30)
    today_ist_start = datetime.combine(now_ist.date(), datetime.min.time())

    if closing_soon:
        seven_days = now + timedelta(days=7)
        conditions.append(Tender.bid_submission_deadline >= now)
        conditions.append(Tender.bid_submission_deadline <= seven_days)

    if has_pre_bid:
        conditions.append(Tender.pre_bid_meeting_date >= now)

    if listed_today:
        conditions.append(Tender.published_date >= today_ist_start)

    if under_15_days:
        conditions.append(Tender.published_date >= (now - timedelta(days=15)))

    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Tender.title.ilike(term),
                Tender.reference_number.ilike(term),
                Tender.organization_name.ilike(term),
                Tender.work_description.ilike(term),
                Tender.location.ilike(term),
                Tender.tender_id.ilike(term)
            )
        )

    # Compute high-level dashboard metrics (all strictly keyword-matched design tenders)
    total_count = db.scalar(select(func.count(Tender.id)).where(Tender.is_civil_construction == True)) or 0
    civil_count = total_count

    closing_soon_count = db.scalar(
        select(func.count(Tender.id)).where(
            Tender.is_civil_construction == True,
            Tender.bid_submission_deadline >= now,
            Tender.bid_submission_deadline <= now + timedelta(days=7)
        )
    ) or 0

    today_count = db.scalar(
        select(func.count(Tender.id)).where(
            Tender.is_civil_construction == True,
            Tender.published_date >= today_ist_start
        )
    ) or 0

    under_15_days_count = db.scalar(
        select(func.count(Tender.id)).where(
            Tender.is_civil_construction == True,
            Tender.published_date >= (now - timedelta(days=15))
        )
    ) or 0

    # Query matching count
    query_count = select(func.count(Tender.id))
    if conditions:
        query_count = query_count.where(*conditions)
    raw_matching_count = db.scalar(query_count) or 0
    # User requested maximum 100 tenders total
    matching_count = min(100, raw_matching_count)

    # Main data query
    query = select(Tender)
    if conditions:
        query = query.where(*conditions)

    # Strict chronological sorting (e.g. 6:30 PM before 6:00 PM)
    sort_column = getattr(Tender, sort_by)
    if order == "desc":
        query = query.order_by(sort_column.desc().nullslast(), Tender.id.desc())
    else:
        query = query.order_by(sort_column.asc().nullsfirst(), Tender.id.asc())

    # Limit and offset pagination (capped at 100 total)
    effective_limit = min(limit, max(0, 100 - offset))
    query = query.offset(offset).limit(effective_limit)
    items = db.scalars(query).all()

    return TenderListResponse(
        total_count=total_count,
        matching_count=matching_count,
        civil_count=civil_count,
        closing_soon_count=closing_soon_count,
        today_count=today_count,
        under_15_days_count=under_15_days_count,
        limit=limit,
        offset=offset,
        items=items
    )


@router.get("/{id_or_tender_id}", response_model=TenderDetail)
def get_tender_detail(id_or_tender_id: str, db: Session = Depends(get_db)):
    """Fetches complete tender detail with documents and corrigenda."""
    stmt = select(Tender).where(
        or_(Tender.id == id_or_tender_id, Tender.tender_id == id_or_tender_id)
    )
    tender = db.scalar(stmt)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender

@router.post("/{id}/save")
def toggle_save_tender(id: str, notes: Optional[str] = None, db: Session = Depends(get_db)):
    """Saves or unsaves a tender for quick access."""
    tender = db.get(Tender, id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    saved = db.scalar(select(SavedTender).where(SavedTender.tender_id == id))
    if saved:
        db.delete(saved)
        db.commit()
        return {"status": "UNSAVED", "tender_id": id}
    else:
        new_save = SavedTender(tender_id=id, notes=notes)
        db.add(new_save)
        db.commit()
        return {"status": "SAVED", "tender_id": id}


from pydantic import BaseModel
import hashlib
from app.services.classification.engine import classification_engine

class ImportTenderItem(BaseModel):
    tender_id: str
    title: str
    reference_number: Optional[str] = None
    work_description: Optional[str] = None
    organization_name: Optional[str] = "Indian Railways"
    department: Optional[str] = None
    state: Optional[str] = "Central / All India"
    location: Optional[str] = None
    district: Optional[str] = None
    estimated_value: Optional[float] = None
    emd_amount: Optional[float] = None
    tender_fee: Optional[float] = None
    published_date: Optional[str] = None
    bid_submission_deadline: Optional[str] = None
    bid_opening_date: Optional[str] = None
    portal_name: Optional[str] = "Indian Railways E-Procurement System (IREPS)"
    original_url: Optional[str] = "https://www.ireps.gov.in/"
    source_id: Optional[str] = "ireps"

class ImportTendersPayload(BaseModel):
    tenders: list[ImportTenderItem]

@router.post("/import")
def import_external_tenders(payload: ImportTendersPayload, db: Session = Depends(get_db)):
    """
    Accepts external tenders (e.g. from IREPS 1-Click Sync), applies strict 25-keyword rule,
    and saves matching civil design/consultancy tenders to database.
    """
    received_count = len(payload.tenders)
    accepted_civil_count = 0
    updated_count = 0

    for item in payload.tenders:
        t_id = (item.tender_id or "").strip()
        t_title = (item.title or "").strip()
        if not t_id or not t_title:
            continue

        # Classify strictly against active 25 keywords
        cls_res = classification_engine.classify(
            title=t_title,
            work_description=item.work_description,
            product_category=None,
            tender_category=None
        )

        # Parse date strings safely
        def parse_dt(d_str: Optional[str]):
            if not d_str:
                return None
            try:
                return datetime.fromisoformat(d_str.replace("Z", "+00:00"))
            except Exception:
                pass
            for fmt in ["%d-%m-%Y %H:%M", "%d/%m/%Y %H:%M", "%d-%b-%Y %I:%M %p", "%d-%b-%Y %H:%M", "%Y-%m-%d %H:%M:%S"]:
                try:
                    return datetime.strptime(d_str.strip(), fmt)
                except Exception:
                    continue
            return None

        p_date = parse_dt(item.published_date) or datetime.utcnow()
        b_date = parse_dt(item.bid_submission_deadline)
        o_date = parse_dt(item.bid_opening_date)

        existing = db.scalar(select(Tender).where(Tender.tender_id == t_id))
        if existing:
            existing.title = t_title
            if item.reference_number:
                existing.reference_number = item.reference_number
            if item.work_description:
                existing.work_description = item.work_description
            if item.organization_name:
                existing.organization_name = item.organization_name
            if item.department:
                existing.department = item.department
            if item.estimated_value:
                existing.estimated_value = item.estimated_value
            if item.emd_amount:
                existing.emd_amount = item.emd_amount
            if b_date:
                existing.bid_submission_deadline = b_date
            if o_date:
                existing.bid_opening_date = o_date
            existing.is_civil_construction = cls_res.is_civil_construction
            existing.category_id = cls_res.category_id
            existing.classification_score = cls_res.score
            existing.matched_keywords = ", ".join(cls_res.matched_keywords) if cls_res.matched_keywords else None
            existing.classification_reason = cls_res.reason
            existing.last_verified_at = datetime.utcnow()
            updated_count += 1
        else:
            new_tender = Tender(
                tender_id=t_id,
                reference_number=item.reference_number,
                title=t_title,
                work_description=item.work_description or f"{t_title}. Published on IREPS.",
                organization_name=item.organization_name or "Indian Railways",
                department=item.department,
                state=item.state or "Central / All India",
                location=item.location or "Central / All India",
                district=item.district,
                source_id="ireps",
                original_url=item.original_url or "https://www.ireps.gov.in/",
                portal_name=item.portal_name or "Indian Railways E-Procurement System (IREPS)",
                published_date=p_date,
                bid_submission_deadline=b_date,
                bid_opening_date=o_date,
                estimated_value=item.estimated_value,
                emd_amount=item.emd_amount,
                tender_fee=item.tender_fee,
                is_civil_construction=cls_res.is_civil_construction,
                category_id=cls_res.category_id,
                classification_score=cls_res.score,
                matched_keywords=", ".join(cls_res.matched_keywords) if cls_res.matched_keywords else None,
                classification_reason=cls_res.reason,
                classification_method="IREPS_1CLICK_SYNC",
                status="ACTIVE",
                is_joint_venture_allowed=True,
                is_sub_contracting_allowed=True,
                bidding_type="2-Cover (Technical + Financial BOQ)",
                covers_count=2,
                content_hash=hashlib.sha256(f"{t_id}_{t_title}".encode()).hexdigest(),
                last_verified_at=datetime.utcnow()
            )
            db.add(new_tender)

        if cls_res.is_civil_construction:
            accepted_civil_count += 1

    db.commit()

    return {
        "status": "SUCCESS",
        "received_count": received_count,
        "accepted_civil_count": accepted_civil_count,
        "updated_count": updated_count,
        "message": f"Processed {received_count} IREPS tenders: {accepted_civil_count} matched your 25 keywords and are live on your dashboard!"
    }
