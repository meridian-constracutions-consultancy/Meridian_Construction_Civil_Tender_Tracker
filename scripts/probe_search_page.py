import httpx
from bs4 import BeautifulSoup

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
with httpx.Client(verify=True, headers=headers, timeout=20.0, follow_redirects=True) as client:
    r = client.get('https://eprocure.gov.in/eprocure/app')
    soup = BeautifulSoup(r.text, 'html.parser')
    for a in soup.find_all('a', href=True):
        txt = a.get_text(separator=' ', strip=True).lower()
        if any(w in txt for w in ['search', 'keyword', 'classification', 'active', 'tender']):
            print(f"Link: {a.get_text(separator=' ', strip=True)} -> {a['href']}")
    
    print("\n--- FORMS ON HOME ---")
    for f in soup.find_all('form'):
        print(f"Form id={f.get('id')} action={f.get('action')} method={f.get('method')}")
        for inp in f.find_all(['input', 'select']):
            print(f"   input: name={inp.get('name')} type={inp.get('type')} value={inp.get('value')}")
