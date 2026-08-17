import fs from 'node:fs';
import path from 'node:path';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('Running Kosif v36.3 UI Regression Checks...');

// 1. Body scroll locking
const css = fs.readFileSync('public/v36-continuity.css', 'utf8');
assert(css.includes('body[data-kosif-dialog-open="1"]'), 'Body scroll lock dataset rule exists in v36-continuity.css');
assert(css.includes('overflow:hidden!important'), 'Body scroll lock sets overflow hidden');

// 2. Dialog scroll check
const continuityJs = fs.readFileSync('public/v36-continuity.js', 'utf8');
assert(continuityJs.includes('checkAnyOpenDialog'), 'checkAnyOpenDialog function exists in v36-continuity.js');
assert(continuityJs.includes('dataset.kosifDialogOpen'), 'Sets kosifDialogOpen attribute on body');

// 3. Reader auto-scroll inhibition when dialog open
const readerJs = fs.readFileSync('public/standards/reader-pro-v36.js', 'utf8');
assert(readerJs.includes('isDialogOpen()'), 'Reader Pro checks isDialogOpen() in tick()');

// 4. Progress safety timer
const html = fs.readFileSync('frontend/index.html', 'utf8');
assert(html.includes('KP_SAFETY_TIMER'), 'Progress safety timer KP_SAFETY_TIMER defined');

// 5. Throttled MutationObserver
const aiGateJs = fs.readFileSync('public/v36-ai-gate.js', 'utf8');
assert(aiGateJs.includes('requestAnimationFrame'), 'MutationObserver in v36-ai-gate.js uses requestAnimationFrame throttling');

const opsJs = fs.readFileSync('public/v36-operations.js', 'utf8');
assert(opsJs.includes('requestAnimationFrame'), 'MutationObserver in v36-operations.js uses requestAnimationFrame throttling');

console.log('KOSIF_UI_REGRESSIONS OK failures=0');
