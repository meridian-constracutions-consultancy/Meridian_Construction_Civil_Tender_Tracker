console.log("30-09-2026:", new Date('30-09-2026'));
console.log("30-Sep-2026 06:55 PM:", new Date('30-Sep-2026 06:55 PM'));
console.log("2026-09-30 18:55:00:", new Date('2026-09-30 18:55:00'));
console.log("2026-09-30T18:55:00:", new Date('2026-09-30T18:55:00'));
console.log("2026-10-30T13:12:00:", new Date('2026-10-30T13:12:00'));

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function format(dStr) {
  const d = new Date(dStr);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day.toString().padStart(2, '0')}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

console.log("Formatted 2026-09-30T18:55:00 ->", format('2026-09-30T18:55:00'));

