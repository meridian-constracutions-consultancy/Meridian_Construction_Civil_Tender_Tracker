import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, desc, asc, delete

from app.db.session import get_db
from app.models.tender import Tender
from app.models.audit import SavedTender
from app.schemas.tender import TenderListItem, TenderDetail, TenderListResponse

router = APIRouter(prefix="/tenders", tags=["tenders"])

@router.get("", response_model=TenderListResponse)
def list_tenders(
    view: str = Query("main", pattern="^(main|special|declined)$", description="View mode: main, special, or declined"),
    limit: int = Query(50, ge=1, le=100, description="Display limit (default 50 per page)"),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Keyword search in title, reference number, or organization"),
    is_civil_only: bool = Query(True, description="Strictly keyword-matched design & consultancy tenders only"),
    category_id: Optional[str] = Query(None, description="Filter by matched category ID"),
    state: Optional[str] = Query(None),
    location: Optional[str] = Query(None, description="Filter by city, district, or project location (e.g. Jaipur, Delhi, Sawai Madhopur)"),
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
    Returns Design & Consultancy tenders segregated into Main, Special, and Declined views.
    Automatically purges expired tenders from main and declined lists while permanently preserving Special Tenders.
    """
    now = datetime.utcnow()

    # 1. AUTODELETE EXPIRED TENDERS:
    # Purge tenders whose bid submission deadline has elapsed, UNLESS marked as special
    try:
        db.execute(
            delete(Tender).where(
                Tender.is_special == False,
                Tender.bid_submission_deadline.is_not(None),
                Tender.bid_submission_deadline < now
            )
        )
        db.commit()
    except Exception as e:
        db.rollback()

    # 2. Base filter criteria: ALWAYS strictly enforce keyword-matched tenders only
    conditions = [Tender.is_civil_construction == True]

    # View separation
    if view == "special":
        conditions.append(Tender.is_special == True)
    elif view == "declined":
        conditions.append(Tender.status == "DECLINED")
        conditions.append(Tender.is_special == False)
    else:  # "main" view
        conditions.append(Tender.is_special == False)
        conditions.append(Tender.status != "DECLINED")

    if category_id:
        conditions.append(Tender.category_id == category_id)

    if state:
        conditions.append(Tender.state.ilike(f"%{state}%"))

    if location and location.strip():
        loc_str = location.strip()
        loc_term = "%sawai%" if "sawai" in loc_str.lower() else f"%{loc_str}%"
        conditions.append(
            or_(
                Tender.location.ilike(loc_term),
                Tender.district.ilike(loc_term),
                Tender.state.ilike(loc_term),
                Tender.title.ilike(loc_term),
                Tender.work_description.ilike(loc_term)
            )
        )

    if source_id:
        conditions.append(Tender.source_id == source_id)

    if min_value is not None:
        conditions.append(Tender.estimated_value >= min_value)

    if max_value is not None:
        conditions.append(Tender.estimated_value <= max_value)

    if jv_allowed:
        conditions.append(Tender.is_joint_venture_allowed == True)

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

    # Compute high-level dashboard metrics
    total_count = db.scalar(select(func.count(Tender.id)).where(Tender.is_civil_construction == True)) or 0
    civil_count = total_count

    main_count = db.scalar(
        select(func.count(Tender.id)).where(
            Tender.is_civil_construction == True,
            Tender.is_special == False,
            Tender.status != "DECLINED"
        )
    ) or 0

    special_count = db.scalar(
        select(func.count(Tender.id)).where(
            Tender.is_special == True
        )
    ) or 0

    declined_count = db.scalar(
        select(func.count(Tender.id)).where(
            Tender.status == "DECLINED",
            Tender.is_special == False
        )
    ) or 0

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

    # Query matching count for current view
    query_count = select(func.count(Tender.id))
    if conditions:
        query_count = query_count.where(*conditions)
    raw_matching_count = db.scalar(query_count) or 0
    matching_count = min(100, raw_matching_count)

    # Main data query
    query = select(Tender)
    if conditions:
        query = query.where(*conditions)

    sort_column = getattr(Tender, sort_by)
    if order == "desc":
        query = query.order_by(sort_column.desc().nullslast(), Tender.id.desc())
    else:
        query = query.order_by(sort_column.asc().nullsfirst(), Tender.id.asc())

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
        main_count=main_count,
        special_count=special_count,
        declined_count=declined_count,
        limit=limit,
        offset=offset,
        items=items
    )


@router.get("/locations")
def list_tender_locations(db: Session = Depends(get_db)):
    """
    Returns prominent cities/locations with matching civil design & consultancy tenders.
    """
    curated_cities = [
        "Jaipur", "Delhi", "Sawai Madhopur", "Jodhpur", "Kota", "Ajmer", "Udaipur",
        "Manipur", "Imphal", "Bhilwara", "Bhiwadi", "Bundi", "Dausa", "Dungarpur", "Sumerpur", "Hindaun",
        "Chaksu", "Dehradun", "Patna", "Pune", "Bangalore", "Bhubaneswar", "Chandigarh",
        "Gandhinagar", "Guwahati", "Kolkata", "Lucknow", "Mumbai"
    ]
    results = []
    for city in curated_cities:
        term = "%sawai%" if "sawai" in city.lower() else f"%{city}%"
        cnt = db.scalar(
            select(func.count(Tender.id))
            .where(Tender.is_civil_construction == True)
            .where(
                or_(
                    Tender.location.ilike(term),
                    Tender.district.ilike(term),
                    Tender.state.ilike(term),
                    Tender.title.ilike(term),
                    Tender.work_description.ilike(term)
                )
            )
        ) or 0
        if cnt > 0:
            results.append({"name": city, "count": cnt})

    priority = ["Jaipur", "Delhi", "Sawai Madhopur", "Jodhpur", "Kota", "Ajmer", "Udaipur"]
    results.sort(key=lambda x: (0 if x["name"] in priority else 1, priority.index(x["name"]) if x["name"] in priority else -x["count"]))
    return {"locations": results}


@router.post("/{id}/special")
def toggle_special_tender(id: str, db: Session = Depends(get_db)):
    """
    Marks or unmarks a tender as Special / Important.
    Special tenders are strictly preserved forever and never auto-deleted.
    """
    tender = db.get(Tender, id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    tender.is_special = not tender.is_special
    # If transitioning to special, restore active status if previously declined
    if tender.is_special and tender.status == "DECLINED":
        tender.status = "ACTIVE"

    db.commit()
    db.refresh(tender)
    return {"id": tender.id, "is_special": tender.is_special, "status": tender.status}


@router.post("/{id}/decline")
def decline_tender(id: str, db: Session = Depends(get_db)):
    """
    Moves a tender to the Declined / Closed list.
    Declined tenders auto-delete when their closing date expires.
    """
    tender = db.get(Tender, id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    tender.status = "DECLINED"
    tender.is_special = False
    db.commit()
    db.refresh(tender)
    return {"id": tender.id, "status": "DECLINED", "is_special": False}


@router.post("/{id}/restore")
def restore_tender(id: str, db: Session = Depends(get_db)):
    """
    Restores a declined or closed tender back into the Main active list.
    """
    tender = db.get(Tender, id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    tender.status = "ACTIVE"
    tender.is_special = False
    db.commit()
    db.refresh(tender)
    return {"id": tender.id, "status": "ACTIVE", "is_special": False}


@router.delete("/{id}/permanent")
def delete_tender_permanent(id: str, db: Session = Depends(get_db)):
    """
    Permanently erases a tender from the database.
    """
    tender = db.get(Tender, id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    db.delete(tender)
    db.commit()
    return {"id": id, "deleted": True}


@router.post("/{id}/document")
async def upload_special_tender_document(id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads and permanently attaches the official tender document (PDF/ZIP) for this tender.
    Subsequent clicks on Document button download this file instantly.
    """
    tender = db.get(Tender, id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    docs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "downloads", "special_docs")
    os.makedirs(docs_dir, exist_ok=True)

    safe_name = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
    clean_filename = f"{tender.tender_id}_{safe_name}".replace("/", "_").replace("\\", "_")
    dest_path = os.path.join(docs_dir, clean_filename)

    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    tender.saved_document_path = dest_path
    tender.saved_document_name = file.filename
    db.commit()
    db.refresh(tender)

    return {
        "status": "UPLOADED",
        "saved_document_name": file.filename,
        "tender_id": tender.id
    }


@router.get("/{id}/document")
def download_special_tender_document(id: str, db: Session = Depends(get_db)):
    """
    Downloads the permanently saved tender document if present, or returns 404 with portal link.
    """
    tender = db.get(Tender, id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    if tender.saved_document_path and os.path.exists(tender.saved_document_path):
        return FileResponse(
            tender.saved_document_path,
            filename=tender.saved_document_name or f"{tender.tender_id}.pdf"
        )
    raise HTTPException(
        status_code=404,
        detail={"message": "Document not saved locally yet", "original_url": tender.original_url}
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
