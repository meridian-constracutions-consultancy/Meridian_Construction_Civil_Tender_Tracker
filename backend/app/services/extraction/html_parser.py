import re
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from bs4 import BeautifulSoup
from app.core.security import sanitize_text

# Standard date formats used across GePNIC portals
DATE_FORMATS = [
    "%d-%b-%Y %I:%M %p",    # 21-Oct-2026 12:00 PM
    "%d-%b-%Y %H:%M",       # 21-Oct-2026 14:00
    "%d/%m/%Y %I:%M %p",    # 21/10/2026 12:00 PM
    "%d-%m-%Y %I:%M %p",    # 21-10-2026 12:00 PM
    "%d-%b-%Y",             # 21-Oct-2026
    "%Y-%m-%d %H:%M:%S",
]

def parse_gepnic_date(date_str: Optional[str]) -> Optional[datetime]:
    """Deterministically parse GePNIC portal date strings into datetime objects."""
    if not date_str:
        return None
    cleaned = date_str.replace("&nbsp;", " ").strip()
    if not cleaned or cleaned.upper() in ("NA", "N/A", "NULL", "NONE", "-"):
        return None
    # Normalize multiple whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return None

def parse_amount(val_str: Optional[str]) -> Optional[float]:
    """Cleans currency strings (e.g. '69,07,000', '1,000.00', 'NA') into numeric floats."""
    if not val_str:
        return None
    cleaned = val_str.replace("&#8377;", "").replace("₹", "").replace(",", "").replace("&nbsp;", " ").strip()
    if not cleaned or cleaned.upper() in ("NA", "N/A", "NULL", "NONE", "-"):
        return None
    try:
        # Match leading float/integer number
        match = re.search(r'[-+]?\d*\.?\d+', cleaned)
        if match:
            return float(match.group(0))
        return None
    except (ValueError, TypeError):
        return None

def parse_int(val_str: Optional[str]) -> Optional[int]:
    """Cleans integer strings (e.g. '120 days', '90')."""
    if not val_str:
        return None
    cleaned = val_str.replace("&nbsp;", " ").strip()
    match = re.search(r'\d+', cleaned)
    if match:
        try:
            return int(match.group(0))
        except ValueError:
            return None
    return None

def parse_bool(val_str: Optional[str]) -> Optional[bool]:
    """Converts 'Yes', 'No', 'Allowed', 'Not Allowed' to boolean."""
    if not val_str:
        return None
    cleaned = val_str.strip().lower()
    if cleaned in ("yes", "allowed", "true", "1"):
        return True
    if cleaned in ("no", "not allowed", "false", "0"):
        return False
    return None

def extract_content_hash(tender_id: str, title: str, deadline: Optional[str], value: Optional[str]) -> str:
    """Computes a SHA-256 fingerprint for change detection."""
    content = f"{tender_id}|{title}|{deadline or ''}|{value or ''}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

