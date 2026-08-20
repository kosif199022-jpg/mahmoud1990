const { chromium, webkit } = require('playwright');

const BASE = process.env.KOSIF_TEST_URL || 'http://127.0.0.1:8788';
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

const ROUTES = [
  ['/', 'work'],
  ['/audit/', 'work'],
  ['/libraries/', 'library'],
  ['/sales/', 'sales'],
  ['/standards/', 'standards']
];

async function verifyRoute(page, path, domain, label, mobile) {
  const errors = [];
  const onPageError = error => errors.push(String(error.stack || error));
  const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  await page.goto(`${BASE}${path}?visual-runtime=${encodeURIComponent(label)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    document.documentElement.dataset.kosifEdition === 'v41' &&
    document.documentElement.dataset.kosifRevision === 'v41.2' &&
    document.getElementById('k41-scroll-progress')
  ), null, { timeout: 15000 });
  await pause(650);

  const state = await page.evaluate(isMobile => {
    const root = document.documentElement;
    const body = document.body;
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const headings = [...document.querySelectorAll('h1,h2')].filter(visible);
    const hiddenReveals = [...document.querySelectorAll('[data-k41-reveal]')]
      .filter(element => visible(element) && Number(getComputedStyle(element).opacity) < .5);
    const inputs = [...document.querySelectorAll('input,select,textarea')].filter(visible);
    const progress = document.getElementById('k41-scroll-progress');
    return {
      domain: root.dataset.kosifDomain,
      revision: root.dataset.kosifRevision,
      font: getComputedStyle(body).fontFamily,
      lineHeight: parseFloat(getComputedStyle(body).lineHeight),
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      heading: headings[0]?.textContent?.replace(/\s+/g, ' ').trim() || '',
      hiddenReveals: hiddenReveals.map(element => ({
        tag: element.tagName,
        id: element.id || '',
        className: String(element.className || '').slice(0, 120),
        view: element.closest('section[data-view]')?.dataset.view || '',
        opacity: getComputedStyle(element).opacity
      })),
      progressVisible: visible(progress),
      progressWidth: progress?.getBoundingClientRect().width || 0,
      accent: getComputedStyle(root).getPropertyValue('--k41-accent').trim(),
      bodyLocked: body.dataset.kosifDialogOpen === '1' || getComputedStyle(body).position === 'fixed',
      smallInputCount: isMobile ? inputs.filter(element => parseFloat(getComputedStyle(element).fontSize) < 16).length : 0
    };
  }, mobile);

  fail(state.revision === 'v41.2', `${label}:${path} wrong visual revision`);
  fail(state.domain === domain, `${label}:${path} wrong functional accent domain ${state.domain}`);
  fail(/KOSIF Alexandria/i.test(state.font), `${label}:${path} local Arabic font is not authoritative`);
  fail(Number.isFinite(state.lineHeight) && state.lineHeight >= 24, `${label}:${path} Arabic line height is cramped`);
  fail(state.horizontalOverflow <= 1, `${label}:${path} horizontal overflow ${state.horizontalOverflow}px`);
  fail(Boolean(state.heading), `${label}:${path} has no visible editorial heading`);
  fail(state.hiddenReveals.length === 0, `${label}:${path} cinematic reveal hid surfaces ${JSON.stringify(state.hiddenReveals)}`);
  fail(state.progressVisible && state.progressWidth > 100, `${label}:${path} reading progress is missing`);
  fail(Boolean(state.accent), `${label}:${path} functional accent token is missing`);
  fail(!state.bodyLocked, `${label}:${path} opened with the document scroll locked`);
  fail(state.smallInputCount === 0, `${label}:${path} has inputs below 16px on mobile Safari`);
  fail(!errors.some(error => /ReferenceError|TypeError|SyntaxError|Kosif boot error/i.test(error)), `${label}:${path} runtime errors\n${errors.join('\n')}`);

  page.off('pageerror', onPageError);
  page.off('console', onConsole);
}

async function verifyRoutes(engine, label, options) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext(options);
  const page = await context.newPage();
  for (const [path, domain] of ROUTES) await verifyRoute(page, path, domain, label, Boolean(options.isMobile));
  await browser.close();
  console.log(`KOSIF_VISUAL_ROUTES_${label.toUpperCase().replace(/\W/g, '_')}_OK`);
}

async function verifyOriginalReader() {
  const browser = await webkit.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ar-SA' });
  await page.goto(`${BASE}/wealth/reader.html?book=mafateeh&visual-runtime=reader`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__KOSIF_WEALTH_LIBRARY__ === true && document.querySelector('#prose')?.textContent?.trim().length > 80, null, { timeout: 15000 });
  const state = await page.evaluate(() => ({
    edition: document.documentElement.dataset.kosifEdition || '',
    progress: Boolean(document.getElementById('k41-scroll-progress')),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    prose: document.querySelector('#prose')?.textContent?.trim().length || 0
  }));
  fail(state.edition !== 'v41' && !state.progress, 'Mafateeh original reader was overridden by the suite magazine shell');
  fail(state.overflow <= 1 && state.prose > 80, 'Mafateeh original reader is clipped or empty');
  await browser.close();
  console.log('KOSIF_ORIGINAL_READER_VISUAL_CONTRACT_OK');
}

(async () => {
  await verifyRoutes(chromium, 'chromium-laptop', {
    viewport: { width: 1366, height: 900 },
    locale: 'ar-SA'
  });
  await verifyRoutes(webkit, 'webkit-iphone', {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: 'ar-SA'
  });
  await verifyOriginalReader();
  console.log('KOSIF_UNIFIED_VISUAL_RUNTIME_OK');
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
