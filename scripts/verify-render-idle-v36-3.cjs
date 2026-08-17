/* Runtime regression probe: the app must go quiet when it is idle.
 *
 * Confirmed bug: client modules observed a container for childList and wrote into that
 * same container from the callback, so each pass re-armed its own observer and the UI
 * re-rendered at frame rate forever. An idle tab produced 65,716 DOM mutations per three
 * seconds — permanently, not just during startup — which is a real battery and jank cost
 * on the phones this app targets.
 *
 * A static gate can only assert that the guards are still written. This one measures the
 * property that actually matters, so a new module reintroducing the pattern is caught
 * even if it does it a way no regex anticipated.
 *
 * Usage: KOSIF_TEST_URL=http://127.0.0.1:8787 node scripts/verify-render-idle-v36-3.cjs
 */
const { chromium } = require('playwright');

const base = process.env.KOSIF_TEST_URL || 'http://127.0.0.1:8787';
/* Steady state should be zero. The allowance allows for a stray timer tick without
 * letting a real loop (which runs three to four orders of magnitude above this) pass. */
const IDLE_BUDGET = Number(process.env.KOSIF_IDLE_MUTATION_BUDGET || 60);
/* Bootstrap legitimately mutates the DOM while modules mount. */
const BOOT_BUDGET = Number(process.env.KOSIF_BOOT_MUTATION_BUDGET || 4000);

const fail = (m, x) => { throw new Error(m + (x !== undefined ? ' ' + JSON.stringify(x) : '')); };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(base + '/?cb=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('body.kosif-ready', { timeout: 15000 });

  /* Counts every mutation in the document for a fixed window, with a breakdown so a
   * failure names the element that is churning rather than just a number. */
  const sample = (waitFirst, ms) =>
    page.evaluate(async ([w, d]) => {
      await new Promise((r) => setTimeout(r, w));
      let n = 0; const byTarget = {};
      const mo = new MutationObserver((recs) => {
        for (const r of recs) {
          n++;
          let t = r.target; if (t.nodeType === 3) t = t.parentElement || t;
          const k = (t.id ? '#' + t.id : (t.nodeType === 1 ? t.tagName : 'text')) + '/' + r.type;
          byTarget[k] = (byTarget[k] || 0) + 1;
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      await new Promise((r) => setTimeout(r, d));
      mo.disconnect();
      return { n, top: Object.entries(byTarget).sort((a, b) => b[1] - a[1]).slice(0, 6) };
    }, [waitFirst, ms]);

  const boot = await sample(500, 3000);
  console.log('BOOT_WINDOW', JSON.stringify(boot));
  if (boot.n > BOOT_BUDGET) fail('startup DOM churn above budget', { got: boot.n, budget: BOOT_BUDGET, top: boot.top });

  /* Every bootstrap poll in the client is bounded to at most ~20s, so by t≈25s the app
   * must be completely still. */
  const idle = await sample(18000, 3000);
  console.log('IDLE_WINDOW', JSON.stringify(idle));
  if (idle.n > IDLE_BUDGET) fail('idle DOM churn above budget — a render loop is running', { got: idle.n, budget: IDLE_BUDGET, top: idle.top });

  /* A loop this cheap to reintroduce should also be caught if it only wakes on
   * interaction, so exercise a view switch and re-measure. */
  await page.click('[data-kgo="tb"]').catch(() => {});
  await page.waitForTimeout(400);
  const afterNav = await sample(1200, 2000);
  console.log('AFTER_NAV_WINDOW', JSON.stringify(afterNav));
  if (afterNav.n > IDLE_BUDGET) fail('DOM churn after navigation settles above budget', { got: afterNav.n, budget: IDLE_BUDGET, top: afterNav.top });

  if (errors.length) fail('page errors', errors);

  await context.close();
  await browser.close();
  console.log('KOSIF_RENDER_IDLE_OK', JSON.stringify({ boot: boot.n, idle: idle.n, afterNav: afterNav.n, idleBudget: IDLE_BUDGET }));
})().catch(async (e) => { console.error(e.stack || e); process.exit(2); });
