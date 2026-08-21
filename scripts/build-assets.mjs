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

// Visual System v45 must also exist in the static/PWA build. Browser QA serves
// `public/` directly and therefore does not pass through suite-edge-v43. The
// lightweight v45 guard observes only new presentation styles in <head> and
// keeps the single v45 stylesheet last when historical v40/v41 runtimes inject
// their CSS after initial parsing.
html = applyVisualSystemV45(html);

// v46 introduces a namespaced enterprise token layer. It is intentionally
// additive: it exposes governed Deep Slate/Emerald/Sapphire variables to every
// first-class shell without overriding the validated v45 visual authority until
// each screen is migrated and passes visual regression.
html = applyEnterpriseTokensV46(html);

// `frontend/index.html` and `public/index.html` are the two canonical shell
// copies and the regression contract requires them to remain byte-identical.
fs.writeFileSync(source, html);
fs.writeFileSync(target, html);

// Other first-class static KOSIF shells receive the same presentation layers.
// Wealth is intentionally excluded because its original Mafateeh reader remains
// a preserved product surface with its own visual identity.
for (const shell of [
  'public/hub.html',
  'public/libraries/index.html',
  'public/sales/index.html',
  'public/standards/index.html'
]) {
  if (!fs.existsSync(shell)) continue;
  let shellHtml = fs.readFileSync(shell, 'utf8');
  shellHtml = applyVisualSystemV45(shellHtml);
  shellHtml = applyEnterpriseTokensV46(shellHtml);
  fs.writeFileSync(shell, shellHtml);
}

// Direct requested-book bootstrap. The historical 700ms delay visibly rendered
// the default Mafateeh book before switching to std2025/std2018/dipifr. Preserve
// the original shared reader shell, but perform the requested content switch in
// the next microtask so the first meaningful render belongs to the requested book.
const wealthLibrary = 'public/wealth-library-v37.js';
if (fs.existsSync(wealthLibrary)) {
  const src = fs.readFileSync(wealthLibrary, 'utf8');
  const delayed = "if(initialId!=='mafateeh')setTimeout(()=>switchBook(initialId),700);";
  const direct = "if(initialId!=='mafateeh')queueMicrotask(()=>switchBook(initialId));";
  if (src.includes(delayed)) fs.writeFileSync(wealthLibrary, src.replace(delayed, direct));
}

console.log('Kosif Native assets ready with Design Quality Stack v44 + Visual System v45 + Enterprise Tokens v46 + direct book bootstrap v45');
