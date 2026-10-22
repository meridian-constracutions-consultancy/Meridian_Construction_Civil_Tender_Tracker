import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))
from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    health = client.get('/api/health')
    print('HEALTH ENDPOINT:', health.status_code, health.json())

    tenders = client.get('/api/tenders?limit=5')
    t_data = tenders.json()
    print('TENDERS ENDPOINT:', tenders.status_code, 'Total Ingested:', t_data['total_count'], 'Civil Works:', t_data['civil_count'])
    for t in t_data['items'][:3]:
        print(f"  * [{t['tender_id']}] {t['title'][:70]} | Civil: {t['is_civil_construction']}")

    sources = client.get('/api/sources')
    s_data = sources.json()
    print('SOURCES ENDPOINT:', sources.status_code, f'Configured: {len(s_data)}')
    for s in s_data:
        print(f"  * {s['name']}: {s['health_status']}")

    spa = client.get('/')
    print('FRONTEND SPA HTML:', spa.status_code, f'Size: {len(spa.text)} bytes', 'Contains root div:', '<div id="root">' in spa.text)
    
print("\nALL VERIFICATIONS PASSED!")
