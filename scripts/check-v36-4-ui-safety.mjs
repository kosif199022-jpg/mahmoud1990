import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const continuity = read('public/v36-continuity.js');
const reader = read('public/standards/reader-pro-v36.js');
const aiGate = read('public/v36-ai-gate.js');
const operations = read('public/v36-operations.js');

const checks = [
  ['iOS lock captures scrollY before a dialog mutates layout', /lockY=Math\.max\(0,Number\.isFinite\(preferredY\)\?preferredY:\(window\.scrollY\|\|document\.documentElement\.scrollTop\|\|0\)\)/.test(continuity)],
  ['iOS lock offsets the app shell by saved scrollY', /p\.style\.top=`-\$\{lockY\}px`/.test(continuity)],
  ['iOS unlock restores exact scrollY', /window\.scrollTo\(0,y\)/.test(continuity)],
  ['reader blocks auto-scroll while dialogs are open', /function autoBlocked\(\)/.test(reader) && /kosifDialogOpen/.test(reader)],
  ['AI gate observers stay scoped', /function watchScopedRoots\(\)/.test(aiGate) && !/observe\(document\.documentElement/.test(aiGate)],
  ['stalled progress has a safety timeout', /PROGRESS_STALE_MS=20000/.test(continuity) && /releaseStaleProgress/.test(continuity) && /watchProgressSafety/.test(continuity)],
  ['progress safety does not abort background work', !/AbortController|\.abort\(/.test(continuity)],
  ['operations observer is frame-coalesced', /requestAnimationFrame\(\(\)=>\{q=false;mount\(\);mountReference\(\)\}\)/.test(operations) && /observe\(document\.body\|\|document\.documentElement/.test(operations)],
  ['operations analytics remains present', /window\.KosifOperations/.test(operations)]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`UI safety regression check failed: ${failed} check(s).`);
  process.exit(1);
}
console.log('v36.4 UI safety regression checks passed.');
