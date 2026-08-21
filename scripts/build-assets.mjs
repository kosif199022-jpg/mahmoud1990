import fs from 'node:fs';

const source = 'frontend/index.html';
const target = 'public/index.html';
const cssHref = '/kosif-design-system-v44.css';
const jsSrc = '/kosif-design-system-v44.js';
const visualCssHref = '/kosif-visual-system-v45.css?v=2026.08.21-2';
const visualJsSrc = '/kosif-visual-system-v45.js?v=2026.08.21-1';
const enterpriseTokensHref = '/kosif-enterprise-tokens-v46.css';

function applyVisualSystemV45(sourceHtml) {
  let output = sourceHtml;
  if (!output.includes('data-kosif-visual-system="v45"')) {
    output = output.replace(/<html\b/, '<html data-kosif-visual-system="v45"');
  }
  if (!output.includes(visualCssHref)) {
    output = output.replace('</head>', `  <link rel="stylesheet" id="kosif-visual-system-v45" href="${visualCssHref}">\n</head>`);
  }
  if (!output.includes(visualJsSrc)) {
    output = output.replace('</head>', `  <script id="kosif-visual-system-v45-guard" src="${visualJsSrc}" defer></script>\n</head>`);
  }
  return output;
}

function applyEnterpriseTokensV46(sourceHtml) {
  let output = sourceHtml;
  if (!output.includes('data-kosif-enterprise-tokens="v46"')) {
    output = output.replace(/<html\b/, '<html data-kosif-enterprise-tokens="v46"');
  }
  if (!output.includes(enterpriseTokensHref)) {
    output = output.replace('</head>', `  <link rel="stylesheet" id="kosif-enterprise-tokens-v46" href="${enterpriseTokensHref}">\n</head>`);
  }
  return output;
}

function applyAccessibilityV46(sourceHtml, shell) {
  let output = sourceHtml;
  if (shell.endsWith('/standards/index.html')) {
    output = output.replace(
      'content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1"',
      'content="width=device-width,initial-scale=1,viewport-fit=cover"',
    );
    output = output.replace(
      '<input type="range" id="rgFs" min="15" max="30" step="1">',
      '<input type="range" id="rgFs" min="15" max="30" step="1" aria-label="حجم النص">',
    );
    output = output.replace(
      '<input type="range" id="rgLh" min="16" max="26" step="1">',
      '<input type="range" id="rgLh" min="16" max="26" step="1" aria-label="تباعد الأسطر">',
    );
    output = output.replace(
      '<input id="q" type="search" placeholder="اكتب كلمة أو رقم فقرة…" autocomplete="off">',
      '<input id="q" type="search" placeholder="اكتب كلمة أو رقم فقرة…" autocomplete="off" aria-label="بحث في الكتاب">',
    );
  }
  return output;
}

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

html = applyVisualSystemV45(html);
html = applyEnterpriseTokensV46(html);

fs.writeFileSync(source, html);
fs.writeFileSync(target, html);

for (const shell of [
  'public/hub.html',
  'public/libraries/index.html',
  'public/sales/index.html',
  'public/standards/index.html'
]) {
  if (!fs.existsSync(shell)) continue;
  let shellHtml = fs.readFileSync(shell, 'utf8');
  shellHtml = applyAccessibilityV46(shellHtml, shell);
  shellHtml = applyVisualSystemV45(shellHtml);
  shellHtml = applyEnterpriseTokensV46(shellHtml);
  fs.writeFileSync(shell, shellHtml);
}

const wealthLibrary = 'public/wealth-library-v37.js';
if (fs.existsSync(wealthLibrary)) {
  const src = fs.readFileSync(wealthLibrary, 'utf8');
  const delayed = "if(initialId!=='mafateeh')setTimeout(()=>switchBook(initialId),700);";
  const direct = "if(initialId!=='mafateeh')queueMicrotask(()=>switchBook(initialId));";
  if (src.includes(delayed)) fs.writeFileSync(wealthLibrary, src.replace(delayed, direct));
}

console.log('Kosif Native assets ready with Design Quality Stack v44 + Visual System v45 + Enterprise Tokens v46 + accessibility normalization + direct book bootstrap v45');
