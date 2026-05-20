const fs = require('fs');
const path = require('path');
const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const parts = h.split('<table');
const chunk = parts[4].split('</table>')[0];
console.log(chunk.slice(0, 2500));
