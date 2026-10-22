import asyncio
import logging
from datetime import datetime
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.source import Source, CollectionJob
from app.services.collectors.rajasthan import RajasthanConnector
from app.services.collectors.central import CentralPortalConnector
from app.services.ingestion import IngestionService
from app.services.sse_manager import sse_manager

logger = logging.getLogger("scheduler")

class BackgroundScheduler:
    """
    Persistent background collection orchestrator.
    Prevents overlapping runs per source, respects intervals,
    records job execution history, and publishes live status updates.
    """

    def __init__(self):
        self._running = False
        self._tasks: Dict[str, asyncio.Task] = {}
        self._source_locks: Dict[str, asyncio.Lock] = {}
        self._connectors = {
            "rajasthan_eproc": RajasthanConnector(),
            "central_cppp": CentralPortalConnector(),
        }

    def _get_lock(self, source_id: str) -> asyncio.Lock:
        if source_id not in self._source_locks:
            self._source_locks[source_id] = asyncio.Lock()
        return self._source_locks[source_id]

    async def initialize_default_sources(self):
        """Seeds default categories and portals in the database if not present."""
        with SessionLocal() as db:
            from app.models.tender import Category
            
            categories_to_seed = [
                {"id": "civil_construction", "name": "Civil Construction & Works", "description": "Building construction, general civil works, restoration"},
                {"id": "roads_highways", "name": "Roads & Highways", "description": "Highways, expressways, asphalt roads, pavement, culverts"},
                {"id": "bridges_flyovers", "name": "Bridges & Flyovers", "description": "Bridges, flyovers, overbridges, underpasses, viaducts"},
                {"id": "water_supply_drainage", "name": "Water Supply & Drainage", "description": "Water supply schemes, pipelines, sewerage, drainage networks"},
                {"id": "structural_engineering", "name": "Structural Engineering & Design", "description": "Structural analysis, RCC/steel design, retrofitting, audits"},
                {"id": "consultancy_pmc_dpr", "name": "PMC, DPR & Engineering Consultancy", "description": "Detailed project reports, project management consultancy, inspections"}
            ]
            for cat_data in categories_to_seed:
                if not db.get(Category, cat_data["id"]):
                    db.add(Category(**cat_data))

            sources_to_seed = [
                {
                    "id": "rajasthan_eproc",
                    "name": "Rajasthan eProcurement Portal",
                    "base_url": "https://eproc.rajasthan.gov.in/nicgep/app",
                    "listing_url": "https://eproc.rajasthan.gov.in/nicgep/app",
                    "connector_type": "rajasthan_gepnic",
                    "is_enabled": True,
                    "poll_interval_minutes": 10,
                    "health_status": "READY"
                },
                {
                    "id": "central_cppp",
                    "name": "Central Public Procurement Portal (CPPP)",
                    "base_url": "https://eprocure.gov.in/eprocure/app",
                    "listing_url": "https://eprocure.gov.in/eprocure/app",
                    "connector_type": "central_gepnic",
                    "is_enabled": True,
                    "poll_interval_minutes": 10,
                    "health_status": "READY"
                }
            ]
            for s_data in sources_to_seed:
                existing = db.get(Source, s_data["id"])
                if not existing:
                    new_src = Source(**s_data)
                    db.add(new_src)
            db.commit()

    async def run_collection_for_source(self, source_id: str, limit: int = 15) -> Dict[str, Any]:
        """
        Executes an isolated collection job for a specific source.
        Ensures non-overlapping execution using per-source asyncio locks.
        """
        lock = self._get_lock(source_id)
        if lock.locked():
            logger.warning(f"[{source_id}] Collection is already in progress. Skipping overlapping run.")
            return {"status": "SKIPPED_OVERLAPPING", "source_id": source_id}

        async with lock:
            connector = self._connectors.get(source_id)
            if not connector:
                return {"status": "ERROR", "message": f"No connector registered for source '{source_id}'"}

            # Notify dashboard that collection started
            sse_manager.broadcast_sync("collector_status", {
                "source_id": source_id,
                "status": "RUNNING",
                "timestamp": datetime.utcnow().isoformat()
            })

            # Create CollectionJob record
            job_id = None
            with SessionLocal() as db:
                job = CollectionJob(source_id=source_id, status="RUNNING")
                db.add(job)
                db.commit()
                job_id = job.id

            start_time = datetime.utcnow()
            try:
                # Run the synchronous collector in a thread pool so it does not block the asyncio event loop
                loop = asyncio.get_running_loop()
                raw_tenders = await loop.run_in_executor(None, connector.collect, limit)

                # Ingest into database
                with SessionLocal() as db:
                    discovered, updated, unchanged = IngestionService.ingest_tenders(db, source_id, raw_tenders)
                    
                    # Update job record
                    job = db.get(CollectionJob, job_id)
                    if job:
                        job.finished_at = datetime.utcnow()
                        job.status = "SUCCESS"
                        job.tenders_discovered = discovered
                        job.tenders_updated = updated
                        job.log_summary = f"Discovered: {discovered}, Updated: {updated}, Unchanged: {unchanged}"
                        db.commit()

                sse_manager.broadcast_sync("collector_status", {
                    "source_id": source_id,
                    "status": "HEALTHY",
                    "tenders_discovered": discovered,
                    "tenders_updated": updated,
                    "timestamp": datetime.utcnow().isoformat()
                })

                return {
                    "status": "SUCCESS",
                    "source_id": source_id,
                    "discovered": discovered,
                    "updated": updated,
                    "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
                }

            except Exception as e:
                logger.error(f"[{source_id}] Collection failed: {e}", exc_info=True)
                with SessionLocal() as db:
                    job = db.get(CollectionJob, job_id)
                    if job:
                        job.finished_at = datetime.utcnow()
                        job.status = "FAILED"
                        job.errors_count = 1
                        job.log_summary = str(e)
                    
                    source = db.get(Source, source_id)
                    if source:
                        source.last_error_time = datetime.utcnow()
                        source.last_error_message = str(e)
                        source.consecutive_failures += 1
                        source.health_status = "ERROR" if source.consecutive_failures >= 3 else "WARNING"
                    db.commit()

                sse_manager.broadcast_sync("collector_status", {
                    "source_id": source_id,
                    "status": "ERROR",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })

                return {"status": "FAILED", "source_id": source_id, "error": str(e)}

    async def _source_loop(self, source_id: str):
        """Continuous background polling loop for a specific source."""
        while self._running:
            try:
                with SessionLocal() as db:
                    source = db.get(Source, source_id)
                    if not source or not source.is_enabled:
                        await asyncio.sleep(30)
                        continue
                    interval_secs = max(180, source.poll_interval_minutes * 60)

                await self.run_collection_for_source(source_id)
                await asyncio.sleep(interval_secs)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background loop for {source_id}: {e}")
                await asyncio.sleep(60)

    async def start(self):
        """Starts the background collection service."""
        if self._running:
            return
        self._running = True
        await self.initialize_default_sources()

        for source_id in self._connectors.keys():
            self._tasks[source_id] = asyncio.create_task(self._source_loop(source_id))
        logger.info(f"Background collection scheduler started for {len(self._tasks)} sources.")

    async def stop(self):
        """Gracefully stops all background collection tasks."""
        self._running = False
        for s_id, task in self._tasks.items():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)
        self._tasks.clear()
        logger.info("Background collection scheduler stopped.")

scheduler = BackgroundScheduler()
