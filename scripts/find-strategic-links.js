const fs = require('fs');
const h = fs.readFileSync('../index.html', 'utf8');
const terms = [
  'Idea Generation and Implementation',
  'Innovation-Driven Strategic Planning',
];
for (const t of terms) {
  const i = h.indexOf(t);
  console.log('\n===', t, '===');
  console.log(h.slice(i - 250, i + 100));
}
