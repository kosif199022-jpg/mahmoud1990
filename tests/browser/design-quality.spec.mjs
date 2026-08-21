import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const qaMode = process.env.KOSIF_QA_MODE || 'live';

async function attachJson(testInfo, name, value) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)),
    contentType: 'application/json'
  });
}

test.describe('KOSIF Design Quality Stack v44', () => {
  test('design system is active and exposes governed tokens', async ({ page }, testInfo) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => ({
      version: document.documentElement.dataset.kosifDesignSystem,
      ready: document.documentElement.dataset.kosifDesignReady,
      touchTarget: getComputedStyle(document.documentElement).getPropertyValue('--k44-touch').trim(),
      displaySize: getComputedStyle(document.documentElement).getPropertyValue('--k44-fs-display').trim(),
      designCss: [...document.styleSheets].some((sheet) => String(sheet.href || '').includes('kosif-design-system-v44.css')),
      designScript: [...document.scripts].some((script) => String(script.src || '').includes('kosif-design-system-v44.js'))
    }));

    expect(state.version).toBe('v44');
    expect(state.ready).toBe('true');
    expect(state.touchTarget).toBe('44px');
    expect(state.designCss).toBeTruthy();
    expect(state.designScript).toBeTruthy();
    await attachJson(testInfo, 'design-system-state.json', state);
  });

  test('interactive controls honor the 44px touch target contract', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const sample = await page.locator('button,.btn,[role="button"],input,select').evaluateAll((nodes) => nodes
      .filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })
      .slice(0, 40)
      .map((node) => ({
        tag: node.tagName,
        className: String(node.className || ''),
        height: node.getBoundingClientRect().height
      })));

    expect(sample.length).toBeGreaterThan(0);
    const undersized = sample.filter((item) => item.height < 43);
    await attachJson(testInfo, 'touch-target-sample.json', { sample, undersized });
    expect(undersized, 'Visible interactive controls below the governed 44px touch target').toEqual([]);
  });

  test('axe scan has no critical accessibility violations', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    await attachJson(testInfo, 'axe-accessibility.json', {
      mode: qaMode,
      violations: results.violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length
    });
    expect(critical, 'Critical axe accessibility violations detected').toEqual([]);
  });

  test('mobile viewport stays within document width', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-safari', 'Mobile responsive gate');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.dataset.kosifViewport,
      reducedMotion: document.documentElement.dataset.kosifReducedMotion
    }));

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 8);
    expect(['xs', 'sm']).toContain(layout.viewport);
    await attachJson(testInfo, 'responsive-layout.json', layout);
  });
});
