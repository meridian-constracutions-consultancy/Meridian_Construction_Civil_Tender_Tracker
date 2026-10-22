# System Architecture & Technical Specifications

## 1. Overview
The **CivilTender India** platform is an autonomous, event-driven intelligence system engineered to monitor Indian public e-procurement portals (specifically National Informatics Centre GePNIC installations), classify civil construction and structural works, track amendments/corrigenda, and stream real-time updates to a searchable dashboard without requiring page reloads.

The system is strictly zero-cost:
- No paid AI or commercial LLMs
- No paid scraping or proxy infrastructure
- No paid database licensing
- No paid notification or hosting requirements

---

## 2. Core Subsystems

### A. Base Collector & Portal Connectors
- **`GePNICBaseCollector`**: Handles Apache Tapestry session lifecycles, cookies (`JSESSIONID`), rate limiting, and backoff retries.
- **`RajasthanConnector`**: Discovers live tenders from `https://eproc.rajasthan.gov.in/nicgep/app` across both Homepage and "Tenders by Closing Date" feeds.
- **`CentralPortalConnector`**: Discovers tenders from `https://eprocure.gov.in/eprocure/app` across central ministries, CPWD, MES, NHAI, Railways, AIIMS, and PSUs.

### B. Deterministic Extraction Pipeline
- **`GePNICDetailParser`**: Parses table caption and field pairs (`td.td_caption` and `td.td_field`) into normalized fields.
- **Date Normalizer**: Handles Indian GePNIC date formats (`21-Oct-2026 12:00 PM`, `21/10/2026`, etc.).
- **Currency & Amount Cleanser**: Parses Indian Lakhs/Crores representations into floats, handling currency symbol `₹` (`&#8377;`), commas, and null/NA cases without inventing data.

### C. Civil Construction Classification Engine
- **`ClassificationEngine`**: Rule-based categorization engine evaluating:
  - Six civil engineering categories: Civil Construction & Works, Roads & Highways, Bridges & Flyovers, Water Supply & Drainage, Structural Engineering, and PMC/DPR Consultancy.
  - Multi-tier scoring: exact phrase match (+0.35), keyword match (+0.20), portal product category bonus (+0.40).
  - Negative keyword and phrase disqualification to prevent false positives from IT hardware, stationery, vehicles, and medical supplies.

### D. Ingestion & Corrigenda Tracking
- **`IngestionService`**:
  - Computes SHA-256 fingerprint of tender content for change detection.
  - Avoids duplicate records and notifications when repeated polling encounters unchanged records.
  - Detects deadline extensions and records `Corrigendum` items with before/after comparison.
  - Dispatches Server-Sent Events to active dashboard clients.

### E. Real-Time Streaming (SSE)
- **`SSEManager`**:
  - Implements `text/event-stream` endpoint at `/api/events`.
  - Automatic 15-second heartbeat to prevent proxy timeout.
  - Client auto-reconnection with exponential backoff.
  - Front-end dynamically prepends newly discovered tenders with visual glow animation without reloading or losing scroll state.

### F. Document Processing Pipeline
- **`DocumentProcessor`**:
  - PyMuPDF vector text extraction.
  - Tesseract OCR fallback for scanned images (gracefully disabled when external binary is absent).
  - Enforces 25MB document size limit and computes cryptographic hashes.

---

## 3. Database Schema
Normalized relational schema supporting SQLite (local/zero-cost) and PostgreSQL (production concurrency):
- `sources`: Procurement portal configuration and health status.
- `collection_jobs`: Historical execution log of collection attempts and discovery counts.
- `categories`: Civil taxonomy classifications with descriptions.
- `tenders`: Primary tender records with financial, date, location, and classification metadata.
- `tender_documents`: Public NITs, BOQs, drawings, and specifications.
- `corrigenda`: Tracked amendments, deadline extensions, and changes.
- `saved_tenders`: Bookmarked tenders for quick review.
- `audit_events`: Event log of discovery and modification events.
