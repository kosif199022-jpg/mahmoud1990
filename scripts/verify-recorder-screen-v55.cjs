const { webkit } = require('playwright');

const base = process.env.KOSIF_TEST_URL || 'http://127.0.0.1:8788';

(async () => {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  try {
    await page.goto(`${base}/audit/?qa=recorder-v55`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#kosif-rec-btn', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => Boolean(window.KosifScreenRecorder), null, { timeout: 15000 });

    const injected = await page.evaluate(() => ({
      capture: document.querySelector('#kosif-rec-screen-v54')?.getAttribute('src') || '',
      integration: document.querySelector('#kosif-rec-screen-integration-v55')?.getAttribute('src') || ''
    }));
    if (!injected.capture.includes('v54.2')) throw new Error(`Recorder v54.2 cache-bust missing: ${injected.capture}`);
    if (!injected.integration.includes('kosif-rec-screen-integration-v55.js')) throw new Error(`Recorder v55 integration missing: ${injected.integration}`);

    await page.evaluate(() => {
      const md = navigator.mediaDevices;
      if (!md) return;
      try { Object.defineProperty(md, 'getDisplayMedia', { value: undefined, configurable: true }); } catch {}
      try {
        const proto = Object.getPrototypeOf(md);
        if (proto && 'getDisplayMedia' in proto) Object.defineProperty(proto, 'getDisplayMedia', { value: undefined, configurable: true });
      } catch {}
    });

    const directSupported = await page.evaluate(() => Boolean(window.isSecureContext && navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder));
    if (directSupported) throw new Error('Unable to force the iPhone/Safari no-getDisplayMedia path');

    await page.click('#kosif-rec-btn');
    await page.waitForSelector('#ks-screen-panel.show', { state: 'visible', timeout: 5000 });

    const fallback = await page.evaluate(() => ({
      help: document.querySelector('#ks-screen-help')?.textContent || '',
      steps: [...document.querySelectorAll('#ks-screen-steps li')].map(x => x.textContent || ''),
      startDisplay: getComputedStyle(document.querySelector('#ks-screen-start')).display,
      fileInput: Boolean(document.querySelector('#ks-screen-file'))
    }));

    if (!fallback.help.includes('التقاط الشاشة المباشر غير متاح')) throw new Error(`Fallback help missing: ${fallback.help}`);
    if (!fallback.steps.some(x => x.includes('مركز التحكم') && x.includes('تسجيل الشاشة'))) throw new Error(`iPhone native recording steps missing: ${fallback.steps.join(' | ')}`);
    if (fallback.startDisplay !== 'none') throw new Error(`Direct-capture button should be hidden on iPhone fallback: ${fallback.startDisplay}`);
    if (!fallback.fileInput) throw new Error('Recorded-video import input missing');

    console.log('KOSIF_RECORDER_SCREEN_V55_OK', JSON.stringify({ injected, fallback }));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error('KOSIF_RECORDER_SCREEN_V55_FAILED', error);
  process.exit(1);
});
