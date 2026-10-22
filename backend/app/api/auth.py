import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.models.user import User, ApiKey, SecurityAuditLog
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    ChangePasswordRequest,
    ApiKeyCreateRequest,
    ApiKeyResponse,
    SecurityAuditLogResponse
)
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_jwt_token,
    verify_jwt_token,
    generate_api_key,
    verify_api_key,
    get_client_ip,
    rate_limiter,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

# ==============================================================================
# AUDIT LOGGING HELPER
# ==============================================================================
def record_security_audit(
    db: Session,
    request: Request,
    event_type: str,
    severity: str = "INFO",
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    details: Optional[dict] = None
):
    try:
        ip = get_client_ip(request)
        ua = request.headers.get("user-agent", "Unknown")[:255]
        path = str(request.url.path)[:255]
        method = request.method[:15]
        
        log_entry = SecurityAuditLog(
            user_id=user_id,
            username=username,
            event_type=event_type,
            severity=severity,
            ip_address=ip,
            user_agent=ua,
            endpoint=path,
            method=method,
            details=json.dumps(details) if details else None
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()

# ==============================================================================
# AUTH DEPENDENCIES (JWT & API KEY)
# ==============================================================================
def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates either a Bearer JWT access token or an X-API-Key header.
    Returns the authenticated User or raises 401 Unauthorized.
    """
    # 1. Try Bearer JWT Token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        claims = verify_jwt_token(token)
        if claims and "sub" in claims:
            user = db.execute(select(User).where(User.id == claims["sub"])).scalar_one_or_none()
            if user and user.is_active:
                return user
                
    # 2. Try API Key
    if x_api_key and x_api_key.startswith("ct_"):
        parts = x_api_key.split("_")
        if len(parts) >= 2:
            prefix = f"{parts[0]}_{parts[1]}"
            stmt = select(ApiKey).where(ApiKey.key_prefix == prefix, ApiKey.is_active == True)
            api_key_obj = db.execute(stmt).scalar_one_or_none()
            if api_key_obj and verify_api_key(x_api_key, api_key_obj.hashed_key):
                user = db.execute(select(User).where(User.id == api_key_obj.user_id)).scalar_one_or_none()
                if user and user.is_active:
                    api_key_obj.last_used_at = datetime.now(timezone.utc)
                    db.commit()
                    return user

    # Unauthorized
    record_security_audit(
        db, request,
        event_type="UNAUTHORIZED_ACCESS_ATTEMPT",
        severity="WARNING",
        details={"reason": "Missing or invalid credentials"}
    )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials are required to access this resource",
        headers={"WWW-Authenticate": "Bearer"}
    )

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforces that the authenticated user possesses the 'admin' role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this operation"
        )
    return current_user

# ==============================================================================
# AUTH & SECURITY ENDPOINTS
# ==============================================================================
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Registers a new user account with cryptographic password hashing.
    Enforces password complexity.
    """
    # Enforce password complexity
    pwd = payload.password
    has_digit = any(c.isdigit() for c in pwd)
    has_letter = any(c.isalpha() for c in pwd)
    if not (has_digit and has_letter):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long and contain both letters and numbers"
        )

    # Check unique username and email
    existing_user = db.execute(
        select(User).where((User.username == payload.username) | (User.email == payload.email))
    ).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this username or email address already exists"
        )

    # Hash password
    pwd_hash, pwd_salt = hash_password(payload.password)

    new_user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name or payload.username,
        password_hash=pwd_hash,
        password_salt=pwd_salt,
        role=payload.role or "viewer",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_security_audit(
        db, request,
        event_type="USER_REGISTERED",
        severity="INFO",
        user_id=new_user.id,
        username=new_user.username,
        details={"role": new_user.role, "email": new_user.email}
    )

    return new_user

