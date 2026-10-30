import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.tender import Tender
from app.models.document import TenderDocument, Corrigendum
from app.models.source import Source, CollectionJob
from app.models.audit import AuditEvent
from app.services.sse_manager import sse_manager

logger = logging.getLogger("ingestion")

class IngestionService:
    """
    Handles atomic ingestion, duplicate prevention, amendment tracking,
    audit event logging, and real-time SSE broadcasting.
    """

    @staticmethod
    def ingest_tenders(db: Session, source_id: str, raw_tenders: List[Dict[str, Any]]) -> Tuple[int, int, int]:
        """
        Ingests a batch of collected tenders into the database.
        Returns: (tenders_discovered, tenders_updated, unchanged_count)
        """
        discovered = 0
        updated = 0
        unchanged = 0

        source = db.get(Source, source_id)
        last_id = None

        for item in raw_tenders:
            # Strictly filter: Only ingest tenders that matched design & consultancy keywords
            if not item.get("is_civil_construction"):
                continue

            tender_id = item["tender_id"]
            last_id = tender_id
            docs_data = item.pop("documents", [])

            # Check if tender already exists in database
            stmt = select(Tender).where(Tender.tender_id == tender_id)
            existing: Tender = db.execute(stmt).scalar_one_or_none()

            if not existing:
                # Brand New Tender
                new_tender = Tender(**item)
                db.add(new_tender)
                db.flush()  # Generate ID

                # Add associated documents
                for doc in docs_data:
                    doc_obj = TenderDocument(
                        tender_id=new_tender.id,
                        document_name=doc.get("document_name", "NIT Document"),
                        document_type=doc.get("document_type", "NIT"),
                        file_url=doc.get("file_url", ""),
                    )
                    db.add(doc_obj)

                # Record Audit Event
                audit = AuditEvent(
                    entity_type="tender",
                    entity_id=new_tender.id,
                    event_type="DISCOVERED",
                    details=json.dumps({"title": new_tender.title, "portal": new_tender.portal_name, "is_civil": new_tender.is_civil_construction})
                )
                db.add(audit)
                discovered += 1

                # Broadcast new-tender SSE notification
                sse_manager.broadcast_sync("new_tender", {
                    "id": new_tender.id,
                    "tender_id": new_tender.tender_id,
                    "title": new_tender.title,
                    "organization_name": new_tender.organization_name,
                    "estimated_value": new_tender.estimated_value,
                    "emd_amount": new_tender.emd_amount,
                    "bid_submission_deadline": new_tender.bid_submission_deadline.isoformat() if new_tender.bid_submission_deadline else None,
                    "is_civil_construction": new_tender.is_civil_construction,
                    "category_id": new_tender.category_id,
                    "state": new_tender.state,
                    "portal_name": new_tender.portal_name,
                    "status": new_tender.status,
                    "published_date": new_tender.published_date.isoformat() if new_tender.published_date else None
                })

            else:
                # Tender Already Exists -> Check for Changes via Content Hash
                new_hash = item.get("content_hash")
                if new_hash and new_hash != existing.content_hash:
                    # Content has changed (Corrigendum / Extension)
                    prev_deadline = existing.bid_submission_deadline
                    new_deadline = item.get("bid_submission_deadline")

                    # Update changed fields (excluding status if amended)
                    is_amended = False
                    if new_deadline and prev_deadline and new_deadline != prev_deadline:
                        corrigendum = Corrigendum(
                            tender_id=existing.id,
                            corrigendum_title="Bid Submission Deadline Extension",
                            corrigendum_type="DEADLINE_EXTENSION",
                            previous_deadline=prev_deadline,
                            new_deadline=new_deadline,
                            details=f"Deadline changed from {prev_deadline} to {new_deadline}",
                            content_hash=new_hash
                        )
                        db.add(corrigendum)
                        is_amended = True

                    for k, v in item.items():
                        if k == "status" and is_amended:
                            continue
                        # PERMANENT SYNC RULE: Published date is immutable once established
                        if k == "published_date" and existing.published_date is not None:
                            continue
                        # PERMANENT SYNC RULE: Corrigendum is monotonic (once YES, stays YES)
                        if k == "has_corrigendum":
                            existing.has_corrigendum = bool(existing.has_corrigendum or v)
                            continue
                        if hasattr(existing, k) and v is not None:
                            setattr(existing, k, v)

                    if is_amended:
                        existing.status = "AMENDED"
                        existing.has_corrigendum = True
                    existing.last_verified_at = datetime.utcnow()

                    audit = AuditEvent(
                        entity_type="tender",
                        entity_id=existing.id,
                        event_type="UPDATED",
                        details=json.dumps({"reason": "Content hash change detected"})
                    )
                    db.add(audit)
                    updated += 1

                    # Broadcast tender_updated SSE notification
                    sse_manager.broadcast_sync("tender_updated", {
                        "id": existing.id,
                        "tender_id": existing.tender_id,
                        "title": existing.title,
                        "bid_submission_deadline": existing.bid_submission_deadline.isoformat() if existing.bid_submission_deadline else None,
                        "status": existing.status,
                        "last_verified_at": existing.last_verified_at.isoformat()
                    })
                else:
                    # Unchanged -> Simply update last_verified timestamp
                    if item.get("has_corrigendum"):
                        existing.has_corrigendum = True
                    existing.last_verified_at = datetime.now(timezone.utc)
                    unchanged += 1

        # Update Source Health
        if source:
            source.last_successful_check = datetime.now(timezone.utc)
            source.health_status = "HEALTHY"
            source.consecutive_failures = 0
            if last_id:
                source.last_discovered_identifier = last_id

        db.commit()
        logger.info(f"[{source_id}] Ingestion complete: {discovered} new, {updated} updated, {unchanged} verified unchanged.")
        return discovered, updated, unchanged
