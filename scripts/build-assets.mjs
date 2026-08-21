import fs from 'node:fs';

const source = 'frontend/index.html';
const target = 'public/index.html';
const cssHref = '/kosif-design-system-v44.css';
const jsSrc = '/kosif-design-system-v44.js';

let html = fs.readFileSync(source, 'utf8');

if (!html.includes('name="kosif-design-system"')) {
  html = html.replace('</head>', '  <meta name="kosif-design-system" content="v44">\n</head>');
}

if (!html.includes(cssHref)) {
  html = html.replace('</head>', `  <link rel="stylesheet" href="${cssHref}">\n</head>`);
}

if (!html.includes(jsSrc)) {
  html = html.replace('</body>', `  <script src="${jsSrc}" defer></script>\n</body>`);
}

// `frontend/index.html` and `public/index.html` are the two canonical shell
// copies and the regression contract requires them to remain byte-identical.
// The v44 design-stack transform therefore becomes canonical in both places,
// rather than mutating only the public build artifact and breaking deployment.
fs.writeFileSync(source, html);
fs.writeFileSync(target, html);
console.log('Kosif Native assets ready with Design Quality Stack v44');
