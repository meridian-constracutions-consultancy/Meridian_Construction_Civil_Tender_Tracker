import pytest
from app.core.security import validate_outbound_url, sanitize_for_spreadsheet

def test_allowlisted_domains_pass():
    is_safe, error = validate_outbound_url("https://eproc.rajasthan.gov.in/nicgep/app")
    assert is_safe is True
    assert error is None

    is_safe, error = validate_outbound_url("https://eprocure.gov.in/eprocure/app")
    assert is_safe is True
    assert error is None

def test_unauthorized_domain_blocked():
    is_safe, error = validate_outbound_url("https://evil-attacker.com/steal-data")
    assert is_safe is False
    assert "not in the allowed source registry" in error

def test_localhost_and_internal_ips_blocked():
    is_safe, error = validate_outbound_url("http://127.0.0.1:8000/admin")
    assert is_safe is False

    is_safe, error = validate_outbound_url("http://localhost:5000")
    assert is_safe is False

    is_safe, error = validate_outbound_url("http://169.254.169.254/latest/meta-data")
    assert is_safe is False

def test_formula_injection_defense():
    # Dangerous formulas must be prefixed with single quote
    assert sanitize_for_spreadsheet("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_for_spreadsheet("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_for_spreadsheet("-1+2") == "'-1+2"
    assert sanitize_for_spreadsheet("@IMPORTXML(...)") == "'@IMPORTXML(...)"
    assert sanitize_for_spreadsheet("\tTAB_INJECT") == "'\tTAB_INJECT"
    
    # Safe text remains unchanged
    assert sanitize_for_spreadsheet("NIT 05 PWD Road Work") == "NIT 05 PWD Road Work"
    assert sanitize_for_spreadsheet(None) == ""
