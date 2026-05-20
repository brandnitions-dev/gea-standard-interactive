const fs = require('fs');
const h = fs.readFileSync('../index.html', 'utf8');
const parts = h.split('<table');
for (let i = 1; i < parts.length; i++) {
  const chunk = parts[i].split('</table>')[0];
  if (!chunk.includes('Strategic Planning Process') && !chunk.includes('Strategic Goals')) continue;
  console.log('\n--- table', i, '---');
  const links = [...chunk.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)];
  console.log('anchors:', links.length);
  links.slice(0, 8).forEach((m) => {
    const href = (m[0].match(/href="([^"]*)"/) || [])[1] || '';
    const text = m[1].replace(/<[^>]+>/g, '').trim().slice(0, 60);
    console.log(href.slice(0, 80), '|', text);
  });
  const spans = (chunk.match(/gea-table-text/g) || []).length;
  console.log('gea-table-text spans:', spans);
}
