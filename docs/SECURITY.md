# Security Policy & Threat Mitigation

## 1. Threat Model & Design Controls

### A. Server-Side Request Forgery (SSRF) Defense
- **Allowlist Verification**: Outbound HTTP requests from collectors are strictly restricted to approved domains:
  - `eproc.rajasthan.gov.in`
  - `eprocure.gov.in`
- **DNS & IP Validation**:
  - Outbound hostnames are resolved before connection.
  - Prohibits all loopback (`127.0.0.0/8`), private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and reserved IP addresses.
  - Re-validates destinations across redirects.

### B. Spreadsheet Formula Injection Defense (CSV / Excel Injection / CWE-1236)
- **Cell Sanitization**:
  - Untrusted text from tender titles, references, organizations, or descriptions is cleansed before being written into CSV or Excel exports.
  - Values starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with a single quote (`'`), ensuring spreadsheet software (Excel, LibreOffice Calc) treats them exclusively as string literals.

### C. Cross-Site Scripting (XSS) & Content Security
- React's virtual DOM escapes all extracted tender content prior to rendering.
- Dangerous raw HTML from government descriptions is never injected via `dangerouslySetInnerHTML`.
- External document and notice links are rendered with `rel="noopener noreferrer"` and `target="_blank"`.
- Backend enforces security headers on all HTTP responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### D. Rate Limiting & Zero Bypass Principle
- Enforces polite, rate-limited polling (minimum 2 seconds between requests to the same portal).
- Respects portal HTTP response codes; backs off exponentially on 429 or 503.
- Complies with website access terms; **does not bypass, crack, or circumvent CAPTCHA**. All monitored data originates from permitted public feeds, announcements, closing date listings, and guest session tender notices.

### E. Untrusted Document File Handling
- Downloaded PDF and BOQ files are treated as untrusted binary input.
- File sizes are strictly bounded by `MAX_DOCUMENT_SIZE_BYTES` (default 25MB) to protect against decompression bombs.
- Document text is extracted safely in-memory using PyMuPDF before persistent database storage.

---

## 2. Practical Residual Risks
1. **Government Portal Maintenance Downtime**: NIC servers frequently undergo scheduled maintenance during late night hours (IST). The system handles this gracefully by marking the source status as `WARNING`, retaining historical data without loss, and automatically resuming when the portal comes back online.
2. **Session Token Invalidation**: GePNIC `JSESSIONID` tokens expire after inactivity. Collectors spawn fresh sessions for each scheduled run.
