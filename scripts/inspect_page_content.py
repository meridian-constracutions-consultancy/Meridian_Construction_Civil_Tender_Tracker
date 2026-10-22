import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}

url = 'https://eproc.rajasthan.gov.in/nicgep/app?page=FrontEndLatestActiveTenders&service=page'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

# Print form elements, inputs, and text content
print("--- Text lines mentioning captcha or table ---")
for line in html.split('\n'):
    if any(k in line.lower() for k in ['captcha', 'tender', 'action', 'form', '<th', 'class="list_table"']):
        print(line[:120].strip())
