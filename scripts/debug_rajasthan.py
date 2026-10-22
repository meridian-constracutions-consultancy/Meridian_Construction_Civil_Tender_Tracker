import httpx
from bs4 import BeautifulSoup
from app.services.extraction.html_parser import GePNICDetailParser

base_url = 'https://eproc.rajasthan.gov.in/nicgep/app'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}

with httpx.Client(verify=True, follow_redirects=True, timeout=20.0, headers=headers) as client:
    r = client.get(base_url)
    soup = BeautifulSoup(r.text, 'html.parser')
    links = []
    for a in soup.find_all('a', href=True):
        if 'DirectLink' in a['href']:
            links.append((a['href'], a.get_text(separator=' ', strip=True)))
    print(f"Found {len(links)} DirectLinks on Home")

    r2 = client.get('https://eproc.rajasthan.gov.in/nicgep/app?page=FrontEndListTendersbyDate&service=page')
    soup2 = BeautifulSoup(r2.text, 'html.parser')
    for a in soup2.find_all('a', href=True):
        if 'DirectLink' in a['href']:
            links.append((a['href'], a.get_text(separator=' ', strip=True)))
    print(f"Total DirectLinks: {len(links)}")

    for href, text in links[:10]:
        full_url = str(httpx.URL(base_url).join(href))
        dt_resp = client.get(full_url)
        parsed = GePNICDetailParser.parse_html(dt_resp.text, full_url, 'Rajasthan')
        if parsed:
            tid = parsed.get("tender_id")
            val = parsed.get("estimated_value")
            emd = parsed.get("emd_amount")
            pub = parsed.get("published_date")
            print(f"ID: {tid} | Val: {val} | EMD: {emd} | Pub: {pub} | Title: {parsed.get('title')[:40]}")
            if val is None or emd is None or pub is None:
                # Let's inspect all keys extracted!
                soup_dt = BeautifulSoup(dt_resp.text, 'html.parser')
                caption_cells = soup_dt.find_all("td", class_=lambda c: c and 'caption' in c.lower())
                print(f"  --> Caption cells count: {len(caption_cells)}")
                for cap in caption_cells[:15]:
                    v_td = cap.find_next_sibling("td")
                    val_text = v_td.get_text(strip=True) if v_td else "None"
                    print(f"      CAPTION: '{cap.get_text(strip=True)}' => '{val_text[:30]}'")
                # Also save HTML snippet if RJ-11 or None
                with open(f"scripts/tender_{tid}.html", "w", encoding="utf-8") as f:
                    f.write(dt_resp.text)
                print(f"  Saved HTML to scripts/tender_{tid}.html")
