import urllib.request
import ssl
import re
from urllib.parse import urljoin

ctx = ssl.create_default_context()
# GePNIC portals sometimes have legacy SSL cipher suites or strict user agent checks
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

portals = [
    ('Rajasthan', 'https://eproc.rajasthan.gov.in/nicgep/app'),
    ('CPPP', 'https://eprocure.gov.in/eprocure/app')
]

for name, base_url in portals:
    print(f"=== Probing {name} ({base_url}) ===")
    try:
        req = urllib.request.Request(base_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            print(f"HTTP Status: {resp.status}, Content Length: {len(html)}")
            
            # Find relevant links
            matches = re.findall(r'href=[\'"]([^\'"]+)[\'"][^>]*>([\s\S]*?)</a>', html, re.IGNORECASE)
            print(f"Total links found: {len(matches)}")
            print("Key Tender Navigation Links:")
            found_keys = set()
            for href, text in matches:
                clean_text = " ".join(re.sub(r'<[^>]+>', '', text).split())
                target_url = urljoin(base_url, href)
                lower_text = clean_text.lower()
                lower_href = href.lower()
                if any(w in lower_text or w in lower_href for w in ['tender', 'active', 'closing', 'corrigend', 'latest', 'search', 'location', 'organisation', 'classification']):
                    if clean_text and clean_text not in found_keys:
                        found_keys.add(clean_text)
                        print(f"  * [{clean_text}] -> {target_url}")
    except Exception as e:
        print(f"Error accessing {name}: {e}")
    print()
