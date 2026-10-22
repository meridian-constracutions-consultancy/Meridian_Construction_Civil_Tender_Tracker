import urllib.request
import ssl
import re
from urllib.parse import urljoin
from http.cookiejar import CookieJar

cj = CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

base_url = 'https://eproc.rajasthan.gov.in/nicgep/app'
req = urllib.request.Request(base_url, headers=headers)
resp = opener.open(req, timeout=15)
home_html = resp.read().decode('utf-8', errors='ignore')

# Extract the first direct tender link
match = re.search(r'href=[\'"]([^\'"]*component=%24DirectLink[^\'"]*)[\'"][^>]*>(.*?)</a>', home_html, re.IGNORECASE)
if match:
    rel_url = match.group(1).replace('&amp;', '&')
    link_text = re.sub(r'<[^>]+>', '', match.group(2)).strip()
    full_url = urljoin(base_url, rel_url)
    print(f"Following tender link: {link_text}")
    print(f"URL: {full_url}")
    
    tender_req = urllib.request.Request(full_url, headers=headers)
    tender_resp = opener.open(tender_req, timeout=15)
    detail_html = tender_resp.read().decode('utf-8', errors='ignore')
    print(f"Detail page status: {tender_resp.status}, length: {len(detail_html)}")
    
    # Check fields in detail page
    for field in ['Tender Reference Number', 'Tender ID', 'Work Description', 'Tender Value in', 'EMD Amount in', 'Bid Submission End Date', 'Organisation Chain']:
        if field.lower() in detail_html.lower():
            print(f"  FOUND FIELD: {field}")
        else:
            print(f"  Missing field: {field}")
            
    # Check if any document links or tables exist
    doc_links = re.findall(r'href=[\'"]([^\'"]*(?:\.pdf|\.zip|DirectLink|tenderDocument)[^\'"]*)[\'"]', detail_html, re.IGNORECASE)
    print(f"  Found {len(doc_links)} document/download links")
    for dl in doc_links[:5]:
        print(f"    Doc link: {dl[:80]}")
else:
    print("No DirectLink found on home page")
