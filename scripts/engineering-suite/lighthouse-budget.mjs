import fs from 'node:fs';

const path = process.env.LIGHTHOUSE_JSON || 'artifacts/lighthouse.json';
const report = JSON.parse(fs.readFileSync(path, 'utf8'));
const categories = report.categories || {};
const audits = report.audits || {};

const budgets = {
  performance: Number(process.env.KOSIF_MIN_PERFORMANCE || 0.55),
  accessibility: Number(process.env.KOSIF_MIN_ACCESSIBILITY || 0.80),
  bestPractices: Number(process.env.KOSIF_MIN_BEST_PRACTICES || 0.75),
  lcpMs: Number(process.env.KOSIF_MAX_LCP_MS || 6000),
  cls: Number(process.env.KOSIF_MAX_CLS || 0.25),
  tbtMs: Number(process.env.KOSIF_MAX_TBT_MS || 1500),
};

const actual = {
  performance: categories.performance?.score ?? 0,
  accessibility: categories.accessibility?.score ?? 0,
  bestPractices: categories['best-practices']?.score ?? 0,
  lcpMs: audits['largest-contentful-paint']?.numericValue ?? Infinity,
  cls: audits['cumulative-layout-shift']?.numericValue ?? Infinity,
  tbtMs: audits['total-blocking-time']?.numericValue ?? Infinity,
};

const failures = [];
if (actual.performance < budgets.performance) failures.push(`performance ${actual.performance} < ${budgets.performance}`);
if (actual.accessibility < budgets.accessibility) failures.push(`accessibility ${actual.accessibility} < ${budgets.accessibility}`);
if (actual.bestPractices < budgets.bestPractices) failures.push(`best-practices ${actual.bestPractices} < ${budgets.bestPractices}`);
if (actual.lcpMs > budgets.lcpMs) failures.push(`LCP ${Math.round(actual.lcpMs)}ms > ${budgets.lcpMs}ms`);
if (actual.cls > budgets.cls) failures.push(`CLS ${actual.cls} > ${budgets.cls}`);
if (actual.tbtMs > budgets.tbtMs) failures.push(`TBT ${Math.round(actual.tbtMs)}ms > ${budgets.tbtMs}ms`);

const output = { suite: 'KOSIF Lighthouse budget', generatedAt: new Date().toISOString(), budgets, actual, ok: failures.length === 0, failures };
fs.writeFileSync('artifacts/lighthouse-budget.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exit(1);
