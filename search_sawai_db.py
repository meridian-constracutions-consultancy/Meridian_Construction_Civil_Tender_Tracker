import sqlite3

con = sqlite3.connect('tender_intelligence.db')
cur = con.cursor()
cur.execute("SELECT id, tender_id, title, published_date, bid_submission_deadline FROM tenders WHERE title LIKE '%Sawai%'")
rows = cur.fetchall()
print(f"Found {len(rows)} rows for Sawai:")
for r in rows:
    print(r)
con.close()

