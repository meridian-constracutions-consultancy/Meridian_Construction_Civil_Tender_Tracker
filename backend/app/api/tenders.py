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

    now = datetime.utcnow()
    # IST date threshold for "Listed Today"
    now_ist = now + timedelta(hours=5, minutes=30)
    today_ist_start = datetime.combine(now_ist.date(), datetime.min.time())

    if closing_soon:
        seven_days = now + timedelta(days=7)
        conditions.append(Tender.bid_submission_deadline >= now)
        conditions.append(Tender.bid_submission_deadline <= seven_days)

    if listed_today:
        conditions.append(Tender.published_date >= today_ist_start)

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
