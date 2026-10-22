import re
import logging
from typing import List, Dict, Any, Set, Tuple
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup

from app.services.collectors.base import BaseCollector
from app.services.extraction.html_parser import GePNICDetailParser
from app.services.classification.engine import classification_engine

logger = logging.getLogger("gepnic_collector")

class GePNICBaseCollector(BaseCollector):
    """
    Base collector for all National Informatics Centre (NIC) GePNIC portals.
    Supports session-state traversal, discovery on Homepage and Closing Date listings,
    and deterministic HTML extraction.
    """

    def __init__(
        self,
        source_id: str,
        name: str,
        base_url: str,
        default_state: str,
        min_request_interval_seconds: float = 2.0
    ):
        super().__init__(
            source_id=source_id,
            name=name,
            base_url=base_url,
            listing_url=base_url,
            min_request_interval_seconds=min_request_interval_seconds
        )
        self.default_state = default_state

    def discover_tender_links(self, client: httpx.Client, page_url: str) -> List[Tuple[str, str]]:
        """
        Discovers direct tender links from genuine tender tables.
        Explicitly isolates <table id="activeTenders"> and main tender listing tables,
        strictly ignoring corrigendums, amendments, and dead links.
        Returns tuples of (full_url, link_text).
        """
        try:
            resp = self.fetch_url(client, page_url)
            html = resp.text
            soup = BeautifulSoup(html, "html.parser")
            
            links = []
            seen_hrefs = set()
            
            # Scope search to valid tender tables only
            target_tables = []
            
            # 1. Homepage Active Tenders table
            active_tenders_tbl = soup.find("table", id="activeTenders")
            if active_tenders_tbl:
                target_tables.append(active_tenders_tbl)
                
            # 2. Main listing table on Tenders by Date or search pages
            list_tbl = soup.find("table", id="table") or soup.find("table", class_=re.compile(r'list_table', re.I))
            if list_tbl and list_tbl not in target_tables:
                target_tables.append(list_tbl)
                
            # Fallback: all tables EXCEPT corrigendum tables
            if not target_tables:
                for tbl in soup.find_all("table"):
                    tbl_id = str(tbl.get("id", "")).lower()
                    if "corrigendum" not in tbl_id and "menu" not in tbl_id:
                        target_tables.append(tbl)
            
            # Corrigendum filter keywords in link text
            corrigendum_keywords = [
                "date ext", "date change", "corrigendum", "addendum", 
                "fee change", "postponement", "cancellation", "amendment"
            ]

            for tbl in target_tables:
                for a_tag in tbl.find_all("a", href=True):
                    href = a_tag["href"]
                    # GePNIC direct tender detail links match component=$DirectLink
                    if "DirectLink" in href and "service=direct" in href:
                        text = a_tag.get_text(separator=" ", strip=True)
                        lower_text = text.lower()
                        
                        # Exclude any corrigendum links
                        if any(kw in lower_text for kw in corrigendum_keywords):
                            continue

                        # Ensure it is not inside an activeCorrigendums container
                        parent_corr = a_tag.find_parent("table", id="activeCorrigendums")
                        if parent_corr:
                            continue

                        if href not in seen_hrefs:
                            seen_hrefs.add(href)
                            full_url = urljoin(page_url, href)
                            links.append((full_url, text))
                        
            return links
        except Exception as e:
            logger.error(f"[{self.source_id}] Error discovering links from {page_url}: {e}")
            return []

    def search_keyword_tenders(self, client: httpx.Client, keyword: str = "civil") -> List[Tuple[str, str]]:
        """
        Submits the portal's quick search form (tenderSearch) with the target keyword (e.g. 'civil').
        Directly returns the newest civil tenders published on the portal matching the user's manual search.
        """
        try:
            r = self.fetch_url(client, self.base_url)
            soup = BeautifulSoup(r.text, "html.parser")
            form = soup.find("form", id="tenderSearch")
            if not form:
                return []

            data = {inp.get("name"): inp.get("value", "") for inp in form.find_all("input") if inp.get("name")}
            data["SearchDescription"] = keyword
            data["Go"] = "Go"
            action = form.get("action", self.base_url)
            post_url = urljoin(self.base_url, action)

            resp = client.post(post_url, data=data, timeout=20.0)
            res_soup = BeautifulSoup(resp.text, "html.parser")

            links = []
            seen_hrefs = set()
            tbl = res_soup.find("table", id="table") or res_soup.find("table", class_=re.compile(r"list", re.I))
            search_area = tbl if tbl else res_soup

            for a_tag in search_area.find_all("a", href=True):
                href = a_tag["href"]
                if "DirectLink" in href and "service=direct" in href:
                    text = a_tag.get_text(separator=" ", strip=True)
                    if href not in seen_hrefs and len(text) > 5:
                        seen_hrefs.add(href)
                        full_url = urljoin(self.base_url, href)
                        links.append((full_url, text))

            logger.info(f"[{self.source_id}] Found {len(links)} tenders from '{keyword}' keyword search")
            return links
        except Exception as e:
            logger.error(f"[{self.source_id}] Error in keyword search '{keyword}': {e}")
            return []

    def collect(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Executes a comprehensive collection run across portal multi-keyword searches,
        homepage active tenders, and closing date feeds covering civil construction,
        ROBs, metro, railways, highways, consultancy, and structural design.
        """
        tenders = []
        discovered_urls: Set[str] = set()

        # Using a stateful HTTP client to preserve JSESSIONID session cookies
        with httpx.Client(verify=True, follow_redirects=True) as client:
            logger.info(f"[{self.source_id}] Starting collection run on {self.base_url}")

            # Targeted multi-keyword search rotation covering all user civil infrastructure categories
            target_keywords = [
                "civil", "construction", "road", "bridge", "rob", "railway",
                "metro", "pwd", "nhai", "jda", "rsrdc", "consultancy",
                "architecture", "structure", "dpr", "pmc"
            ]
            
            candidate_links: List[Tuple[str, str]] = []
            for kw in target_keywords:
                try:
                    kw_links = self.search_keyword_tenders(client, kw)
                    for url, title in kw_links:
                        if url not in discovered_urls:
                            discovered_urls.add(url)
                            candidate_links.append((url, title))
                    if len(candidate_links) >= limit * 2:
                        break
                except Exception as e:
                    logger.warning(f"[{self.source_id}] Keyword search error for '{kw}': {e}")

            # Feed 2: Discover from Homepage Active Tenders table (if needed)
            if len(candidate_links) < limit:
                home_links = self.discover_tender_links(client, self.base_url)
                for url, title in home_links:
                    if url not in discovered_urls:
                        discovered_urls.add(url)
                        candidate_links.append((url, title))

            # Feed 3: Discover from Tenders by Closing Date (if needed)
            if len(candidate_links) < limit:
                closing_date_url = urljoin(self.base_url, "?page=FrontEndListTendersbyDate&service=page")
                closing_links = self.discover_tender_links(client, closing_date_url)
                for url, title in closing_links:
                    if url not in discovered_urls:
                        discovered_urls.add(url)
                        candidate_links.append((url, title))

            logger.info(f"[{self.source_id}] Collected {len(candidate_links)} unique candidate tender links. Processing up to {limit}...")
            
            # Stable direct URL pointing to the official active tenders lookup
            stable_portal_url = urljoin(self.base_url, "?page=FrontEndLatestActiveTenders&service=page")

            count = 0
            for tender_url, raw_title in candidate_links:
                if count >= limit:
                    break

                try:
                    logger.debug(f"[{self.source_id}] Fetching tender detail: {tender_url}")
                    detail_resp = self.fetch_url(client, tender_url)
                    detail_html = detail_resp.text

                    parsed = GePNICDetailParser.parse_html(
                        html_content=detail_html,
                        original_url=stable_portal_url,
                        portal_name=self.name
                    )

                    if not parsed or not parsed.get("tender_id"):
                        continue

                    # Fallback title if table didn't have one
                    if not parsed.get("title") or parsed.get("title") == "Untitled Government Tender":
                        parsed["title"] = raw_title

                    # Set State
                    parsed["state"] = self.default_state
                    parsed["source_id"] = self.source_id

                    # Run Classification Engine
                    classification = classification_engine.classify(
                        title=parsed["title"],
                        work_description=parsed.get("work_description"),
                        product_category=parsed.get("product_category"),
                        tender_category=parsed.get("tender_category")
                    )

                    # Attach classification fields
                    parsed["is_civil_construction"] = classification.is_civil_construction
                    parsed["category_id"] = classification.category_id
                    parsed["classification_score"] = classification.score
                    parsed["matched_keywords"] = ", ".join(classification.matched_keywords)
                    parsed["classification_reason"] = classification.reason
                    parsed["classification_method"] = classification.method

                    tenders.append(parsed)
                    count += 1
                    logger.info(f"[{self.source_id}] Successfully extracted tender: {parsed['tender_id']} - Civil: {parsed['is_civil_construction']}")

                except Exception as exc:
                    logger.warning(f"[{self.source_id}] Failed to extract tender detail from {tender_url}: {exc}")
                    continue

        return tenders
