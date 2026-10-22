import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin

base_url = 'https://eproc.rajasthan.gov.in/nicgep/app'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
with httpx.Client(verify=True, headers=headers, timeout=20.0, follow_redirects=True) as client:
    r = client.get(base_url)
    soup = BeautifulSoup(r.text, 'html.parser')
    active_tbl = soup.find('table', id='activeTenders')
    first_link = active_tbl.find('a', href=lambda h: h and 'DirectLink' in h)
    tender_url = str(httpx.URL(base_url).join(first_link['href']))
    print('Tender URL:', tender_url)
    dt_resp = client.get(tender_url)
    dt_soup = BeautifulSoup(dt_resp.text, 'html.parser')

    for a in dt_soup.find_all('a', href=True):
        href = a['href']
        text = a.get_text(separator=' ', strip=True)
        if any(term in href.lower() or term in text.lower() for term in ['doc', 'pdf', 'zip', 'download', 'notice', 'boq']):
            print(f'Doc link: text="{text}" href="{href}"')
            full_doc = urljoin(tender_url, href)
            if 'pdf' in text.lower() or 'docdownload' in href.lower() or 'zip' in text.lower():
                try:
                    doc_resp = client.get(full_doc)
                    ct = doc_resp.headers.get("content-type")
                    cd = doc_resp.headers.get("content-disposition")
                    print(f"   -> Result: status={doc_resp.status_code}, type={ct}, disp={cd}, size={len(doc_resp.content)}")
                except Exception as ex:
                    print(f"   -> Error fetching doc: {ex}")
