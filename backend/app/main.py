import os
import json
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.core.security import (
    hash_password,
    get_client_ip,
    inspect_for_malicious_content,
    rate_limiter
)
from app.db.base import Base
from app.db.session import engine
from app.models.user import User, SecurityAuditLog
from app.services.scheduler import scheduler
from app.api.tenders import router as tenders_router
from app.api.sources import router as sources_router
from app.api.events import router as events_router
from app.api.exports import router as exports_router
from app.api.auth import router as auth_router
from app.api.settings import router as settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Seed default initial administrator account if absent
    with Session(engine) as db:
        admin = db.execute(
            select(User).where(User.username == settings.DEFAULT_ADMIN_USERNAME)
        ).scalar_one_or_none()
        if not admin:
            pwd_hash, pwd_salt = hash_password(settings.DEFAULT_ADMIN_PASSWORD)
            admin = User(
                username=settings.DEFAULT_ADMIN_USERNAME,
                email=settings.DEFAULT_ADMIN_EMAIL,
                full_name="System Security Administrator",
                password_hash=pwd_hash,
                password_salt=pwd_salt,
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            logger.info("Default administrator account initialized with defense-grade security credentials.")

        # Sync keyword configuration from database if custom keywords exist
        from app.models.setting import SystemSetting
        from app.services.classification.engine import classification_engine
        kw_setting = db.execute(
            select(SystemSetting).where(SystemSetting.key == "keywords_config")
        ).scalar_one_or_none()
        if kw_setting:
            try:
                classification_engine.update_rules(json.loads(kw_setting.value))
                logger.info("Custom keywords configuration successfully reloaded from database.")
            except Exception as e:
                logger.warning(f"Error loading custom keywords config on startup: {e}")

        # Ensure database is synchronized with all verified seed tenders on every startup
        from app.api.settings import sync_seed_endpoint
        try:
            sync_res = sync_seed_endpoint(db)
            logger.info(f"Startup seed sync complete: {sync_res['message']}")
        except Exception as e:
            logger.warning(f"Error during startup seed sync: {e}")

    if settings.ENVIRONMENT != "testing":
        logger.info("Starting background collection scheduler...")
        await scheduler.start()
    yield
    # Shutdown
    if settings.ENVIRONMENT != "testing":
        logger.info("Stopping background collection scheduler...")
        await scheduler.stop()

app = FastAPI(
    title="Civil Tender Intelligence Platform API",
    description="Zero-cost Indian Government civil construction tender monitoring platform with defense-grade security.",
    version="1.1.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# WAF & RATE LIMITING DEFENSE MIDDLEWARE
# ==============================================================================
@app.middleware("http")
async def waf_and_rate_limiting_middleware(request: Request, call_next):
    client_ip = get_client_ip(request)
    path = str(request.url.path)
    query = str(request.url.query)

    # 1. Rate Limiting Check (DDoS / Brute Force Protection)
    if settings.RATE_LIMIT_ENABLED and not path.startswith("/assets"):
        is_auth = path.startswith("/api/auth")
        is_limited, retry_after = rate_limiter.is_rate_limited(client_ip, is_auth=is_auth)
        if is_limited:
            logger.warning(f"Rate limit exceeded for IP: {client_ip} on {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded for IP {client_ip}. Please retry after {retry_after} seconds.",
                    "client_ip": client_ip,
                    "retry_after_seconds": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )

    # 2. WAF Malicious Pattern Inspection (SQLi, XSS, Path Traversal, Bot Probes)
    from urllib.parse import unquote
    unquoted_path = unquote(path)
    unquoted_query = unquote(query)
    threat = (
        inspect_for_malicious_content(path)
        or inspect_for_malicious_content(unquoted_path)
        or inspect_for_malicious_content(query)
        or inspect_for_malicious_content(unquoted_query)
    )
    if threat:
        logger.error(f"Malicious attack blocked from IP {client_ip} on {path}: {threat}")
        rate_limiter.block_ip(client_ip, duration_seconds=900)  # 15-minute block
        try:
            with Session(engine) as db:
                log_entry = SecurityAuditLog(
                    event_type="MALICIOUS_INPUT_BLOCKED",
                    severity="CRITICAL",
                    ip_address=client_ip,
                    user_agent=request.headers.get("user-agent", "")[:255],
                    endpoint=path[:255],
                    method=request.method[:15],
                    details=json.dumps({"threat": threat, "query": query[:200]})
                )
                db.add(log_entry)
                db.commit()
        except Exception:
            pass

        return JSONResponse(
            status_code=403,
            content={
                "detail": f"Access Denied: Malicious pattern detected by Security WAF ({threat}).",
                "client_ip": client_ip,
                "incident_timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

    response = await call_next(request)
    return response

# ==============================================================================
# ENHANCED OWASP SECURITY HEADERS MIDDLEWARE
# ==============================================================================
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:8000 ws://127.0.0.1:8000;"
    )
    # Prevent caching of API data endpoints to guarantee real-time fresh data retrieval
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Include API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(tenders_router, prefix="/api")
app.include_router(sources_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(exports_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "civil-tender-intelligence",
        "security_engine": "ACTIVE_WAF_RATE_LIMIT_ENABLED",
        "environment": settings.ENVIRONMENT,
        "database": "sqlite_wal" if "sqlite" in settings.DATABASE_URL else "postgresql"
    }

# Mount static frontend build if present
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
assets_dir = os.path.join(frontend_dist, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(
                index_file,
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        return JSONResponse(status_code=404, content={"detail": "Index file not found"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
