import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, Integer, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class Source(Base, TimestampMixin):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    base_url: Mapped[str] = mapped_column(String(512), nullable=False)
    listing_url: Mapped[str] = mapped_column(String(512), nullable=False)
    connector_type: Mapped[str] = mapped_column(String(64), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    poll_interval_minutes: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    
    last_successful_check: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_discovered_identifier: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    health_status: Mapped[str] = mapped_column(String(32), default="UNKNOWN", nullable=False)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    jobs: Mapped[List["CollectionJob"]] = relationship("CollectionJob", back_populates="source", cascade="all, delete-orphan")
    tenders: Mapped[List["Tender"]] = relationship("Tender", back_populates="source")

class CollectionJob(Base):
    __tablename__ = "collection_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="RUNNING", nullable=False)
    tenders_discovered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tenders_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    errors_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    log_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="jobs")
