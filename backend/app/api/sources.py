from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.source import Source, CollectionJob
from app.schemas.source import SourceRead, SourceUpdate, CollectionJobRead
from app.services.scheduler import scheduler

router = APIRouter(prefix="/sources", tags=["sources"])

@router.get("", response_model=List[SourceRead])
def list_sources(db: Session = Depends(get_db)):
    """Lists all configured procurement portal sources and their health status."""
    return db.scalars(select(Source).order_by(Source.id)).all()

@router.patch("/{source_id}", response_model=SourceRead)
def update_source(source_id: str, payload: SourceUpdate, db: Session = Depends(get_db)):
    """Updates polling interval or enabled state for a source."""
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    if payload.is_enabled is not None:
        source.is_enabled = payload.is_enabled
    if payload.poll_interval_minutes is not None:
        source.poll_interval_minutes = max(3, payload.poll_interval_minutes)

    db.commit()
    db.refresh(source)
    return source

@router.post("/sync-now")
async def sync_all_sources(background_tasks: BackgroundTasks, limit: int = 15):
    """
    Triggers an immediate live portal collection run across both Central CPPP and Rajasthan eProc.
    """
    async def _run_all():
        for s_id in ["central_cppp", "rajasthan_eproc"]:
            try:
                await scheduler.run_collection_for_source(s_id, limit=limit)
            except Exception:
                pass

    background_tasks.add_task(_run_all)
    return {
        "status": "SYNC_TRIGGERED",
        "message": "Live portal discovery initiated for Central CPPP and Rajasthan eProc"
    }

@router.post("/{source_id}/trigger")
async def trigger_collection(source_id: str, limit: int = 15):
    """Manually triggers an immediate background collection run for a source."""
    result = await scheduler.run_collection_for_source(source_id, limit=limit)
    return result

@router.get("/{source_id}/jobs", response_model=List[CollectionJobRead])
def get_source_jobs(source_id: str, limit: int = 15, db: Session = Depends(get_db)):
    """Fetches collection job run history for a source."""
    stmt = (
        select(CollectionJob)
        .where(CollectionJob.source_id == source_id)
        .order_by(desc(CollectionJob.started_at))
        .limit(limit)
    )
    return db.scalars(stmt).all()
