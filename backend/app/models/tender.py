import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, Float, Integer, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    tenders: Mapped[List["Tender"]] = relationship("Tender", back_populates="category")
    subcategories: Mapped[List["Category"]] = relationship("Category", backref="parent", remote_side=[id])

class Tender(Base, TimestampMixin):
    __tablename__ = "tenders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tender_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    work_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Authority & Location
    organization_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, index=True)
    department: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    procuring_authority: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    district: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    location: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    
    # Source & Links
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("sources.id"), nullable=False, index=True)
    original_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    portal_name: Mapped[str] = mapped_column(String(64), nullable=False)
    
    # Key Dates
    published_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    document_download_start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    document_download_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    clarification_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pre_bid_meeting_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    pre_bid_venue: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    bid_submission_start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    bid_submission_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    bid_opening_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Financial Terms
    estimated_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    tender_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    processing_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    emd_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)
    emd_exemption_allowed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    contract_duration_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Category, Classification & Bidding Eligibility
    tender_category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # Works, Goods, Services
    product_category: Mapped[Optional[str]] = mapped_column(String(128), nullable=True) # Civil Works, etc.
    contract_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tenderer_class: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    bidding_type: Mapped[Optional[str]] = mapped_column(String(64), default="2-Cover (Technical + Financial BOQ)", nullable=True)
    covers_count: Mapped[Optional[int]] = mapped_column(Integer, default=2, nullable=True)
    is_joint_venture_allowed: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
    is_sub_contracting_allowed: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
    
    category_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    is_civil_construction: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    classification_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    matched_keywords: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    classification_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    classification_method: Mapped[str] = mapped_column(String(32), default="RULE_BASED", nullable=False)
    
    # Integrity & Status
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", nullable=False, index=True) # ACTIVE, AMENDED, CLOSED, CANCELLED, DECLINED
    is_special: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    saved_document_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    saved_document_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    contact_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    source: Mapped["Source"] = relationship("Source", back_populates="tenders")
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="tenders")
    documents: Mapped[List["TenderDocument"]] = relationship("TenderDocument", back_populates="tender", cascade="all, delete-orphan")
    corrigenda: Mapped[List["Corrigendum"]] = relationship("Corrigendum", back_populates="tender", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_tenders_pub_date_civil", "published_date", "is_civil_construction"),
        Index("idx_tenders_deadline_status", "bid_submission_deadline", "status"),
        Index("idx_tenders_value_state", "estimated_value", "state"),
    )
