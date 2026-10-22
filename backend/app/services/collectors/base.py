import time
import random
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings
from app.core.security import validate_outbound_url, SecurityException

logger = logging.getLogger("collectors")

class BaseCollector(ABC):
    """
    Abstract base collector enforcing rate limits, SSRF validation,
    session state preservation, and exponential backoff retry.
    """

    def __init__(
        self,
        source_id: str,
        name: str,
        base_url: str,
        listing_url: str,
        min_request_interval_seconds: float = 2.0
    ):
        self.source_id = source_id
        self.name = name
        self.base_url = base_url
        self.listing_url = listing_url
        self.min_request_interval_seconds = min_request_interval_seconds
        self._last_request_time = 0.0

    def _enforce_rate_limit(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self.min_request_interval_seconds:
            sleep_time = self.min_request_interval_seconds - elapsed
            time.sleep(sleep_time)
        self._last_request_time = time.time()

    def fetch_url(
        self,
        client: httpx.Client,
        url: str,
        max_retries: int = 3,
        backoff_factor: float = 1.5
    ) -> httpx.Response:
        """
        Executes a rate-limited, SSRF-validated HTTP GET request with exponential backoff.
        """
        # SSRF Check
        is_safe, error_msg = validate_outbound_url(url)
        if not is_safe:
            raise SecurityException(f"Outbound URL blocked: {error_msg}")

        attempt = 0
        while attempt < max_retries:
            self._enforce_rate_limit()
            try:
                response = client.get(
                    url,
                    headers={
                        "User-Agent": settings.DEFAULT_USER_AGENT,
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                    timeout=settings.REQUEST_TIMEOUT_SECONDS,
                    follow_redirects=True
                )
                if response.status_code == 200:
                    return response
                elif response.status_code in (429, 502, 503, 504):
                    # Rate-limited or temporary server error: apply backoff
                    wait = (backoff_factor ** attempt) + random.uniform(0.5, 1.5)
                    logger.warning(f"[{self.source_id}] HTTP {response.status_code} for {url}. Retrying in {wait:.2f}s...")
                    time.sleep(wait)
                    attempt += 1
                else:
                    response.raise_for_status()
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                wait = (backoff_factor ** attempt) + random.uniform(0.5, 1.5)
                logger.warning(f"[{self.source_id}] Connection error: {exc}. Retrying in {wait:.2f}s...")
                time.sleep(wait)
                attempt += 1

        raise RuntimeError(f"[{self.source_id}] Failed to fetch {url} after {max_retries} attempts.")

    @abstractmethod
    def collect(self, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Collects discovered active tenders from the portal.
        Returns a list of parsed, normalized tender dictionaries.
        """
        pass
