const fs = require('fs');
const path = require('path');
const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const parts = h.split('<table');
const allInTable = [];
for (let i = 1; i < parts.length; i++) {
  const chunk = parts[i].split('</table>')[0];
  for (const m of chunk.matchAll(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    allInTable.push({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim().slice(0, 80) });
  }
}
console.log('links in tables:', allInTable.length);
allInTable.slice(0, 15).forEach((x) => console.log(x.href.slice(0, 90), '|', x.text));
console.log('gea-table-text count:', (h.match(/gea-table-text/g) || []).length);
console.log('Strategic Planning Process:', h.includes('Strategic Planning Process'));
if (h.includes('Strategic Planning Process')) {
  const idx = h.indexOf('Strategic Planning Process');
  console.log(h.slice(idx - 120, idx + 80));
}
