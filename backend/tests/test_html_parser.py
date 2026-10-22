import pytest
from datetime import datetime
from app.services.extraction.html_parser import (
    parse_gepnic_date,
    parse_amount,
    parse_int,
    parse_bool,
    GePNICDetailParser
)

def test_parse_gepnic_dates():
    d1 = parse_gepnic_date("21-Oct-2026 12:00 PM")
    assert d1 == datetime(2026, 10, 21, 12, 0)

    d2 = parse_gepnic_date("27-Oct-2026 06:00 PM")
    assert d2 == datetime(2026, 10, 27, 18, 0)

    # Empty and NA handling
    assert parse_gepnic_date("NA") is None
    assert parse_gepnic_date("") is None
    assert parse_gepnic_date(None) is None

def test_parse_amount_currency():
    assert parse_amount("69,07,000") == 6907000.0
    assert parse_amount("₹ 1,38,140.50") == 138140.50
    assert parse_amount("&#8377; 1,000") == 1000.0
    assert parse_amount("NA") is None
    assert parse_amount("") is None

def test_parse_int_and_bool():
    assert parse_int("120") == 120
    assert parse_int("120 Days") == 120
    assert parse_int("NA") is None

    assert parse_bool("Yes") is True
    assert parse_bool("Allowed") is True
    assert parse_bool("No") is False
    assert parse_bool("Not Allowed") is False
    assert parse_bool("NA") is None

def test_html_detail_parsing_synthetic_fixture():
    sample_html = """
    <html><body>
    <table>
        <tr>
            <td class="td_caption">Tender Reference Number</td>
            <td class="td_field">NIT-2026-PWD-01</td>
        </tr>
        <tr>
            <td class="td_caption">Tender ID</td>
            <td class="td_field">2026_PWD_99999_1</td>
        </tr>
        <tr>
            <td class="td_caption">Title</td>
            <td class="td_field">Construction of 2-Lane Bypass Road in Kota</td>
        </tr>
        <tr>
            <td class="td_caption">Organisation Chain</td>
            <td class="td_field">Public Works Department||Chief Engineer||SE Kota</td>
        </tr>
        <tr>
            <td class="td_caption">Tender Value in &#8377;</td>
            <td class="td_field">1,25,00,000</td>
        </tr>
        <tr>
            <td class="td_caption">EMD Amount in &#8377;</td>
            <td class="td_field">2,50,000</td>
        </tr>
        <tr>
            <td class="td_caption">Published Date</td>
            <td class="td_field">15-Oct-2026 10:00 AM</td>
        </tr>
        <tr>
            <td class="td_caption">Bid Submission End Date</td>
            <td class="td_field">30-Oct-2026 05:00 PM</td>
        </tr>
        <tr>
            <td class="td_caption">Location</td>
            <td class="td_field">Kota</td>
        </tr>
        <tr>
            <td class="td_caption">Product Category</td>
            <td class="td_field">Civil Works</td>
        </tr>
    </table>
    <a href="/nicgep/app?component=DirectLink&page=FrontEndTenderDetails">Notice Inviting Tender (NIT.pdf)</a>
    </body></html>
    """

    parsed = GePNICDetailParser.parse_html(
        html_content=sample_html,
        original_url="https://eproc.rajasthan.gov.in/sample",
        portal_name="Rajasthan eProc"
    )

    assert parsed is not None
    assert parsed["tender_id"] == "2026_PWD_99999_1"
    assert parsed["reference_number"] == "NIT-2026-PWD-01"
    assert parsed["title"] == "Construction of 2-Lane Bypass Road in Kota"
    assert parsed["organization_name"] == "Public Works Department"
    assert parsed["department"] == "Chief Engineer"
    assert parsed["estimated_value"] == 12500000.0
    assert parsed["emd_amount"] == 250000.0
    assert parsed["published_date"] == datetime(2026, 10, 15, 10, 0)
    assert parsed["bid_submission_deadline"] == datetime(2026, 10, 30, 17, 0)
    assert parsed["location"] == "Kota"
    assert parsed["product_category"] == "Civil Works"
    assert len(parsed["documents"]) == 1
