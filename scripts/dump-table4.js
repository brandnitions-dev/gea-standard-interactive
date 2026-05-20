const fs = require('fs');
const h = fs.readFileSync('../index.html', 'utf8');
const parts = h.split('<table');
const chunk = parts[4].split('</table>')[0];
const idx = chunk.indexOf('Strategic Planning');
console.log(chunk.slice(idx - 100, idx + 400));
