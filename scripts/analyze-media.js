/* One-off analyzer — run: node scripts/analyze-media.js */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

const figRe = /<figure class="image" id="([^"]+)"[^>]*>[\s\S]*?<\/figure>/g;
let m;
const rows = [];
while ((m = figRe.exec(html))) {
  const block = m[0];
  const id = m[1];
  const start = m.index;
  const before = html.slice(Math.max(0, start - 1200), start);
  const after = html.slice(m.index + block.length, m.index + block.length + 2000);
  const h = [...before.matchAll(/<h[12][^>]*>([^<]{0,100})/g)].pop()?.[1]?.replace(/\s+/g, ' ').trim() || '?';
  const imgW = block.match(/width:\s*(\d+)px/)?.[1] || block.match(/width="(\d+)"/)?.[1] || '?';
  const src = block.match(/src="([^"]+)"/)?.[1] || '?';
  const beforeTags = (before.match(/<(p|ul|ol|h3|figure)/g) || []).slice(-8);
  const afterTags = (after.match(/<(p|ul|ol|h3|figure|table)/g) || []).slice(0, 10);
  const liBefore = (before.match(/<li/g) || []).length;
  const liAfter = (after.match(/<li/g) || []).length;
  const pAfter = (after.match(/<p/g) || []).length;
  const h3Before = (before.match(/<h3/g) || []).length;
  const h3After = (after.match(/<h3/g) || []).length;
  rows.push({ id, h: h.slice(0, 55), src: path.basename(src), imgW, h3Before, h3After, liBefore, liAfter, pAfter, beforeTags, afterTags });
}

console.log(JSON.stringify(rows, null, 2));
