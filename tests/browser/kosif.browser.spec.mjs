import { test, expect } from '@playwright/test';

const coreRoutes = ['/', '/audit/', '/libraries/', '/sales/', '/standards/'];
const books = ['mafateeh', 'std2025', 'std2018', 'dipifr'];

function observeRuntime(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
  });

  return { pageErrors, consoleErrors, failedRequests };
}

async function attachRuntimeEvidence(testInfo, evidence) {
  await testInfo.attach('browser-runtime.json', {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: 'application/json',
  });
}

test.describe('KOSIF browser smoke', () => {
  for (const route of coreRoutes) {
    test(`${route} renders without browser-fatal errors`, async ({ page }, testInfo) => {
      const evidence = observeRuntime(page);
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      expect(response, `No HTTP response for ${route}`).not.toBeNull();
      expect(response.status(), `${route} returned ${response.status()}`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();

      await page.waitForTimeout(800);
      expect(evidence.pageErrors, `Uncaught browser errors on ${route}`).toEqual([]);

      const layout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      }));

      if (testInfo.project.name === 'mobile-safari') {
        expect(layout.scrollWidth, `Horizontal overflow on ${route}`).toBeLessThanOrEqual(layout.innerWidth + 8);
      }

      await attachRuntimeEvidence(testInfo, { route, layout, ...evidence });
      await page.screenshot({ path: testInfo.outputPath(`route-${route.replaceAll('/', '-') || 'root'}.png`), fullPage: true });
    });
  }
});

test('audit page can actually scroll on iPhone-sized viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-safari', 'Mobile-specific regression gate');

  const evidence = observeRuntime(page);
  const response = await page.goto('/audit/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await page.waitForTimeout(700);

  const result = await page.evaluate(() => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(maxScroll, 500));
    return {
      maxScroll,
      scrollY: window.scrollY,
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    };
  });

  expect(result.maxScroll, 'Audit page is unexpectedly not scrollable').toBeGreaterThan(32);
  expect(result.scrollY, 'Viewport remained locked instead of scrolling').toBeGreaterThan(0);
  expect(evidence.pageErrors).toEqual([]);
  await attachRuntimeEvidence(testInfo, { route: '/audit/', scroll: result, ...evidence });
});

test.describe('shared Mafateeh reader routing and hydration', () => {
  for (const book of books) {
    test(`${book} opens directly in the shared reader`, async ({ page }, testInfo) => {
      const evidence = observeRuntime(page);
      const response = await page.goto(`/wealth/reader.html?book=${book}`, { waitUntil: 'domcontentloaded' });

      expect(response, `No reader response for ${book}`).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      expect(new URL(page.url()).pathname, `${book} escaped to another reader`).toBe('/wealth/reader.html');

      await expect(page.locator(`[data-kosif-book-bootstrap="${book}"]`).first()).toBeAttached({ timeout: 10_000 });
      await page.waitForTimeout(1_000);

      const runtime = await page.evaluate(() => ({
        hasD: typeof window.D !== 'undefined',
        hasCH: typeof window.CH !== 'undefined',
        title: document.title,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));

      expect(runtime.hasD, `${book}: shared reader D binding missing`).toBeTruthy();
      expect(runtime.hasCH, `${book}: shared reader CH binding missing`).toBeTruthy();
      expect(evidence.pageErrors, `${book}: uncaught browser errors`).toEqual([]);

      const visibleDefaultHiddenControls = await page.locator('#mixerDock,#smartHubDock,#libBtn,#mixLaunch,#smartPebble,.smart-pebble').evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          })
          .map((element) => element.id || element.className || element.tagName),
      );
      expect(visibleDefaultHiddenControls, `${book}: internal smart/mixer controls became visible by default`).toEqual([]);

      if (testInfo.project.name === 'mobile-safari') {
        expect(runtime.scrollWidth, `${book}: reader has horizontal overflow`).toBeLessThanOrEqual(runtime.innerWidth + 8);
      }

      await attachRuntimeEvidence(testInfo, { book, runtime, ...evidence });
      await page.screenshot({ path: testInfo.outputPath(`reader-${book}.png`), fullPage: false });
    });
  }
});
