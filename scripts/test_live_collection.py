import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.source import Source
from app.models.tender import Category
from app.services.collectors.rajasthan import RajasthanConnector
from app.services.collectors.central import CentralPortalConnector
from app.services.ingestion import IngestionService

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    categories_to_seed = [
        {"id": "civil_construction", "name": "Civil Construction & Works", "description": "Building construction, general civil works, restoration"},
        {"id": "roads_highways", "name": "Roads & Highways", "description": "Highways, expressways, asphalt roads, pavement, culverts"},
        {"id": "bridges_flyovers", "name": "Bridges & Flyovers", "description": "Bridges, flyovers, overbridges, underpasses, viaducts"},
        {"id": "water_supply_drainage", "name": "Water Supply & Drainage", "description": "Water supply schemes, pipelines, sewerage, drainage networks"},
        {"id": "structural_engineering", "name": "Structural Engineering & Design", "description": "Structural analysis, RCC/steel design, retrofitting, audits"},
        {"id": "consultancy_pmc_dpr", "name": "PMC, DPR & Engineering Consultancy", "description": "Detailed project reports, project management consultancy, inspections"}
    ]
    for cat_data in categories_to_seed:
        if not db.get(Category, cat_data["id"]):
            db.add(Category(**cat_data))

    for s_id, s_name, s_url, s_type in [
        ('rajasthan_eproc', 'Rajasthan eProcurement Portal', 'https://eproc.rajasthan.gov.in/nicgep/app', 'rajasthan_gepnic'),
        ('central_cppp', 'Central Public Procurement Portal', 'https://eprocure.gov.in/eprocure/app', 'central_gepnic')
    ]:
        src = db.get(Source, s_id)
        if not src:
            src = Source(
                id=s_id,
                name=s_name,
                base_url=s_url,
                listing_url=s_url,
                connector_type=s_type,
                is_enabled=True,
                poll_interval_minutes=10,
                health_status='READY'
            )
            db.add(src)
    db.commit()

# Test Rajasthan Collection
print("=== Starting Live Rajasthan Collection (limit=2) ===")
rajasthan_connector = RajasthanConnector()
raj_tenders = rajasthan_connector.collect(limit=2)
print(f"Collected {len(raj_tenders)} tenders from Rajasthan:")
for t in raj_tenders:
    print(f"  * ID: {t['tender_id']}")
    print(f"    Title: {t['title'][:80]}")
    print(f"    Value: ₹{t['estimated_value']}, Civil: {t['is_civil_construction']}, Cat: {t['category_id']}")

with SessionLocal() as db:
    disc, upd, unch = IngestionService.ingest_tenders(db, 'rajasthan_eproc', raj_tenders)
    print(f"Ingestion: {disc} new, {upd} updated, {unch} unchanged.\n")

# Test Central CPPP Collection
print("=== Starting Live Central CPPP Collection (limit=2) ===")
central_connector = CentralPortalConnector()
cppp_tenders = central_connector.collect(limit=2)
print(f"Collected {len(cppp_tenders)} tenders from Central CPPP:")
for t in cppp_tenders:
    print(f"  * ID: {t['tender_id']}")
    print(f"    Title: {t['title'][:80]}")
    print(f"    Value: ₹{t['estimated_value']}, Civil: {t['is_civil_construction']}, Cat: {t['category_id']}")

with SessionLocal() as db:
    disc, upd, unch = IngestionService.ingest_tenders(db, 'central_cppp', cppp_tenders)
    print(f"Ingestion: {disc} new, {upd} updated, {unch} unchanged.\n")

print("LIVE VERIFICATION COMPLETE!")
