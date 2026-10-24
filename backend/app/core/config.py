import os
import secrets
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_DEFAULT_DB_FILE = os.path.join(_PROJECT_ROOT, "tender_intelligence.db").replace("\\", "/")

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Database (always points to project root tender_intelligence.db)
    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB_FILE}"
    
    # Monitoring and Collection
    POLL_INTERVAL_MINUTES: int = 15
    MAX_CONCURRENT_COLLECTIONS: int = 2
    REQUEST_TIMEOUT_SECONDS: int = 30
    DEFAULT_USER_AGENT: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    )
    
    # Security Allowlist
    ALLOWED_SOURCE_HOSTS: List[str] = Field(
        default=["eproc.rajasthan.gov.in", "eprocure.gov.in", "www.ireps.gov.in", "ireps.gov.in"]
    )
    CORS_ORIGINS: List[str] = Field(
        default=["*", "http://localhost:5173", "http://127.0.0.1:5173", "https://www.ireps.gov.in", "https://ireps.gov.in"]
    )
    
    # Security Credentials & Auth (Zero hardcoded secrets; dynamically generated unless set via environment)
    JWT_SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32)
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 Hours
    RATE_LIMIT_ENABLED: bool = True
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"
    DEFAULT_ADMIN_PASSWORD: str = Field(
        default_factory=lambda: secrets.token_urlsafe(16)
    )
    
    # Document Processing & OCR
    MAX_DOCUMENT_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    ENABLE_OCR: bool = True
    TESSERACT_CMD: str = ""
    DOWNLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "downloads")
    
    model_config = SettingsConfigDict(
        env_file=(os.path.join(_PROJECT_ROOT, ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

