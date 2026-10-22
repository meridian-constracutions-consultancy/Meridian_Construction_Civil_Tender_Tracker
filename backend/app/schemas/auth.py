from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    email: str = Field(..., min_length=5, max_length=128, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8, max_length=128)

    full_name: Optional[str] = Field(default="", max_length=128)
    role: Optional[str] = Field(default="viewer", pattern=r"^(admin|analyst|viewer)$")

class UserLoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=3, max_length=128)
    password: str = Field(..., min_length=1, max_length=128)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in_minutes: int
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

class ApiKeyCreateRequest(BaseModel):
    key_name: str = Field(..., min_length=3, max_length=64)

class ApiKeyResponse(BaseModel):
    id: str
    key_name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None
    raw_key: Optional[str] = None  # Only returned once upon creation!

class SecurityAuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    username: Optional[str] = None
    event_type: str
    severity: str
    ip_address: str
    user_agent: str
    endpoint: str
    method: str
    details: Optional[str] = None

    class Config:
        from_attributes = True
