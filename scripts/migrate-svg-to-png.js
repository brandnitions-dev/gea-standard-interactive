/* One-off: point diagram assets at .png and drop fixed Notion widths */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const diagramSvgs = [
  '10.svg',
  '12.svg',
  '34.svg',
  'GEA_STANDARD_(1).svg',
  'GEA_STANDARD_(2).svg',
  'GEA_STANDARD_(3).svg',
  'GEA_STANDARD_(12).svg',
  'GEA_STANDARD_(22).svg',
  'GEA_STANDARD_(23).svg',
  'GEA_Standard_8_Dimensions.svg',
];

diagramSvgs.forEach((svg) => {
  const png = svg.replace(/\.svg$/i, '.png');
  html = html.split(`./assets/${svg}`).join(`./assets/${png}`);
});

html = html.replace(/style="width:(?:1440|1016|1024)px"/g, 'style="width:100%"');

fs.writeFileSync(htmlPath, html);
console.log('Updated index.html — diagram SVG → PNG, widths → 100%');
