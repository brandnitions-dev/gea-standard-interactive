/**
 * Replace Notion <a> inside <table> blocks with plain <span class="gea-table-text">.
 */
const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const linkRe = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;

let count = 0;
const tableRe = /<table\b[\s\S]*?<\/table>/gi;

html = html.replace(tableRe, (block) => {
  return block.replace(linkRe, (_m, inner) => {
    count += 1;
    return `<span class="gea-table-text">${inner}</span>`;
  });
});

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Stripped', count, 'Notion links inside tables');

const left = (html.match(/notion\.so/gi) || []).length;
console.log('notion.so remaining in file:', left);
