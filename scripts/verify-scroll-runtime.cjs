const { chromium, webkit } = require('playwright');

const BASE = process.env.KOSIF_TEST_URL || 'http://127.0.0.1:8788';
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function verify(engine, label) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: 'ar-SA'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error.stack || error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(`${BASE}/audit/?scroll-runtime=${label}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.classList.contains('kosif-ready') && document.documentElement.dataset.kosifEdition === 'v41', null, { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('kosif-mobile-phase-b-css'), null, { timeout: 10000 });
  await pause(900);

  const root = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    viewport: document.documentElement.clientHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hiddenReveals: [...document.querySelectorAll('[data-k41-reveal]')].filter(element => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && (Number(style.opacity) < .5 || style.visibility === 'hidden');
    }).length
  }));
  fail(root.height > root.viewport + 500, `${label}: audit page is not vertically scrollable`);
  fail(root.overflowX <= 1, `${label}: horizontal overflow ${root.overflowX}px`);
  fail(root.hiddenReveals === 0, `${label}: touch-first reveal left ${root.hiddenReveals} surfaces hidden`);

  await page.evaluate(() => window.scrollTo(0, Math.min(620, document.documentElement.scrollHeight - innerHeight)));
  await pause(120);
  const pageY = await page.evaluate(() => window.scrollY);
  fail(pageY > 100, `${label}: document scrolling did not move`);

  await page.evaluate(() => window.KosifStudioV40.openLauncher());
  await page.locator('#ks40-launch-overlay').waitFor({ state: 'visible' });
  await pause(120);
  const launcher = await page.evaluate(() => {
    const body = document.body;
    const target = document.querySelector('#app') || body;
    const list = document.querySelector('.ks40-launch-body');
    return {
      locked: body.dataset.kosifDialogOpen === '1',
      bodyPosition: getComputedStyle(body).position,
      bodyTouch: getComputedStyle(body).touchAction,
      lockTargetPosition: getComputedStyle(target).position,
      lockTargetTop: parseFloat(target.style.top) || 0,
      lockTargetComputedTop: parseFloat(getComputedStyle(target).top) || 0,
      listTouch: getComputedStyle(list).touchAction,
      listOverflow: getComputedStyle(list).overflowY,
      listHeight: list.clientHeight,
      listScrollHeight: list.scrollHeight
    };
  });
  fail(launcher.locked && launcher.lockTargetPosition === 'fixed' && launcher.bodyPosition !== 'fixed', `${label}: launcher did not isolate the background app shell`);
  fail(launcher.bodyTouch !== 'none', `${label}: body touch-action cancels Safari sheet gestures`);
  fail(launcher.listTouch === 'pan-y', `${label}: launcher does not own vertical touch gestures`);
  fail(['auto', 'scroll'].includes(launcher.listOverflow) && launcher.listScrollHeight > launcher.listHeight, `${label}: launcher is not internally scrollable`);
  fail(Math.abs(launcher.lockTargetTop + pageY) <= 2, `${label}: launcher lock did not preserve the page position (pageY=${pageY}, inlineTop=${launcher.lockTargetTop}, computedTop=${launcher.lockTargetComputedTop})`);

  await page.locator('.ks40-launch-body').evaluate(element => element.scrollTo(0, 360));
  await pause(80);
  fail(await page.locator('.ks40-launch-body').evaluate(element => element.scrollTop > 100), `${label}: launcher content did not scroll`);
  await page.locator('.ks40-launch-close').click();
  await pause(120);
  const restored = await page.evaluate(() => ({
    y: window.scrollY,
    locked: document.body.dataset.kosifDialogOpen === '1',
    position: getComputedStyle(document.querySelector('#app') || document.body).position
  }));
  fail(!restored.locked && restored.position !== 'fixed', `${label}: closing launcher left the page locked`);
  fail(Math.abs(restored.y - pageY) <= 2, `${label}: closing launcher lost the reading position`);

  await page.evaluate(() => window.confirmBox('اختبار التمرير', 'فحص نافذة التأكيد', () => {}));
  await page.locator('#modal-bg').waitFor({ state: 'visible' });
  await pause(80);
  const modalLock = await page.evaluate(() => ({
    locked: document.body.dataset.kosifDialogOpen === '1',
    position: getComputedStyle(document.querySelector('#app') || document.body).position,
    touch: getComputedStyle(document.body).touchAction,
    portal: document.querySelector('#modal-bg')?.parentElement === document.body
  }));
  fail(modalLock.locked && modalLock.position === 'fixed' && modalLock.portal, `${label}: legacy confirmation modal does not share the isolated page lock`);
  fail(modalLock.touch !== 'none', `${label}: legacy modal cancels touch gestures`);
  const modalGeometry = await page.locator('#m-no').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const backdrop = document.querySelector('#modal-bg').getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, backdropTop: backdrop.top, backdropBottom: backdrop.bottom, viewport: innerHeight, appTop: document.querySelector('#app')?.style.top || '' };
  });
  fail(modalGeometry.backdropTop >= -1 && modalGeometry.backdropBottom <= modalGeometry.viewport + 1 && modalGeometry.top >= 0 && modalGeometry.bottom <= modalGeometry.viewport, `${label}: legacy confirmation actions are outside the viewport ${JSON.stringify(modalGeometry)}`);
  await page.locator('#m-no').click();
  await pause(100);
  fail(await page.evaluate(() => document.body.dataset.kosifDialogOpen !== '1' && getComputedStyle(document.querySelector('#app') || document.body).position !== 'fixed'), `${label}: legacy modal left the page locked`);

  await page.evaluate(() => window.openDrawer('IFRS 15', 'اختبار التمرير', null, ''));
  await page.locator('#drawer').waitFor({ state: 'visible' });
  await pause(80);
  const drawerLock = await page.evaluate(() => ({
    open: document.querySelector('#drawer').classList.contains('open'),
    locked: document.body.dataset.kosifDialogOpen === '1',
    position: getComputedStyle(document.querySelector('#app') || document.body).position,
    drawerPosition: getComputedStyle(document.querySelector('#drawer')).position,
    portal: document.querySelector('#drawer')?.parentElement === document.body,
    touch: getComputedStyle(document.querySelector('#drawer')).touchAction,
    overflow: getComputedStyle(document.querySelector('#drawer')).overflowY
  }));
  fail(drawerLock.open && drawerLock.locked && drawerLock.position === 'fixed' && drawerLock.drawerPosition === 'fixed' && drawerLock.portal, `${label}: standards drawer does not share the isolated page lock ${JSON.stringify(drawerLock)}`);
  fail(drawerLock.touch === 'pan-y' && ['auto', 'scroll'].includes(drawerLock.overflow), `${label}: standards drawer is not touch-scrollable`);
  await page.locator('#drawer-bg').click({ position: { x: 4, y: 4 } });
  await pause(100);
  fail(await page.evaluate(() => !document.querySelector('#drawer').classList.contains('open') && document.body.dataset.kosifDialogOpen !== '1'), `${label}: standards drawer backdrop did not close and unlock`);

  const reportsTab = page.locator('.tab[data-go="v38-reports"]');
  if (await reportsTab.count()) {
    await reportsTab.click();
    await pause(350);
    const reportState = await page.evaluate(() => {
      const section = document.querySelector('section[data-view="v38-reports"]');
      const visible = [...section.querySelectorAll('[data-k41-reveal]')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return { shown: section.classList.contains('show'), hidden: visible.filter(element => Number(getComputedStyle(element).opacity) < .5).length };
    });
    fail(reportState.shown && reportState.hidden === 0, `${label}: report view was left hidden by cinematic motion`);
  }

  fail(!errors.some(error => /ReferenceError|TypeError|SyntaxError|Kosif boot error/i.test(error)), `${label}: runtime errors\n${errors.join('\n')}`);
  await browser.close();
  console.log(`KOSIF_SCROLL_RUNTIME_${label.toUpperCase()}_OK`);
}

(async () => {
  await verify(chromium, 'chromium');
  await verify(webkit, 'webkit');
  console.log('KOSIF_SCROLL_RUNTIME_OK');
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
