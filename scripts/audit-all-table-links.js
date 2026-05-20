const fs = require('fs');
const h = fs.readFileSync('../index.html', 'utf8');
const parts = h.split('<table');
let total = 0;
for (let i = 1; i < parts.length; i++) {
  const chunk = parts[i].split('</table>')[0];
  const links = [...chunk.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  if (links.length) {
    console.log('\nTABLE', i, 'links:', links.length);
    links.forEach((m) => {
      console.log(' ', m[1].slice(0, 100), '|', m[2].replace(/<[^>]+>/g, '').trim().slice(0, 50));
    });
    total += links.length;
  }
}
console.log('\nTOTAL table links:', total);
