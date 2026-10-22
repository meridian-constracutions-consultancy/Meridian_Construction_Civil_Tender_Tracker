# Deployment & Operations Guide

## 1. System Requirements

### Minimum Hardware
- **CPU**: 1 vCPU (2 vCPUs recommended for concurrent PyMuPDF processing)
- **RAM**: 1 GB minimum (2 GB recommended if Tesseract OCR is enabled)
- **Storage**: 5 GB available disk space for SQLite WAL database and cached document metadata

---

## 2. Local Startup (Without Docker)

### Prerequisites
- Python 3.11+
- Node.js 18+ (for building frontend assets)

### Step 1: Virtual Environment Setup
```bash
# In project root
python -m venv venv

# On Windows
.\venv\Scripts\activate

# On Linux/macOS
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Step 2: Database Initialization
```bash
# Initialize SQLite database with normalized tables and seed data
python -c "
import sys; sys.path.insert(0, 'backend')
from app.db.base import Base
from app.db.session import engine
Base.metadata.create_all(bind=engine)
"
```

### Step 3: Run the Application
```bash
# Start backend and serve compiled SPA
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
Navigate to `http://localhost:8000` to access the live dashboard.

---

## 3. Production Deployment with Docker Compose

### Single Command Launch
```bash
docker compose up -d --build
```
This builds the frontend bundle, installs Python backend requirements, starts background polling, and exposes the unified dashboard on port 8000.

### Checking Container Health & Logs
```bash
# View application logs
docker compose logs -f tender-intelligence

# Check container health status
docker compose ps
```

---

## 4. Production Database Migration (SQLite to PostgreSQL)

When concurrent access across multiple server nodes is required, switch to PostgreSQL:
1. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@db-host:5432/tender_intelligence
   ```
2. Run Alembic migrations:
   ```bash
   alembic upgrade head
   ```

---

## 5. Backup & Recovery Procedure

### SQLite Backup (Zero-Downtime WAL Safe)
Because Write-Ahead Logging (WAL) is enabled, backup the database using SQLite's online backup API or CLI:
```bash
sqlite3 tender_intelligence.db ".backup 'tender_backup_$(date +%Y%m%d_%H%M%S).db'"
```

### Restore
```bash
# Stop application service
# Replace tender_intelligence.db with the backup file
cp tender_backup.db tender_intelligence.db
# Start application service
```
