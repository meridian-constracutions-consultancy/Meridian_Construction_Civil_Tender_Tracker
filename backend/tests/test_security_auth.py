import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import (
    hash_password,
    verify_password,
    create_jwt_token,
    verify_jwt_token,
    generate_api_key,
    verify_api_key,
    inspect_for_malicious_content,
    is_safe_filename,
    rate_limiter
)

client = TestClient(app)

def test_password_hashing():
    pwd = "StrongSecurePassword2026!"
    h, salt = hash_password(pwd)
    assert len(h) == 64
    assert len(salt) == 32
    assert verify_password(pwd, h, salt) is True
    assert verify_password("WrongPassword123", h, salt) is False

def test_jwt_tokens():
    claims = {"sub": "usr_9988", "username": "security_officer", "role": "admin"}
    token = create_jwt_token(claims, expires_minutes=10)
    decoded = verify_jwt_token(token)
    assert decoded is not None
    assert decoded["sub"] == "usr_9988"
    assert decoded["role"] == "admin"
    assert decoded["username"] == "security_officer"

    # Expired token test
    expired_token = create_jwt_token(claims, expires_minutes=-5)
    assert verify_jwt_token(expired_token) is None

def test_api_key_security():
    raw_key, prefix, hashed = generate_api_key()
    assert raw_key.startswith("ct_")
    assert prefix in raw_key
    assert verify_api_key(raw_key, hashed) is True
    assert verify_api_key("ct_invalid_fake_key", hashed) is False

def test_waf_malicious_pattern_detection():
    # SQL Injection
    assert inspect_for_malicious_content("SELECT * FROM users") is not None
    assert inspect_for_malicious_content("1' OR '1'='1") is not None
    assert inspect_for_malicious_content("UNION SELECT id, password FROM users") is not None
    
    # XSS
    assert inspect_for_malicious_content("<script>document.cookie</script>") is not None
    assert inspect_for_malicious_content("javascript:alert(1)") is not None
    
    # Path Traversal
    assert inspect_for_malicious_content("../../etc/passwd") is not None
    assert inspect_for_malicious_content("..\\windows\\win.ini") is not None

    # Benign Civil Tender Queries
    assert inspect_for_malicious_content("civil road construction in Kota") is None
    assert inspect_for_malicious_content("building repair PWD Jaipur") is None

def test_malware_file_rejection():
    safe_pdf, _ = is_safe_filename("tender_specification.pdf")
    safe_xls, _ = is_safe_filename("boq_schedule.xlsx")
    safe_zip, _ = is_safe_filename("drawings.zip")
    assert safe_pdf is True
    assert safe_xls is True
    assert safe_zip is True

    danger_exe, reason_exe = is_safe_filename("installer.exe")
    danger_bat, _ = is_safe_filename("script.bat")
    danger_ps1, _ = is_safe_filename("payload.ps1")
    danger_sh, _ = is_safe_filename("hack.sh")
    assert danger_exe is False
    assert "executable" in reason_exe.lower()
    assert danger_bat is False
    assert danger_ps1 is False
    assert danger_sh is False

def test_api_auth_login_and_me_flow():
    # Admin Login
    response = client.post(
        "/api/auth/login",
        json={"username_or_email": "admin", "password": "Admin@Civil2026!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "admin"
    token = data["access_token"]

    # Access Protected Profile
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "admin"

def test_waf_blocking_live_attack_requests():
    rate_limiter._history.clear()
    rate_limiter._blocked_ips.clear()

    # SQL Injection via search query
    res_sqli = client.get("/api/tenders?search=UNION%20SELECT%20*%20FROM%20users")
    assert res_sqli.status_code == 403
    assert "Malicious pattern detected" in res_sqli.json()["detail"]

    # XSS via query
    res_xss = client.get("/api/tenders?search=%3Cscript%3Ealert(1)%3C/script%3E")
    assert res_xss.status_code == 403
    assert "Malicious pattern detected" in res_xss.json()["detail"]

    # Path traversal via query
    res_trav = client.get("/api/tenders?file=../../etc/passwd")
    assert res_trav.status_code == 403
    assert "Malicious pattern detected" in res_trav.json()["detail"]

def test_security_status_telemetry():
    rate_limiter._history.clear()
    rate_limiter._blocked_ips.clear()
    res = client.get("/api/auth/security-status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ARMED_AND_ACTIVE"
    assert len(data["protections_active"]) >= 8
    assert "client_ip" in data
