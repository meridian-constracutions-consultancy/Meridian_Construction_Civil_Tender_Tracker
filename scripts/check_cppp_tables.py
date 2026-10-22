import httpx
from bs4 import BeautifulSoup

headers = {'User-Agent': 'Mozilla/5.0'}
with httpx.Client(verify=True, headers=headers, timeout=15) as client:
    r = client.get('https://eprocure.gov.in/eprocure/app')
    soup = BeautifulSoup(r.text, 'html.parser')
    for t in soup.find_all('table'):
        t_id = t.get('id')
        if t_id:
            links = t.find_all('a', href=lambda h: h and 'DirectLink' in h)
            print(f"CPPP Table id={t_id}: {len(links)} DirectLinks", flush=True)
            for l in links[:2]:
                print(f"   text='{l.get_text(separator=' ', strip=True)[:40]}' href='{l['href']}'", flush=True)