@router.post("/login", response_model=TokenResponse)
def login_user(
    payload: UserLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticates a user with IP tracking and account lockout defense against brute force attacks.
    """
    client_ip = get_client_ip(request)

    # 1. Find user by username or email
    user = db.execute(
        select(User).where(
            (User.username == payload.username_or_email) | (User.email == payload.username_or_email)
        )
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)

    # 2. Check if account is locked
    if user and user.locked_until:
        if now < user.locked_until.replace(tzinfo=timezone.utc):
            remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - now).total_seconds() / 60) + 1
            record_security_audit(
                db, request,
                event_type="LOCKED_ACCOUNT_LOGIN_ATTEMPT",
                severity="WARNING",
                user_id=user.id,
                username=user.username,
                details={"remaining_minutes": remaining}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked due to consecutive failed attempts. Try again in {remaining} minute(s)."
            )
        else:
            # Lockout expired, reset
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    # 3. Verify credentials
    is_valid = False
    if user:
        is_valid = verify_password(payload.password, user.password_hash, user.password_salt)

    if not is_valid:
        # Increment failed attempts if user exists
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
                record_security_audit(
                    db, request,
                    event_type="ACCOUNT_LOCKED",
                    severity="CRITICAL",
                    user_id=user.id,
                    username=user.username,
                    details={"lockout_minutes": settings.ACCOUNT_LOCKOUT_MINUTES, "failed_attempts": user.failed_login_attempts}
                )
            else:
                record_security_audit(
                    db, request,
                    event_type="LOGIN_FAILED",
                    severity="WARNING",
                    user_id=user.id,
                    username=user.username,
                    details={"attempt": user.failed_login_attempts}
                )
            db.commit()
        else:
            record_security_audit(
                db, request,
                event_type="LOGIN_FAILED_UNKNOWN_USER",
                severity="WARNING",
                details={"input": payload.username_or_email}
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact the system administrator."
        )

    # 4. Successful Login: Reset counters & record session IP
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    user.last_login_ip = client_ip
    db.commit()

    # 5. Issue JWT Token
    token_claims = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "ip": client_ip
    }
    access_token = create_jwt_token(token_claims, expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    record_security_audit(
        db, request,
        event_type="LOGIN_SUCCESS",
        severity="INFO",
        user_id=user.id,
        username=user.username,
        details={"ip": client_ip, "role": user.role}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and security attributes."""
    return current_user

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Changes user password with verification of existing password."""
    if not verify_password(payload.old_password, current_user.password_hash, current_user.password_salt):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    pwd = payload.new_password
    if len(pwd) < 8 or not (any(c.isdigit() for c in pwd) and any(c.isalpha() for c in pwd)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long and contain both letters and numbers"
        )

    new_hash, new_salt = hash_password(payload.new_password)
    current_user.password_hash = new_hash
    current_user.password_salt = new_salt
    db.commit()

    record_security_audit(
        db, request,
        event_type="PASSWORD_CHANGED",
        severity="INFO",
        user_id=current_user.id,
        username=current_user.username
    )

    return {"status": "SUCCESS", "message": "Password changed successfully"}

# ==============================================================================
# API KEYS MANAGEMENT
# ==============================================================================
@router.get("/keys", response_model=List[ApiKeyResponse])
def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all active API keys for the current user."""
    stmt = select(ApiKey).where(ApiKey.user_id == current_user.id).order_by(desc(ApiKey.created_at))
    keys = db.execute(stmt).scalars().all()
    return keys

@router.post("/keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
def create_new_api_key(
    payload: ApiKeyCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a new secure API key.
    The raw key is returned ONLY once upon creation.
    """
    raw_key, prefix, hashed = generate_api_key()
    
    api_key_entry = ApiKey(
        user_id=current_user.id,
        key_name=payload.key_name,
        key_prefix=prefix,
        hashed_key=hashed,
        is_active=True
    )
    db.add(api_key_entry)
    db.commit()
    db.refresh(api_key_entry)

    record_security_audit(
        db, request,
        event_type="API_KEY_CREATED",
        severity="INFO",
        user_id=current_user.id,
        username=current_user.username,
        details={"key_name": payload.key_name, "prefix": prefix}
    )

    res = ApiKeyResponse(
        id=api_key_entry.id,
        key_name=api_key_entry.key_name,
        key_prefix=api_key_entry.key_prefix,
        is_active=api_key_entry.is_active,
        created_at=api_key_entry.created_at,
        last_used_at=api_key_entry.last_used_at,
        raw_key=raw_key
    )
    return res

@router.delete("/keys/{key_id}")
def revoke_api_key(
    key_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revokes an API key."""
    stmt = select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    key_entry = db.execute(stmt).scalar_one_or_none()
    if not key_entry:
        raise HTTPException(status_code=404, detail="API key not found")
        
    db.delete(key_entry)
    db.commit()

    record_security_audit(
        db, request,
        event_type="API_KEY_REVOKED",
        severity="WARNING",
        user_id=current_user.id,
        username=current_user.username,
        details={"key_id": key_id}
    )

    return {"status": "SUCCESS", "message": "API key revoked"}

# ==============================================================================
# SECURITY AUDIT LOGS & STATUS
# ==============================================================================
@router.get("/audit-logs", response_model=List[SecurityAuditLogResponse])
def get_security_audit_logs(
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns recent security audit logs (Admin Only).
    Displays tracked IPs, login attempts, blocked attacks, and user actions.
    """
    stmt = select(SecurityAuditLog).order_by(desc(SecurityAuditLog.timestamp)).limit(min(limit, 200))
    logs = db.execute(stmt).scalars().all()
    return logs

@router.get("/security-status")
def get_security_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public / System security telemetry endpoint reporting active defense mechanisms
    and client session information.
    """
    client_ip = get_client_ip(request)
    total_logs = db.execute(select(SecurityAuditLog)).scalars().all()
    blocked_attacks = [l for l in total_logs if l.severity == "CRITICAL" or "ATTACK" in l.event_type]
    
    return {
        "status": "ARMED_AND_ACTIVE",
        "client_ip": client_ip,
        "protections_active": [
            "WAF Malicious Pattern Inspection (SQLi, XSS, Path Traversal)",
            "Sliding Window Anti-DDoS Rate Limiter",
            "Brute Force Lockout Defense (5 Attempts / 15-Minute Jail)",
            "NIST PBKDF2-HMAC-SHA256 Password Cryptography",
            "RFC 7519 HMAC-SHA256 JWT Authentication",
            "SSRF IP Address & Private Range Sanitizer",
            "Formula / CSV Injection Sanitizer",
            "Executable Malware Vector Blocker",
            "OWASP Security Headers (CSP, HSTS, NoSniff, X-Frame DENY)"
        ],
        "blocked_attacks_count": len(blocked_attacks),
        "total_audit_events": len(total_logs)
    }
