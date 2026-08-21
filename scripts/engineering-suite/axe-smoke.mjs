import fs from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.KOSIF_BASE_URL || 'http://127.0.0.1:4173';
const routes = (process.env.KOSIF_ROUTES || '/').split(',').map(x => x.trim()).filter(Boolean);
const viewports = [
  { name: 'iphone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
];

fs.mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
let blocking = 0;

const compactNode = (node) => ({
  target: node.target,
  html: String(node.html || '').slice(0, 500),
  failureSummary: node.failureSummary || '',
});

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  for (const route of routes) {
    const url = new URL(route, baseURL).toString();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (!response || response.status() >= 400) {
      blocking++;
      report.push({ viewport: viewport.name, route, url, httpStatus: response?.status() ?? null, blocking: [{ id: 'http-load-failure', impact: 'critical', nodes: 1 }], violations: [] });
      continue;
    }
    await page.waitForTimeout(750);
    const scan = await new AxeBuilder({ page }).analyze();
    const critical = scan.violations.filter(v => ['critical', 'serious'].includes(v.impact));
    blocking += critical.length;
    report.push({
      viewport: viewport.name,
      route,
      url,
      httpStatus: response.status(),
      violations: scan.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        samples: v.nodes.slice(0, 8).map(compactNode),
      })),
      blocking: critical.map(v => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        samples: v.nodes.slice(0, 8).map(compactNode),
      })),
    });
  }
  await context.close();
}

await browser.close();
const output = { suite: 'KOSIF axe accessibility', generatedAt: new Date().toISOString(), blocking, scans: report };
fs.writeFileSync('artifacts/axe-report.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
if (blocking > 0) process.exit(1);
