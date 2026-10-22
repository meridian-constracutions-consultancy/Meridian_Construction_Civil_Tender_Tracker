import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin

base_url = 'https://eprocure.gov.in/eprocure/app'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

with httpx.Client(verify=True, headers=headers, timeout=20.0, follow_redirects=True) as client:
    # 1. Fetch homepage to get session cookies and form hidden tokens
    r = client.get(base_url)
    soup = BeautifulSoup(r.text, 'html.parser')
    form = soup.find('form', id='tenderSearch')
    if not form:
        print("Form tenderSearch not found!")
        exit(1)
        
    action = form.get('action', '/eprocure/app')
    post_url = str(httpx.URL(base_url).join(action))
    
    # Extract all hidden inputs
    data = {}
    for inp in form.find_all('input'):
        name = inp.get('name')
        val = inp.get('value', '')
        if name:
            data[name] = val
            
    # Set the keyword
    data['SearchDescription'] = 'civil'
    data['Go'] = 'Go'
    
    print("Posting search for 'civil'...")
    resp = client.post(post_url, data=data)
    print("Response status:", resp.status_code, "URL:", resp.url)
    
    res_soup = BeautifulSoup(resp.text, 'html.parser')
    tbl = res_soup.find('table', id='table') or res_soup.find('table', class_=lambda c: c and 'list' in c.lower())
    
    links = []
    if tbl:
        for a in tbl.find_all('a', href=True):
            if 'DirectLink' in a['href']:
                links.append((a['href'], a.get_text(separator=' ', strip=True)))
    else:
        for a in res_soup.find_all('a', href=True):
            if 'DirectLink' in a['href']:
                links.append((a['href'], a.get_text(separator=' ', strip=True)))
                
    print(f"Found {len(links)} tenders from 'civil' keyword search!")
    for href, text in links[:8]:
        print(f"  * {text[:60]} -> {href[:60]}...")
