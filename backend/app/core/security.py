import ipaddress
import socket
import re
import hmac
import hashlib
import json
import base64
import time
import secrets
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Optional, Tuple, Dict, List, Any
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.core.config import settings

class SecurityException(Exception):
    """Raised when a security policy validation fails."""
    pass

# ==============================================================================
# 1. SSRF & EXTERNAL URL PROTECTION
# ==============================================================================
def validate_outbound_url(url: str, allow_redirect_check: bool = True) -> Tuple[bool, Optional[str]]:
    """
    Validates that a URL is safe for outbound HTTP fetching (SSRF Protection).
    Ensures:
      - Scheme is strictly http or https
      - Host is in the ALLOWED_SOURCE_HOSTS allowlist
      - Host does not resolve to private, loopback, or link-local IP addresses
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, f"Invalid URL scheme: {parsed.scheme}"
            
        hostname = parsed.hostname
        if not hostname:
            return False, "Missing hostname in URL"
            
        hostname = hostname.lower()
        
        # Check domain allowlist
        allowed = any(
            hostname == allowed_host or hostname.endswith("." + allowed_host)
            for allowed_host in settings.ALLOWED_SOURCE_HOSTS
        )
        if not allowed:
            return False, f"Host '{hostname}' is not in the allowed source registry."
            
        # Resolve DNS to check IP addresses against private ranges
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for family, _, _, _, sockaddr in addr_info:
                ip_str = sockaddr[0]
                ip = ipaddress.ip_address(ip_str)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                    return False, f"Hostname resolves to prohibited IP address: {ip_str}"
        except socket.gaierror:
            return False, f"Could not resolve hostname: {hostname}"
            
        return True, None
    except Exception as e:
        return False, f"URL validation error: {str(e)}"

# ==============================================================================
# 2. INPUT SANITIZATION & FORMULA INJECTION DEFENSE
# ==============================================================================
def sanitize_for_spreadsheet(value: Optional[str]) -> str:
    """
    Sanitizes string values to prevent CSV / Excel formula injection (CSV Injection / CWE-1236).
    If a cell value starts with '=', '+', '-', '@', tab, or carriage return,
    prefix it with a single quote so spreadsheet programs treat it as text.
    """
    if value is None:
        return ""
    str_val = str(value)
    if not str_val:
        return ""
    if str_val[0] in ('=', '+', '-', '@', '\t', '\r'):
        return f"'{str_val}"
    return str_val.strip()

def sanitize_text(text: Optional[str]) -> str:
    """
    Sanitizes text extracted from untrusted external sources.
    Strips dangerous control characters while preserving valid formatting.
    """
    if not text:
        return ""
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return cleaned.strip()

# ==============================================================================
# 3. AUTHENTICATION & PASSWORD HASHING (PBKDF2-HMAC-SHA256 - NIST Compliant)
# ==============================================================================
def hash_password(password: str) -> Tuple[str, str]:
    """
    Generates a cryptographically strong salted PBKDF2-HMAC-SHA256 hash.
    Returns (hex_hash, hex_salt).
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=120_000
    )
    return key.hex(), salt

def verify_password(password: str, expected_hash: str, salt: str) -> bool:
    """
    Verifies a plaintext password against the expected PBKDF2 hash using constant-time comparison.
    """
    try:
        calculated_key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations=120_000
        )
        return hmac.compare_digest(calculated_key.hex(), expected_hash)
    except Exception:
        return False

# ==============================================================================
# 4. JSON WEB TOKEN (JWT) IMPLEMENTATION (RFC 7519 HS256)
# ==============================================================================
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4) if len(data) % 4 != 0 else ''
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))