class GePNICDetailParser:
    """
    Deterministic parser for Indian Government GePNIC detail pages.
    Parses table key-value pairs (td_caption and td_field) with zero hallucination.
    """

    @staticmethod
    def parse_html(html_content: str, original_url: str, portal_name: str) -> Optional[Dict[str, Any]]:
        if not html_content:
            return None
        
        soup = BeautifulSoup(html_content, "html.parser")
        
        # GePNIC details pages have pairs of td.td_caption and td.td_field
        kv_pairs: Dict[str, str] = {}
        
        # Strategy 1: Find all table cells with caption and field classes
        caption_cells = soup.find_all("td", class_=re.compile(r'caption', re.I))
        for cap in caption_cells:
            val_td = cap.find_next_sibling("td")
            if val_td:
                k = sanitize_text(cap.get_text(strip=True)).rstrip(":").strip()
                v = sanitize_text(val_td.get_text(separator=" ", strip=True))
                if k and v:
                    kv_pairs[k.lower()] = v

        # Strategy 2: Complement Strategy 1 by scanning any table rows that lacked caption classes
        for tr in soup.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) >= 2:
                for i in range(0, len(tds) - 1, 2):
                    k = sanitize_text(tds[i].get_text(strip=True)).rstrip(":").strip().lower()
                    v = sanitize_text(tds[i+1].get_text(separator=" ", strip=True))
                    if k and v and len(k) < 80 and k not in kv_pairs:
                        kv_pairs[k] = v

        # Check for Corrigendum Notice (should NOT be treated as a new tender)
        is_corrigendum = (
            "corrigendum details" in html_content.lower()[:4000]
            or "corrigendum type" in kv_pairs
            or "corrigendum title" in kv_pairs
        )

        # Extract essential fields using helper
        def get_field(*aliases: str) -> Optional[str]:
            for alias in aliases:
                a_lower = alias.lower()
                for k, v in kv_pairs.items():
                    if a_lower in k:
                        return v
            return None

        # If it's a corrigendum page, reject it from tender extraction
        if is_corrigendum and not get_field("tender value in", "tender value", "estimated cost"):
            return None

        tender_id = get_field("tender id")
        ref_no = get_field("tender reference number", "reference number")
        title = get_field("title") or get_field("work description")
        
        if not tender_id and not ref_no:
            # Could not identify tender record
            return None

        if not tender_id:
            tender_id = ref_no

        work_description = get_field("work description") or title

        # Organization chain decomposition
        org_chain = get_field("organisation chain", "organization chain")
        org_name = None
        department = None
        if org_chain:
            parts = [p.strip() for p in org_chain.split("||") if p.strip()]
            if parts:
                org_name = parts[0]
                if len(parts) > 1:
                    department = parts[1]

        # Location details
        location = get_field("location")
        pincode = get_field("pincode")

        # Values & Financials with comprehensive aliases
        est_value = parse_amount(get_field(
            "tender value in", "tender value", "estimated value", "estimated cost",
            "approximate cost", "work value", "total value", "contract value"
        ))
        tender_fee = parse_amount(get_field(
            "tender fee in", "tender fee", "cost of tender document", "tender doc fee", "document fee"
        ))
        processing_fee = parse_amount(get_field(
            "processing fee in", "processing fee"
        ))
        emd_amount = parse_amount(get_field(
            "emd amount in", "emd amount", "earnest money deposit", "emd fee in", "emd fee", "emd value", "emd in"
        ))
        emd_exemption = parse_bool(get_field(
            "emd exemption allowed", "emd exemption"
        ))
        duration_days = parse_int(get_field(
            "period of work(days)", "period of work", "completion period", "duration of work", "contract period"
        ))

        # Category metadata
        tender_cat = get_field("tender category")
        prod_cat = get_field("product category")
        contract_type = get_field("contract type")
        tenderer_class = get_field("tenderer class")

        # Dates with comprehensive aliases
        pub_date = parse_gepnic_date(get_field(
            "published date", "publication date", "e-published date", "nit published date", "published on"
        ))
        doc_start = parse_gepnic_date(get_field(
            "document download / sale start date", "download start date", "sale start date"
        ))
        doc_end = parse_gepnic_date(get_field(
            "document download / sale end date", "download end date", "sale end date"
        ))
        pre_bid = parse_gepnic_date(get_field(
            "pre bid meeting date"
        ))
        bid_start = parse_gepnic_date(get_field(
            "bid submission start date"
        ))
        bid_deadline = parse_gepnic_date(get_field(
            "bid submission end date", "closing date", "submission end date"
        ))
        bid_open = parse_gepnic_date(get_field(
            "bid opening date"
        ))

        # Fallback for published date: if missing, use document download start date or bid submission start date
        if not pub_date:
            pub_date = doc_start or bid_start

        # Contact authority
        contact_name = get_field("name")
        contact_address = get_field("address")

        # Compute content fingerprint
        content_hash = extract_content_hash(
            tender_id=tender_id,
            title=title or "",
            deadline=str(bid_deadline) if bid_deadline else "",
            value=str(est_value) if est_value else ""
        )

        # Extract Genuine Tender Documents
        documents = []
        ignore_doc_terms = [
            "back", "downloads", "home", "view more details", "view corrigendum history",
            "online bidder", "forgot password", "circular", "announcement", "help",
            "contact us", "feedback", "faq", "sitemap", "terms", "tenders by"
        ]
        seen_doc_names = set()

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            a_text = sanitize_text(a_tag.get_text(strip=True))
            lower_text = a_text.lower()
            lower_href = href.lower()

            # Skip navigation & menu links
            if any(ign in lower_text for ign in ignore_doc_terms):
                continue

            # Must match genuine document patterns
            is_valid_doc = (
                any(ext in lower_text or ext in lower_href for ext in [".pdf", ".zip", ".xls", ".xlsx", ".rar", ".doc", ".docx"])
                or "tendernotice" in lower_text or "tendernotice" in lower_href
                or "boq" in lower_text or "boq" in lower_href
                or "docdownload" in lower_href
                or "download as zip" in lower_text
            )

            if is_valid_doc:
                doc_title = a_text if a_text and len(a_text) < 120 and a_text.lower() != "tender document" else None
                if not doc_title:
                    if ".pdf" in lower_href:
                        doc_title = "Tender_Notice.pdf"
                    elif "boq" in lower_href or ".xls" in lower_href:
                        doc_title = "BOQ_Schedule.xls"
                    elif "zip" in lower_href or "download as zip" in lower_text:
                        doc_title = "All_Tender_Documents.zip"
                    else:
                        doc_title = "Tender_Specification.pdf"

                if doc_title not in seen_doc_names:
                    seen_doc_names.add(doc_title)
                    doc_type = "NIT"
                    if "boq" in doc_title.lower():
                        doc_type = "BOQ"
                    elif "corrigendum" in doc_title.lower() or "corr" in doc_title.lower():
                        doc_type = "CORRIGENDUM"
                    elif "zip" in doc_title.lower():
                        doc_type = "BUNDLE"

                    documents.append({
                        "document_name": doc_title,
                        "document_type": doc_type,
                        "file_url": href,
                    })

        return {
            "tender_id": tender_id,
            "reference_number": ref_no,
            "title": title or "Untitled Government Tender",
            "work_description": work_description,
            "organization_name": org_name,
            "department": department,
            "location": location,
            "pincode": pincode,
            "original_url": original_url,
            "portal_name": portal_name,
            "estimated_value": est_value,
            "currency": "INR",
            "tender_fee": tender_fee,
            "processing_fee": processing_fee,
            "emd_amount": emd_amount,
            "emd_exemption_allowed": emd_exemption,
            "contract_duration_days": duration_days,
            "tender_category": tender_cat,
            "product_category": prod_cat,
            "contract_type": contract_type,
            "tenderer_class": tenderer_class,
            "published_date": pub_date,
            "document_download_start_date": doc_start,
            "document_download_end_date": doc_end,
            "pre_bid_meeting_date": pre_bid,
            "bid_submission_start_date": bid_start,
            "bid_submission_deadline": bid_deadline,
            "bid_opening_date": bid_open,
            "contact_name": contact_name,
            "contact_address": contact_address,
            "content_hash": content_hash,
            "documents": documents,
        }
