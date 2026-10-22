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

match = re.search(r'href=[\'"]([^\'"]*component=%24DirectLink[^\'"]*)[\'"][^>]*>(.*?)</a>', home_html, re.IGNORECASE)
if match:
    rel_url = match.group(1).replace('&amp;', '&')
    tender_req = urllib.request.Request(urljoin(base_url, rel_url), headers=headers)
    detail_html = opener.open(tender_req, timeout=15).read().decode('utf-8', errors='ignore')
    
    # Save a snippet of the tables
    print("=== Table Key-Values in Detail Page ===")
    # GePNIC detail pages use td_caption and td_field or td_style classes
    pairs = re.findall(r'<td[^>]*class=[\'"][^\'"]*caption[^\'"]*[\'"][^>]*>([\s\S]*?)</td>[\s\S]*?<td[^>]*class=[\'"][^\'"]*field[^\'"]*[\'"][^>]*>([\s\S]*?)</td>', detail_html, re.IGNORECASE)
    for k, v in pairs:
        clean_k = " ".join(re.sub(r'<[^>]+>', '', k).split()).strip(': ')
        clean_v = " ".join(re.sub(r'<[^>]+>', '', v).split()).strip()
        print(f"  {clean_k}: {clean_v}")
        
    print(f"\nTotal Caption-Field pairs extracted: {len(pairs)}")
