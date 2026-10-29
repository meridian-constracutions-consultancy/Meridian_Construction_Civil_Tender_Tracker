import httpx
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin
from datetime import datetime
import json
import sqlite3
import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def parse_gepnic_date(date_str: str):
    if not date_str:
        return None
    date_str = date_str.strip()
    formats = [
        "%d-%b-%Y %I:%M %p",
        "%d-%b-%Y %H:%M",
        "%d-%b-%Y",
        "%d-%m-%Y %I:%M %p",
        "%d/%m/%Y %I:%M %p",
        "%Y-%m-%d %H:%M:%S"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    return None

def main():
    print("STARTING FULL LIVE CORRIGENDUM SCAN FOR ALL TENDERS...")
    with open("backend/app/db/seed_tenders.json", "r", encoding="utf-8") as f:
        seeds = json.load(f)

    with httpx.Client(headers=HEADERS, timeout=35.0, verify=False, follow_redirects=True) as client:
        # Establish sessions
        r_raj = client.get("https://eproc.rajasthan.gov.in/nicgep/app")
        form_raj = BeautifulSoup(r_raj.text, "html.parser").find("form", id="tenderSearch")
        post_raj = urljoin("https://eproc.rajasthan.gov.in/nicgep/app", form_raj.get("action", ""))

        r_cen = client.get("https://eprocure.gov.in/eprocure/app")
        form_cen = BeautifulSoup(r_cen.text, "html.parser").find("form", id="tenderSearch")
        post_cen = urljoin("https://eprocure.gov.in/eprocure/app", form_cen.get("action", ""))

        from app.db.session import SessionLocal
        from app.models.tender import Tender
        from app.models.document import Corrigendum
        import uuid

        db = SessionLocal()

        corr_yes_count = 0
        corr_no_count = 0
        total_scanned = 0

        for idx, s in enumerate(seeds):
            t_id = s.get("tender_id")
            source_id = s.get("source_id", "central_cppp")
            post_url = post_raj if source_id == "rajasthan_eproc" else post_cen
            form = form_raj if source_id == "rajasthan_eproc" else form_cen
            base_url = "https://eproc.rajasthan.gov.in/nicgep/app" if source_id == "rajasthan_eproc" else "https://eprocure.gov.in/eprocure/app"

            num_match = re.search(r'_([0-9]{5,8})_', t_id)
            term = num_match.group(1) if num_match else t_id

            try:
                data = {inp.get("name"): inp.get("value", "") for inp in form.find_all("input") if inp.get("name")}
                data["SearchDescription"] = term
                data["Go"] = "Go"
                resp = client.post(post_url, data=data)
                soup = BeautifulSoup(resp.text, "html.parser")
                tbl = soup.find("table", id="table")
                if not tbl:
                    continue

                rows = tbl.find_all("tr")
                detail_link = None
                pub_cell = None
                close_cell = None
                open_cell = None

                for tr in rows[1:]:
                    tds = tr.find_all("td")
                    if len(tds) >= 5:
                        col4 = tds[4]
                        if t_id in col4.get_text():
                            a = col4.find("a", href=True)
                            if a:
                                detail_link = urljoin(base_url, a["href"])
                                pub_cell = tds[1].get_text(separator=" ", strip=True)
                                close_cell = tds[2].get_text(separator=" ", strip=True)
                                open_cell = tds[3].get_text(separator=" ", strip=True) if len(tds) > 3 else ""
                                break

                if not detail_link:
                    continue

                total_scanned += 1

                # Update dates from search row if found
                if pub_cell:
                    p_dt = parse_gepnic_date(pub_cell)
                    if p_dt:
                        s["published_date"] = p_dt.isoformat()
                        s["published_date_raw"] = pub_cell
                        s["document_download_start_date"] = p_dt.isoformat()
                if close_cell:
                    c_dt = parse_gepnic_date(close_cell)
                    if c_dt:
                        s["bid_submission_deadline"] = c_dt.isoformat()
                        s["document_download_end_date"] = c_dt.isoformat()
                if open_cell:
                    o_dt = parse_gepnic_date(open_cell)
                    if o_dt:
                        s["bid_opening_date"] = o_dt.isoformat()

                # Fetch detail page to inspect corrigendum table
                d_resp = client.get(detail_link)
                d_soup = BeautifulSoup(d_resp.text, "html.parser")

                corr_tbl = d_soup.find("table", id="corrigendumDocumenttable")
                has_corrigendum = False
                found_corrs = []

                if corr_tbl:
                    for tr in corr_tbl.find_all("tr")[1:]:
                        tds = tr.find_all("td")
                        if len(tds) >= 3:
                            has_corrigendum = True
                            c_title = tds[1].get_text(strip=True)
                            c_type = tds[2].get_text(strip=True)
                            found_corrs.append((c_title, c_type))

                # Also check View Corrigendum History links
                if not has_corrigendum:
                    for a in d_soup.find_all("a", href=True):
                        title_attr = a.get("title", "").lower()
                        text_attr = a.get_text(strip=True).lower()
                        if "corrigendum history" in title_attr or "corrigendum history" in text_attr:
                            has_corrigendum = True
                            found_corrs.append(("View Corrigendum History", "AMENDMENT"))
                            break

                s["has_corrigendum"] = has_corrigendum
                if has_corrigendum:
                    corr_yes_count += 1
                else:
                    corr_no_count += 1

                # Update DB record
                t_db = db.query(Tender).filter(Tender.tender_id == t_id).first()
                if t_db:
                    t_db.has_corrigendum = has_corrigendum
                    if s.get("published_date"):
                        t_db.published_date = datetime.fromisoformat(s["published_date"])
                    if s.get("bid_submission_deadline"):
                        t_db.bid_submission_deadline = datetime.fromisoformat(s["bid_submission_deadline"])
                    if s.get("bid_opening_date"):
                        t_db.bid_opening_date = datetime.fromisoformat(s["bid_opening_date"])

                    # If has corrigendum, add records to corrigenda table if not already there
                    if has_corrigendum and found_corrs:
                        for c_title, c_type in found_corrs:
                            existing_corr = db.query(Corrigendum).filter(
                                Corrigendum.tender_id == t_db.id,
                                Corrigendum.corrigendum_title == c_title
                            ).first()
                            if not existing_corr:
                                new_corr = Corrigendum(
                                    id=str(uuid.uuid4()),
                                    tender_id=t_db.id,
                                    corrigendum_title=c_title,
                                    corrigendum_type=c_type or "AMENDMENT",
                                    new_deadline=t_db.bid_submission_deadline,
                                    details=f"Corrigendum published on official portal: {c_title}"
                                )
                                db.add(new_corr)

                if (idx + 1) % 15 == 0:
                    db.commit()
                    print(f"Progress: {idx+1}/{len(seeds)} | YES: {corr_yes_count} | NO: {corr_no_count}")

            except Exception as e:
                print(f"Error on {t_id}: {e}")

        db.commit()
        db.close()

        with open("backend/app/db/seed_tenders.json", "w", encoding="utf-8") as f:
            json.dump(seeds, f, indent=2)

        print("\n=======================================================")
        print(f"CORRIGENDUM SCAN COMPLETED!")
        print(f"Total Tenders Scanned: {total_scanned}")
        print(f"Corrigendum YES: {corr_yes_count}")
        print(f"Corrigendum NO:  {corr_no_count}")
        print("=======================================================")

if __name__ == "__main__":
    main()
