import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, Text, Boolean, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class User(Base, TimestampMixin):
    """
    User entity with role-based access control, account lockout protection,
    and login tracking.
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    password_salt: Mapped[str] = mapped_column(String(64), nullable=False)
    
    # Roles: "admin", "analyst", "viewer"
    role: Mapped[str] = mapped_column(String(32), default="viewer", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Brute-force & Lockout Protection
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Tracking
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationships
    api_keys: Mapped[List["ApiKey"]] = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")

class ApiKey(Base, TimestampMixin):
    """
    API keys for programmatic integration with secure hashing.
    """
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key_name: Mapped[str] = mapped_column(String(64), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    hashed_key: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="api_keys")

class SecurityAuditLog(Base):
    """
    Central security audit log tracking user authentication, authorization checks,
    rate limit violations, and blocked malicious attacks.
    """
    __tablename__ = "security_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    
    # Events: LOGIN_SUCCESS, LOGIN_FAILED, ACCOUNT_LOCKED, MALICIOUS_INPUT_BLOCKED, RATE_LIMIT_TRIGGERED, UNAUTHORIZED_ACCESS
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), default="INFO", nullable=False) # INFO, WARNING, CRITICAL
    ip_address: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_agent: Mapped[str] = mapped_column(String(256), default="", nullable=False)
    endpoint: Mapped[str] = mapped_column(String(256), default="", nullable=False)
    method: Mapped[str] = mapped_column(String(16), default="", nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
