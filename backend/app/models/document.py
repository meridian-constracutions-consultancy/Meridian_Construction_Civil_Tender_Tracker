import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class TenderDocument(Base):
    __tablename__ = "tender_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tender_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    document_name: Mapped[str] = mapped_column(String(256), nullable=False)
    document_type: Mapped[str] = mapped_column(String(64), default="TENDER_NOTICE", nullable=False)
    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    local_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    extraction_status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    tender: Mapped["Tender"] = relationship("Tender", back_populates="documents")

class Corrigendum(Base):
    __tablename__ = "corrigenda"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tender_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    corrigendum_title: Mapped[str] = mapped_column(String(256), nullable=False)
    corrigendum_type: Mapped[str] = mapped_column(String(64), default="EXTENSION", nullable=False)
    publication_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    previous_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    new_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    tender: Mapped["Tender"] = relationship("Tender", back_populates="corrigenda")
