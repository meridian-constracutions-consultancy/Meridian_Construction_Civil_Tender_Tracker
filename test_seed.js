const fs = require('fs');
const data = JSON.parse(fs.readFileSync('backend/app/db/seed_tenders.json', 'utf8'));

console.log("Total seed items:", data.length);
const matches = data.filter(t => {
  return JSON.stringify(t).includes('602373') || JSON.stringify(t).includes('18:55') || JSON.stringify(t).includes('Sawai');
});

matches.forEach(m => {
  console.log("ID:", m.tender_id);
  console.log("Pub:", m.published_date, m.published_date_raw);
  console.log("Closing:", m.bid_submission_deadline);
  console.log("Val:", m.estimated_value);
  console.log("EMD:", m.emd_amount);
});

