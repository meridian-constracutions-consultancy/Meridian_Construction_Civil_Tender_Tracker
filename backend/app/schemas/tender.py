from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class TenderDocumentRead(BaseModel):
    id: str
    document_name: str
    document_type: str
    file_url: str
    file_size_bytes: Optional[int] = None
    extraction_status: str

    model_config = ConfigDict(from_attributes=True)

class CorrigendumRead(BaseModel):
    id: str
    corrigendum_title: str
    corrigendum_type: str
    publication_date: Optional[datetime] = None
    previous_deadline: Optional[datetime] = None
    new_deadline: Optional[datetime] = None
    details: Optional[str] = None
    discovered_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TenderListItem(BaseModel):
    id: str
    tender_id: str
    reference_number: Optional[str] = None
    title: str
    organization_name: Optional[str] = None
    department: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None
    portal_name: str
    source_id: str
    original_url: str
    
    # Financials
    estimated_value: Optional[float] = None
    currency: str = "INR"
    tender_fee: Optional[float] = None
    emd_amount: Optional[float] = None
    emd_exemption_allowed: Optional[bool] = None
    
    # Dates
    published_date: Optional[datetime] = None
    bid_submission_start_date: Optional[datetime] = None
    bid_submission_deadline: Optional[datetime] = None
    bid_opening_date: Optional[datetime] = None
    last_verified_at: datetime
    
    # Classification
    tender_category: Optional[str] = None
    product_category: Optional[str] = None
    category_id: Optional[str] = None
    is_civil_construction: bool
    classification_score: float
    matched_keywords: Optional[str] = None
    
    # Status
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TenderDetail(TenderListItem):
    work_description: Optional[str] = None
    pincode: Optional[str] = None
    contract_type: Optional[str] = None
    tenderer_class: Optional[str] = None
    contract_duration_days: Optional[int] = None
    contact_name: Optional[str] = None
    contact_address: Optional[str] = None
    classification_reason: Optional[str] = None
    classification_method: str
    
    # Associated items
    documents: List[TenderDocumentRead] = []
    corrigenda: List[CorrigendumRead] = []

    model_config = ConfigDict(from_attributes=True)

class TenderListResponse(BaseModel):
    total_count: int
    matching_count: int
    civil_count: int
    closing_soon_count: int
    limit: int
    offset: int
    items: List[TenderListItem]
