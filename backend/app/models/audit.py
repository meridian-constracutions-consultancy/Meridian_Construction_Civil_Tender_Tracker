import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class SavedTender(Base):
    __tablename__ = "saved_tenders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tender_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
