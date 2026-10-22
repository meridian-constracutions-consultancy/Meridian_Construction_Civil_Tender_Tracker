import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.config import settings
settings.ENVIRONMENT = "testing"

from app.db.base import Base
from app.db.session import get_db
from app.models.source import Source
from app.models.tender import Tender
from app.models.document import Corrigendum
from app.services.ingestion import IngestionService
from app.main import app

# StaticPool SQLite in-memory so all threads/sessions share the same in-memory DB during tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed test source
    src = Source(
        id="test_portal",
        name="Test Portal",
        base_url="https://eproc.rajasthan.gov.in/nicgep/app",
        listing_url="https://eproc.rajasthan.gov.in/nicgep/app",
        connector_type="test",
        is_enabled=True,
        poll_interval_minutes=10,
        health_status="HEALTHY"
    )
    db.add(src)
    db.commit()

    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_ingestion_and_duplicate_prevention(db_session):
    raw_tender = {
        "tender_id": "TEST_TENDER_001",
        "reference_number": "NIT/TEST/01",
        "title": "Construction of PWD Road in Jaipur",
        "work_description": "Construction of PWD Road in Jaipur",
        "organization_name": "PWD Rajasthan",
        "state": "Rajasthan",
        "source_id": "test_portal",
        "original_url": "https://eproc.rajasthan.gov.in/item1",
        "portal_name": "Test Portal",
        "estimated_value": 5000000.0,
        "emd_amount": 100000.0,
        "is_civil_construction": True,
        "category_id": "roads_highways",
        "classification_score": 0.85,
        "status": "ACTIVE",
        "content_hash": "hash_v1",
        "published_date": datetime(2026, 10, 20, 10, 0),
        "bid_submission_deadline": datetime(2026, 10, 30, 18, 0),
        "documents": [{"document_name": "NIT Notice", "document_type": "NIT", "file_url": "/doc1"}]
    }

    # First ingestion -> 1 new discovered
    discovered, updated, unchanged = IngestionService.ingest_tenders(db_session, "test_portal", [raw_tender])
    assert discovered == 1
    assert updated == 0
    assert unchanged == 0

    # Repeat exact same ingestion -> 0 discovered, 0 updated, 1 unchanged (no duplicates!)
    raw_tender2 = raw_tender.copy()
    discovered2, updated2, unchanged2 = IngestionService.ingest_tenders(db_session, "test_portal", [raw_tender2])
    assert discovered2 == 0
    assert updated2 == 0
    assert unchanged2 == 1

def test_corrigendum_deadline_extension_tracking(db_session):
    raw_tender = {
        "tender_id": "EXT_TENDER_002",
        "title": "Water Treatment Plant Construction",
        "source_id": "test_portal",
        "original_url": "https://eproc.rajasthan.gov.in/item2",
        "portal_name": "Test Portal",
        "estimated_value": 8000000.0,
        "is_civil_construction": True,
        "status": "ACTIVE",
        "content_hash": "hash_initial",
        "bid_submission_deadline": datetime(2026, 10, 25, 17, 0),
    }
    IngestionService.ingest_tenders(db_session, "test_portal", [raw_tender])

    # Portal extends the deadline to 05-Nov-2026
    raw_amended = raw_tender.copy()
    raw_amended["content_hash"] = "hash_amended_v2"
    raw_amended["bid_submission_deadline"] = datetime(2026, 11, 5, 17, 0)

    discovered, updated, unchanged = IngestionService.ingest_tenders(db_session, "test_portal", [raw_amended])
    assert discovered == 0
    assert updated == 1

    # Invalidate session cache to inspect fresh DB state
    db_session.expire_all()
    tender = db_session.query(Tender).filter_by(tender_id="EXT_TENDER_002").one()
    assert tender.status == "AMENDED"
    assert tender.bid_submission_deadline == datetime(2026, 11, 5, 17, 0)
    assert len(tender.corrigenda) == 1
    assert tender.corrigenda[0].corrigendum_type == "DEADLINE_EXTENSION"
    assert tender.corrigenda[0].new_deadline == datetime(2026, 11, 5, 17, 0)

def test_api_tenders_and_exports(client, db_session):
    # Ingest sample tender
    raw_tender = {
        "tender_id": "API_TENDER_003",
        "reference_number": "NIT/API/03",
        "title": "Bridge Strengthening across Banas River",
        "organization_name": "PWD Rajasthan",
        "state": "Rajasthan",
        "source_id": "test_portal",
        "original_url": "https://eproc.rajasthan.gov.in/item3",
        "portal_name": "Test Portal",
        "estimated_value": 15000000.0,
        "emd_amount": 300000.0,
        "is_civil_construction": True,
        "category_id": "bridges_flyovers",
        "classification_score": 0.9,
        "status": "ACTIVE",
        "content_hash": "hash_bridge",
        "published_date": datetime(2026, 10, 21, 9, 0),
        "bid_submission_deadline": datetime.utcnow() + timedelta(days=5),
    }
    IngestionService.ingest_tenders(db_session, "test_portal", [raw_tender])

    # 1. Test GET /api/tenders
    resp = client.get("/api/tenders?limit=50&is_civil_only=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["matching_count"] == 1
    assert data["items"][0]["tender_id"] == "API_TENDER_003"
    assert data["items"][0]["is_civil_construction"] is True

    # 2. Test search filter
    search_resp = client.get("/api/tenders?search=Bridge")
    assert search_resp.status_code == 200
    assert len(search_resp.json()["items"]) == 1

    empty_search = client.get("/api/tenders?search=NonExistentHospital")
    assert empty_search.status_code == 200
    assert len(empty_search.json()["items"]) == 0

    # 3. Test CSV export
    csv_resp = client.get("/api/export/csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "API_TENDER_003" in csv_resp.text
    assert "Bridge Strengthening" in csv_resp.text

    # 4. Test Excel export
    excel_resp = client.get("/api/export/excel")
    assert excel_resp.status_code == 200
    assert "spreadsheetml.sheet" in excel_resp.headers["content-type"]
    assert len(excel_resp.content) > 1000  # Valid binary Excel file
