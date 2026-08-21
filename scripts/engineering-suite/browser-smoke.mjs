import { chromium } from 'playwright';

const baseURL = process.env.KOSIF_BASE_URL || 'http://127.0.0.1:4173';
const routes = (process.env.KOSIF_ROUTES || '/').split(',').map(s => s.trim()).filter(Boolean);
const viewports = [
  { name: 'iphone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 1000 },
];

const browser = await chromium.launch({ headless: true });
let failures = 0;

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('pageerror', err => {
    console.error(`[pageerror][${viewport.name}]`, err.message);
    failures++;
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.error(`[console][${viewport.name}]`, msg.text());
  });

  for (const route of routes) {
    const url = new URL(route, baseURL).toString();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || response.status() >= 400) {
      console.error(`[http][${viewport.name}] ${url} -> ${response?.status() ?? 'no response'}`);
      failures++;
      continue;
    }

    await page.waitForTimeout(500);
    const title = await page.title();
    const bodyText = (await page.locator('body').innerText()).trim();
    if (!title && bodyText.length < 20) {
      console.error(`[content][${viewport.name}] ${url} looks empty`);
      failures++;
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (overflow) {
      console.error(`[overflow][${viewport.name}] horizontal overflow detected at ${url}`);
      failures++;
    }

    const unlabeledButtons = await page.locator('button').evaluateAll(btns => btns.filter(b => {
      const text = (b.textContent || '').trim();
      return !text && !b.getAttribute('aria-label') && !b.getAttribute('title');
    }).length);
    if (unlabeledButtons > 0) {
      console.error(`[a11y][${viewport.name}] ${unlabeledButtons} unlabeled button(s) at ${url}`);
      failures++;
    }

    await page.screenshot({ path: `artifacts/${viewport.name}-${route.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`, fullPage: true });
    console.log(`[pass][${viewport.name}] ${url}`);
  }
  await context.close();
}

await browser.close();
if (failures > 0) {
  console.error(`KOSIF browser smoke failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log('KOSIF browser smoke passed.');