def create_jwt_token(payload: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    """
    Creates a signed JSON Web Token (JWT) with HS256 signature and expiration timestamp.
    """
    now = int(time.time())
    exp = now + (expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES) * 60
    
    token_claims = {
        **payload,
        "iat": now,
        "exp": exp
    }
    
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(token_claims, separators=(",", ":")).encode("utf-8"))
    
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies and decodes a JWT token. Returns payload dict if valid, None if invalid or expired.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
            
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(settings.JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        
        # Verify signature in constant time
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(actual_sig, expected_sig):
            return None
            
        # Parse payload
        payload_bytes = _b64url_decode(payload_b64)
        claims = json.loads(payload_bytes.decode("utf-8"))
        
        # Check expiration
        now = int(time.time())
        if "exp" in claims and claims["exp"] < now:
            return None  # Token Expired
            
        return claims
    except Exception:
        return None

# ==============================================================================
# 5. API KEY MANAGEMENT
# ==============================================================================
def generate_api_key() -> Tuple[str, str, str]:
    """
    Generates a secure API key with prefix and secret.
    Returns: (raw_key, prefix, sha256_hash)
    """
    prefix = f"ct_{secrets.token_hex(4)}"
    secret = secrets.token_hex(24)
    raw_key = f"{prefix}_{secret}"
    hashed_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return raw_key, prefix, hashed_key

def verify_api_key(raw_key: str, hashed_key: str) -> bool:
    """Verifies an API key against its SHA-256 hash in constant time."""
    calculated = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return hmac.compare_digest(calculated, hashed_key)

# ==============================================================================
# 6. CLIENT IP EXTRACTION & USER TRACKING
# ==============================================================================
def get_client_ip(request: Request) -> str:
    """
    Safely extracts the client IP address.
    Checks X-Forwarded-For with strict IP format validation to prevent header spoofing.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first_ip = forwarded.split(",")[0].strip()
        try:
            ipaddress.ip_address(first_ip)
            return first_ip
        except ValueError:
            pass
            
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"

# ==============================================================================
# 7. WEB APPLICATION FIREWALL (WAF) MALICIOUS PATTERN INSPECTION
# ==============================================================================
SQLI_PATTERNS = [
    re.compile(r"(\b(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|update\s+.*\s+set|delete\s+from|--\s*|/\*.*\*/|;\s*drop|xp_cmdshell)\b)", re.IGNORECASE),
    re.compile(r"('|\")\s*(or|and)\s*('|\")?\d+('|\")?\s*=\s*('|\")?\d+", re.IGNORECASE),
]

XSS_PATTERNS = [
    re.compile(r"(<script\b[^>]*>|javascript:|vbscript:|onload\s*=|onerror\s*=|onclick\s*=|document\.cookie|<iframe\b|<embed\b|<object\b)", re.IGNORECASE),
]

PATH_TRAVERSAL_PATTERNS = [
    re.compile(r"(\.\./|\.\.\\|%2e%2e%2f|%2e%2e/|\.\.%2f|%2e%2e%5c|/etc/passwd|/windows/win\.ini)", re.IGNORECASE),
]

SCANNER_PROBE_PATTERNS = [
    re.compile(r"(\.env|\.git/|wp-admin|wp-login|phpmyadmin|eval-stdin\.php|setup\.php|xmlrpc\.php)", re.IGNORECASE),
]

def inspect_for_malicious_content(content: str) -> Optional[str]:
    """
    Scans a string (query string, body, or URI path) for malicious payloads.
    Returns the threat description if detected, or None if clean.
    """
    if not content:
        return None
        
    for p in SQLI_PATTERNS:
        if p.search(content):
            return "SQL Injection Attack Detected"
            
    for p in XSS_PATTERNS:
        if p.search(content):
            return "Cross-Site Scripting (XSS) Attack Detected"
            
    for p in PATH_TRAVERSAL_PATTERNS:
        if p.search(content):
            return "Path Traversal / Directory Escape Detected"
            
    for p in SCANNER_PROBE_PATTERNS:
        if p.search(content):
            return "Known Vulnerability Scanner / Exploit Probe Detected"
            
    return None

# ==============================================================================
# 8. RATE LIMITER & ANTI-DDOS (Sliding Window per IP)
# ==============================================================================
class RateLimiter:
    def __init__(self):
        # Key: (ip, route_type) -> list of timestamp floats
        self._history: Dict[Tuple[str, str], List[float]] = {}
        self._blocked_ips: Dict[str, float] = {}

    def is_rate_limited(self, ip: str, is_auth: bool = False) -> Tuple[bool, int]:
        """
        Checks whether an IP has exceeded rate limits.
        Auth routes: 10 requests / minute.
        General routes: 120 requests / minute.
        Returns: (is_limited, retry_after_seconds)
        """
        now = time.time()
        
        # Check explicit temporary block
        if ip in self._blocked_ips:
            if now < self._blocked_ips[ip]:
                return True, int(self._blocked_ips[ip] - now) + 1
            else:
                del self._blocked_ips[ip]
                
        route_type = "auth" if is_auth else "general"
        limit = 10 if is_auth else 120
        window = 60.0  # 60 seconds
        
        key = (ip, route_type)
        if key not in self._history:
            self._history[key] = []
            
        # Discard records older than sliding window
        self._history[key] = [t for t in self._history[key] if now - t < window]
        
        if len(self._history[key]) >= limit:
            return True, int(window - (now - self._history[key][0])) + 1
            
        self._history[key].append(now)
        return False, 0

    def block_ip(self, ip: str, duration_seconds: int = 900):
        """Temporarily blocks an offending IP (e.g. after detected attacks)."""
        if (settings.ENVIRONMENT in ("development", "testing") or settings.DEBUG) and ip in ("127.0.0.1", "::1", "localhost", "testclient"):
            return
        self._blocked_ips[ip] = time.time() + duration_seconds

    def unblock_ip(self, ip: str):
        """Unblocks an IP."""
        if ip in self._blocked_ips:
            del self._blocked_ips[ip]

# Global Rate Limiter instance
rate_limiter = RateLimiter()

# ==============================================================================
# 9. MALWARE & SAFE FILE TYPE VALIDATOR
# ==============================================================================
DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".ps1", ".vbs", ".sh", ".php", ".phtml",
    ".dll", ".scr", ".msi", ".jar", ".py", ".com", ".cpl", ".hta", ".js"
}

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf", ".zip", ".xls", ".xlsx", ".doc", ".docx", ".rar", ".7z",
    ".csv", ".txt", ".png", ".jpg", ".jpeg"
}

def is_safe_filename(filename: str) -> Tuple[bool, Optional[str]]:
    """
    Validates that a file has a safe extension and is free from malicious path characters.
    """
    if not filename:
        return False, "Missing filename"
        
    lower = filename.lower()
    
    # Path traversal in filename
    if ".." in lower or "/" in lower or "\\" in lower:
        return False, "Dangerous filename contains directory traversal"
        
    # Check against known malware executable extensions
    for ext in DANGEROUS_EXTENSIONS:
        if lower.endswith(ext):
            return False, f"Prohibited executable or script extension: {ext}"
            
    # Check if matching allowed safe formats
    has_allowed = any(lower.endswith(ext) for ext in ALLOWED_DOCUMENT_EXTENSIONS)
    if not has_allowed:
        return False, "File format is not an authorized tender bidding document type"
        
    return True, None
