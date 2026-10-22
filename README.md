# CivilTender India | Civil Engineering Public Procurement Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646cff.svg)](https://vitejs.dev)
[![License: Open Source](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Zero-Paid-API](https://img.shields.io/badge/Paid_APIs-ZERO-brightgreen.svg)](#)
[![Security: Defense--Grade](https://img.shields.io/badge/Security-WAF%20%2B%20SSRF%20Guard-success.svg)](#)

> **Autonomous, Real-Time Civil Construction & Infrastructure Tender Intelligence for Indian Government Procurement Portals**

CivilTender India is a specialized, zero-cost procurement intelligence platform engineered specifically for civil engineering contractors, infrastructure builders, structural consultants, and project estimators. The software continuously tracks, filters, extracts, and streams civil construction tenders from official Indian government procurement portals directly into an interactive live workspace.

---

## 🎯 Why We Developed This Platform

### The Problem
Finding and tracking government civil tenders in India has historically been an inefficient, fragmented, and frustrating experience:

1. **Information Fragmentation Across Sluggish Portals**:
   Central and State government portals (such as CPPP and Rajasthan eProc) are built on legacy web architectures with frequent session timeouts, complex navigation hierarchies, slow search response times, and disparate search pages.
2. **Overwhelming Non-Civil Noise**:
   Every day, thousands of tenders are published across all sectors—including pharmaceuticals, IT hardware, vehicle rentals, stationery, housekeeping, and uniforms. Civil engineers and contractors waste hours manually filtering through hundreds of irrelevant listings to find civil works.
3. **Missed Deadlines & Undetected Corrigenda**:
   Tender submission windows are strict, and government departments frequently publish amendments, date extensions, or revised Bill of Quantities (BOQ) without direct notification. Missing a corrigendum often leads to bid disqualification or forfeited tender preparation investments.
4. **Exorbitant Commercial Paywalls**:
   Existing commercial tender aggregator websites charge heavy annual subscription fees (₹30,000 to ₹1,50,000+ per year) for simple notifications, often presenting delayed or stale data while locking public government information behind paywalls.

### The Purpose & Vision
CivilTender India was developed to **democratize access to public procurement data** through an autonomous, defense-grade, 100% zero-cost platform. It eliminates manual searching, strips away non-civil noise, monitors critical amendment cycles, and delivers instant, reliable intelligence to civil construction professionals—completely free of commercial API fees or subscription barriers.

---

## 🏛️ Procurement Portals Monitored

CivilTender India currently interfaces with major Indian government procurement portals powered by the National Informatics Centre (NIC) GePNIC system, with zero dependency on third-party commercial scrapers:

| Portal | Scope & Key Departments | Portal URL |
| :--- | :--- | :--- |
| **Central Public Procurement Portal (CPPP)** | Central Government Ministries, CPWD, NHAI, Indian Railways, MES, AIIMS, IITs, NITs, Central PSUs, and defense infrastructure | [eprocure.gov.in](https://eprocure.gov.in/eprocure/app) |
| **Rajasthan eProcurement Portal** | Public Works Department (PWD), Urban Local Bodies (DLB), Jaipur/Jodhpur Development Authorities (JDA), PHED Water Supply, WRD Water Resources, and RSAMB | [eproc.rajasthan.gov.in](https://eproc.rajasthan.gov.in/nicgep/app) |
| **Extensible GePNIC Architecture** | Standardized connector framework ready for multi-state GePNIC rollout (Uttar Pradesh, Madhya Pradesh, Maharashtra, Bihar, Odisha, and Karnataka) | NIC GePNIC Unified Engine |

> **Ethical & Zero-Bypass Compliance**:
> The platform adheres strictly to public procurement transparency norms. It exclusively utilizes publicly visible guest search feeds, public tender notices, and official announcements. It never bypasses CAPTCHAs, requires no credential hacking, and accesses only data intended for public bidding.

---

## ⚡ What You Can Do With This Software (Key Uses & Capabilities)

CivilTender India transforms raw, fragmented portal listings into actionable procurement intelligence:

### 1. Real-Time Civil Construction Discovery
- Automatically searches, aggregates, and indexes active civil works tenders from multiple portals simultaneously.
- Categorizes all discovered tenders into **6 specialized civil engineering domains**:
  - **Civil Construction & Buildings**: Commercial complexes, residential quarters, institutional buildings, boundary walls, and renovation.
  - **Roads & Highways**: Asphalt/bituminous roads, CC pavements, road widening, strengthening, culverts, and highway maintenance.
  - **Bridges & Flyovers**: Road Over Bridges (ROBs), Road Under Bridges (RUBs), river bridges, viaducts, and elevated corridors.
  - **Water Supply, Drainage & Sewerage**: Piped water supply schemes, transmission mains, WTP/STP, overhead tanks (OHT), and storm-water drainage.
  - **Structural Engineering & Audits**: Structural repair, RCC/steel fabrication, retrofitting, seismic retrofitting, and structural audits.
  - **PMC, DPR & Engineering Consultancy**: Project Management Consultancy (PMC), Detailed Project Reports (DPR), geotechnical surveys, and quality inspections.

### 2. Intelligent Negative Noise Disqualification
- Employs a deterministic, rule-based exclusion engine that automatically identifies and filters out non-civil tenders:
  - Disqualifies IT equipment, laptops, software, and surveillance systems.
  - Disqualifies medicine, hospital consumables, and surgical equipment.
  - Disqualifies vehicle rentals, driver hiring, and taxi logistics.
  - Disqualifies stationery, uniform supply, housekeeping, and catering.

### 3. Closing-Soon & Deadline Monitoring
- Dedicated real-time tracking for tenders with bid submission deadlines expiring within **7 days**.
- Color-coded urgency indicators that prevent contractors from missing critical pre-bid meetings, document download deadlines, or submission cutoffs.

### 4. Corrigenda & Amendment Auditing
- Computes cryptographic SHA-256 content fingerprints of tender detail pages across successive crawl passes.
- Instantly detects and flags corrigenda, timeline extensions, revised tender values, or altered tender conditions with an **"Amended"** status badge.

### 5. High-Speed Two-Phase Refresh Pipeline
- **Instant Table Refresh (<50ms)**: Clicking the refresh button immediately retrieves the latest records from the local high-performance database with zero UI lag.
- **Background Portal Synchronization**: Simultaneously dispatches concurrent crawls to government portals, streaming newly discovered tenders into the table via Server-Sent Events (SSE) upon completion.
- Anti-cache guarantees (`Cache-Control: no-cache, no-store`, dynamic timestamp busting) ensure data is always fresh and accurate.

### 6. Deep Tender Detail Inspection
- Comprehensive drill-down modal displaying:
  - Official Tender ID and Tender Reference Number
  - Publishing Organization, Department Hierarchy, and Tendering Authority
  - Estimated Tender Value (with formatted currency in Indian Rupees / Lakhs / Crores)
  - Earnest Money Deposit (EMD) and Tender Document Fee
  - Critical Timelines (Publish Date, Document Sale End, Bid Submission Deadline, Bid Opening Date)
  - Work Description, Location, and Pincode
  - Direct, verifiable link to the official government tender page

### 7. Defense-Grade Professional Reporting
- Export filtered tender search results into professionally styled Excel spreadsheets (`.xlsx`).
- Includes auto-fitted column widths, styled header bands, formatted Indian currency, and built-in **CSV/Formula Injection sanitization** to secure downstream business analysts.

---

## 🛠️ Technology Stack

CivilTender India is constructed on a modern, decoupled client-server architecture utilizing zero commercial dependencies:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT (SPA)                           │
│  React 18  •  TypeScript  •  Vite  •  Lucide Icons  •  Vanilla CSS     │
│  (Real-Time SSE Listeners, Anti-Cache Client, Glassmorphism UI)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / SSE Stream
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API & SECURITY                          │
│  FastAPI (ASGI)  •  Python 3.13  •  HTTPX Async Connection Pool        │
│  Built-in WAF  •  Rate Limiting  •  OWASP Headers  •  SSRF Protection  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       INGESTION & INTELLIGENCE       │  │      STORAGE & DATABASE      │
│  • BeautifulSoup4 HTML Parsing       │  │  • SQLite 3 WAL Mode         │
│  • 6-Domain Classification Engine    │  │  • SQLAlchemy 2.0 ORM        │
│  • Negative Keyword Filter           │  │  • Alembic Schema Migration  │
│  • SHA-256 Corrigenda Detection      │  │  • Thread-Safe Connection    │
│  • PyMuPDF / pdfplumber Extraction   │  │  • OpenPyXL Styled Reports   │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### Technology Breakdown

| Layer | Technologies | Role & Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | **Python 3.13**, **FastAPI**, **Uvicorn (ASGI)** | High-concurrency asynchronous API runtime delivering sub-millisecond route execution and native background tasks. |
| **Database Engine** | **SQLite 3** (with **WAL - Write-Ahead Logging** mode), **SQLAlchemy 2.0** | Serverless, high-reliability transactional persistence supporting concurrent reads and writes with zero external database server cost. |
| **Network & Scraping Engine** | **HTTPX**, **BeautifulSoup4**, **lxml** | Async HTTP client pooling, automated session cookie management, and deterministic HTML DOM table extraction tailored for GePNIC portal layouts. |
| **Live Streaming** | **Server-Sent Events (SSE)** | Unidirectional, lightweight event streaming providing real-time tender arrival highlights and collector telemetry without the overhead of heavy WebSockets. |
| **Frontend Framework** | **React 18**, **TypeScript**, **Vite** | Type-safe, component-driven user interface compiled to ultra-lean static assets with instant hot-module replacement and rapid rendering. |
| **User Interface & Aesthetics** | **Bespoke Vanilla CSS**, **Lucide React** | Dark-mode interface featuring glassmorphic elevation, responsive typography, micro-animations, and zero heavyweight CSS runtime dependencies. |
| **Reporting & Export** | **OpenPyXL** | Generates styled Excel workbooks with frozen headers, formatted currency columns, and automated formula injection mitigation. |
| **Security Architecture** | **In-House WAF**, **Token Bucket Rate Limiting**, **SSRF Domain Allowlisting** | Defense-grade protection defending against SQL Injection, Cross-Site Scripting (XSS), Path Traversal, Bot Probing, and SSRF attacks. |

---

## 🔮 Future Benefits & Strategic Roadmap

CivilTender India is architected for long-term scalability. Planned extensions and future benefits include:

1. **Automated Bill of Quantities (BOQ) Parsing**:
   - Deep extraction of material quantities (cement, TMT steel, bitumen, RMC) and unit rates directly from uploaded tender schedule spreadsheets and NIT PDFs.
2. **Personalized Contractor Alert Channels**:
   - Automated push notifications via **WhatsApp**, **Telegram**, and **Email** triggered when tenders match specific contractor profiles (e.g., PWD Class-A contractors, road projects above ₹5 Crore in specific districts).
3. **Nationwide GePNIC Expansion**:
   - Expanding native collector pipelines to cover 20+ additional state procurement portals (Uttar Pradesh, Madhya Pradesh, Gujarat, Haryana, Tamil Nadu, West Bengal, etc.).
4. **Competitor & Price Intelligence**:
   - Tracking Summary of Bids and Award of Contract (AOC) releases to provide historical unit rate analytics and competitor bidding behavior.
5. **Bid Eligibility & Qualification Matcher**:
   - Automated comparison between a contractor's annual turnover, single-work completion experience, and the mandatory qualifying criteria published in the tender notice.
6. **Subcontractor & Vendor Discovery**:
   - Facilitating matchmaking between primary infrastructure EPC contractors and local sub-contractors, equipment suppliers, and material vendors.

---

## 📋 Software Summary & Highlights

- ✅ **100% Free & Open-Source**: Zero subscription fees, zero commercial tokens, zero vendor lock-in.
- ✅ **Tailored for Civil Engineering**: Built specifically for building, highway, bridge, and water works contractors.
- ✅ **Real-Time Responsiveness**: Instant database queries paired with autonomous background live portal crawls.
- ✅ **Defense-Grade Security**: Built-in WAF, strict SSRF controls, formula injection defense, and OWASP-compliant headers.
- ✅ **Truthful & Deterministic**: Zero AI hallucinations—every tender detail links directly to official government records.
