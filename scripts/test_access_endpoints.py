import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}

urls = [
    ('Rajasthan Home', 'https://eproc.rajasthan.gov.in/nicgep/app'),
    ('Rajasthan Closing Date', 'https://eproc.rajasthan.gov.in/nicgep/app?page=FrontEndListTendersbyDate&service=page'),
    ('Rajasthan Classification', 'https://eproc.rajasthan.gov.in/nicgep/app?page=FrontEndTendersByClassification&service=page'),
    ('Rajasthan RSS', 'https://eproc.rajasthan.gov.in/nicgep/rss'),
    ('CPPP Home', 'https://eprocure.gov.in/eprocure/app'),
    ('CPPP RSS', 'https://eprocure.gov.in/cppp/rss'),
    ('CPPP XML', 'https://eprocure.gov.in/cppp/latestactivetendersdata'),
    ('CPPP e-Publish XML', 'https://eprocure.gov.in/epublish/app?page=FrontEndLatestActiveTenders&service=page')
]

for label, url in urls:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            print(f"{label}: Status {resp.status}, Len {len(html)}")
            # Look for tender items or links
            items = re.findall(r'<tr[^>]*>.*?tender.*?</tr>', html, re.IGNORECASE | re.DOTALL)
            tlinks = re.findall(r'href=[\'"]([^\'"]*DirectLink[^\'"]*)[\'"][^>]*>(.*?)</a>', html, re.IGNORECASE)
            print(f"  Tender links found: {len(tlinks)}")
            for l_url, l_text in tlinks[:3]:
                clean = " ".join(re.sub(r'<[^>]+>', '', l_text).split())
                print(f"    * {clean} -> {l_url[:70]}")
    except Exception as e:
        print(f"{label}: Error -> {e}")
