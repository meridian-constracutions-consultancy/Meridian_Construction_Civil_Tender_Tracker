import httpx
from bs4 import BeautifulSoup

headers = {'User-Agent': 'Mozilla/5.0'}
with httpx.Client(verify=True, headers=headers) as client:
    r = client.get('https://eproc.rajasthan.gov.in/nicgep/app')
    soup = BeautifulSoup(r.text, 'html.parser')
    for a in soup.find_all('a', href=True):
        if 'DirectLink' in a['href']:
            table = a.find_parent('table')
            t_id = table.get('id') if table else None
            t_class = table.get('class') if table else None
            print(f"HREF: {a['href']} | TEXT: {a.get_text(separator=' ', strip=True)[:50]} | TABLE id={t_id} class={t_class}")
