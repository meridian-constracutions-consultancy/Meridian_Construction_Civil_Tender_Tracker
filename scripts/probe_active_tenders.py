import urllib.request
import ssl
import re
from urllib.parse import urljoin

ctx = ssl.create_default_context()
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

urls = [
    ('Rajasthan Active Tenders', 'https://eproc.rajasthan.gov.in/nicgep/app?page=FrontEndLatestActiveTenders&service=page'),
    ('CPPP Active Tenders', 'https://eprocure.gov.in/eprocure/app?page=FrontEndLatestActiveTenders&service=page')
]

for label, url in urls:
    print(f"=== Probing {label} ===")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            print(f"Status: {resp.status}, Length: {len(html)}")
            
            # Check for captcha
            has_captcha = 'captcha' in html.lower()
            print(f"Contains 'captcha': {has_captcha}")
            
            # Look for table data
            # GePNIC tables typically have id='table' or class 'list_table'
            tables = re.findall(r'<table[^>]*>[\s\S]*?</table>', html, re.IGNORECASE)
            print(f"Found {len(tables)} tables")
            
            # Find sample rows
            rows = re.findall(r'<tr[^>]*>([\s\S]*?)</tr>', html, re.IGNORECASE)
            print(f"Found {len(rows)} table rows")
            
            # Look for tender detail links or direct links
            tender_links = re.findall(r'href=[\'"]([^\'"]*component=%24DirectLink[^\'"]*)[\'"][^>]*>([\s\S]*?)</a>', html, re.IGNORECASE)
            print(f"Found {len(tender_links)} DirectLink tender links")
            for t_url, t_title in tender_links[:5]:
                clean_title = " ".join(re.sub(r'<[^>]+>', '', t_title).split())
                print(f"  * {clean_title} -> {urljoin(url, t_url)}")

    except Exception as e:
        print(f"Error: {e}")
    print()
