from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_serializer

class SourceRead(BaseModel):
    id: str
    name: str
    base_url: str
    listing_url: str
    connector_type: str
    is_enabled: bool
    poll_interval_minutes: int
    health_status: str
    consecutive_failures: int
    last_successful_check: Optional[datetime] = None
    last_error_time: Optional[datetime] = None
    last_error_message: Optional[str] = None
    last_discovered_identifier: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("last_successful_check", "last_error_time", when_used="json")
    def serialize_dt(self, dt: Optional[datetime]) -> Optional[str]:
        if not dt:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

class SourceUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    poll_interval_minutes: Optional[int] = None

class CollectionJobRead(BaseModel):
    id: str
    source_id: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str
    tenders_discovered: int
    tenders_updated: int
    errors_count: int
    log_summary: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
