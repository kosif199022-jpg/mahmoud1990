/* Regression gate: self-triggering render loops and broad document observers.
 *
 * Confirmed bug this pins down: several client modules observed a container for
 * `childList` and then wrote into that same container from the callback. Assigning
 * `textContent` replaces the element's child text node, which is itself a childList
 * mutation, so each pass re-armed the observer and the module re-rendered at frame rate
 * forever. Measured in an idle tab at 65,716 DOM mutations per three seconds — and it
 * did not subside, because the bounded bootstrap timers were never the cause.
 *
 * The fix is idempotence: write only when the value actually changes, so the first pass
 * settles the DOM and every later pass is a no-op that produces no mutation. This gate
 * asserts the guards stay in place, and that no client module reintroduces the
 * whole-document subtree observer that §18 of the master requirements forbids.
 *
 * Runtime counterpart: scripts/verify-render-idle-v36-3.cjs
 */
import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
const ok = (label, cond, detail) => {
  if (cond) return;
  failures++;
  console.error(`- ❌ ${label}${detail ? ' — ' + detail : ''}`);
};

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

/* ── 1. no whole-document subtree observers in client modules ─────────────── */
/* The main workspace client and index shell were already covered by the v36.3
 * contract; these are the module files that were not, and that is exactly where two
 * of them had survived. */
const CLIENT_DIR = 'public';
const clientFiles = fs
  .readdirSync(CLIENT_DIR)
  .filter((f) => f.endsWith('.js'))
  .map((f) => path.join(CLIENT_DIR, f));

const BROAD = /\.observe\(\s*document\.documentElement\s*,\s*\{[^}]*subtree\s*:\s*true/;
for (const f of clientFiles) {
  ok(`${f}: no whole-document subtree observer`, !BROAD.test(read(f)));
}

/* ── 2. idempotence guards on the writers that closed the loops ───────────── */
const continuity = read('public/v36-continuity.js');
ok('continuity defines an idempotent text writer', /function setText\(/.test(continuity));
ok(
  'continuity routes its render writes through the guard',
  /setText\(/.test(continuity) && !/\bhelp\.textContent\s*=/.test(continuity),
  'a raw textContent assignment in the mountWatcher path re-arms the observer'
);

const history = read('public/v36-history-restore.js');
ok(
  'translateNode writes a text node only on change',
  /if\(n\.nodeValue!==next\)n\.nodeValue=next/.test(history),
  'unconditional nodeValue writes produced tens of thousands of characterData mutations per second'
);
ok(
  'language badge is written only on change',
  /badge\.textContent!==badgeText/.test(history)
);
ok(
  'entity panel is written only on change',
  /host\.innerHTML!==html/.test(history) && /host\.className!==cls/.test(history)
);

const council = read('public/v36-council-v2.js');
ok('council context is written only on change', /el\.innerHTML!==html/.test(council));

/* ── 3. the per-frame class sweep is bounded to elements that need it ─────── */
/* Re-adding `kosif-tilt` to every card on every pass cost ~11,500 redundant DOM
 * operations per three seconds. The :not() form makes a settled pass match nothing. */
for (const shell of ['public/index.html', 'frontend/index.html']) {
  const s = read(shell);
  ok(
    `${shell}: tilt sweep skips elements that already have the class`,
    !/querySelectorAll\('\.card,\.kpi,\.step,\.std-card'\)\.forEach\(x=>x\.classList\.add\('kosif-tilt'\)\)/.test(s) &&
      /\.card:not\(\.kosif-tilt\)/.test(s)
  );
}

/* ── 4. bootstrap polls must be able to stop ──────────────────────────────── */
/* A poll that always runs its full iteration count keeps waking the main thread even
 * after its target exists. Each of these stops as soon as its mount succeeds. */
const gate = read('public/v36-ai-gate.js');
ok(
  'AI gate bootstrap poll stops once the button is mounted',
  /addButton\(\)\|\|\+\+n>/.test(gate),
  'the poll previously ran all 100 iterations unconditionally'
);
ok(
  'AI gate observer filters to relevant nodes',
  /function relevantNode\(/.test(gate) && /requestAnimationFrame\(flush\)/.test(gate)
);

const ops = read('public/v36-operations.js');
ok(
  'operations observer disconnects once both cards are mounted',
  /mo\.disconnect\(\)/.test(ops) && /const mounted=\(\)=>/.test(ops)
);

if (failures) {
  console.error(`KOSIF_RENDER_LOOP_CHECK_FAILED (${failures})`);
  process.exit(2);
}
console.log(
  'KOSIF_RENDER_LOOP_CHECK_OK',
  JSON.stringify({ clientModulesScanned: clientFiles.length })
);
