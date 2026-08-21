import assert from 'node:assert/strict';
import {
  normalizeDigits,
  parseMoney,
  validateJournalEntry,
  buildLedger,
  postJournal,
  trialBalance,
  adjustedTrialBalance,
  computeMateriality,
  aggregateMisstatements,
  deterministicSample,
  checkInvariants,
  frameworkApplicability,
  computeVat,
} from '../../src/engine/v38-core.mjs';

const results = [];
async function run(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: error?.message || String(error) });
    console.error(`FAIL ${name}:`, error);
  }
}

await run('arabic-digit-normalization-and-money-precision', () => {
  assert.equal(normalizeDigits('١٢٣٤٥٦٧٨٩٠'), '1234567890');
  const p = parseMoney('١٬٢٣٤٫٥٠', { currency: 'SAR' });
  assert.equal(p.ok, true);
  assert.equal(p.minor, 123450n);
  const bad = parseMoney('10.001', { currency: 'SAR' });
  assert.equal(bad.ok, false);
});

const accounts = [
  { code: '1000', name: 'Cash', type: 'asset' },
  { code: '2000', name: 'Accrued liabilities', type: 'liability' },
  { code: '3000', name: 'Equity', type: 'equity' },
  { code: '4000', name: 'Revenue', type: 'revenue' },
  { code: '5000', name: 'Expense', type: 'expense' },
];
const sale = {
  id: 'GOLDEN-001',
  date: '2026-08-20',
  memo: 'Golden cash sale',
  lines: [
    { account: '1000', dr: '1000.00', cr: '0' },
    { account: '4000', dr: '0', cr: '1000.00' },
  ],
};

await run('journal-entry-balance-rejection', () => {
  const good = validateJournalEntry(sale, { periodStart: '2026-01-01', periodEnd: '2026-12-31' });
  assert.equal(good.ok, true);
  assert.equal(good.balanced, true);
  const bad = validateJournalEntry({ ...sale, id: 'BAD-001', lines: [
    { account: '1000', dr: '1000.00', cr: '0' },
    { account: '4000', dr: '0', cr: '999.99' },
  ]});
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some(e => e.code === 'ENTRY_NOT_BALANCED'));
});

let ledger = buildLedger(accounts);
await run('posting-hash-chain-and-trial-balance', async () => {
  const posted = await postJournal(ledger, sale, { periodStart: '2026-01-01', periodEnd: '2026-12-31' });
  assert.equal(posted.ok, true);
  ledger = posted.ledger;
  const tb = trialBalance(ledger);
  assert.equal(tb.balanced, true);
  assert.equal(tb.difference, 0n);
  const inv = await checkInvariants(ledger);
  assert.equal(inv.fatalCount, 0);
  assert.equal(inv.results.find(x => x.id === 'DOUBLE_ENTRY')?.ok, true);
  assert.equal(inv.results.find(x => x.id === 'ACCOUNTING_EQUATION')?.ok, true);
  assert.equal(inv.results.find(x => x.id === 'POSTING_HASH_CHAIN')?.ok, true);
});

await run('adjusted-trial-balance-remains-balanced', () => {
  const tb = trialBalance(ledger);
  const adjusted = adjustedTrialBalance(tb, [{
    id: 'ADJ-001',
    date: '2026-12-31',
    lines: [
      { account: '5000', dr: '100.00', cr: '0' },
      { account: '2000', dr: '0', cr: '100.00' },
    ],
  }]);
  assert.equal(adjusted.rejected.length, 0);
  assert.equal(adjusted.applied.length, 1);
  assert.equal(adjusted.balanced, true);
  assert.equal(adjusted.difference, 0n);
});

await run('materiality-and-misstatement-aggregation', () => {
  const m = computeMateriality({ basis: 'profit', amount: '1000000.00', riskProfile: 'medium', exp: 2 });
  assert.equal(m.ok, true);
  assert.equal(m.overall.minor, 5000000n);
  assert.equal(m.performance.minor, 3250000n);
  assert.equal(m.clearlyTrivial.minor, 250000n);
  const a = aggregateMisstatements([
    { id: 'M1', type: 'factual', amount: '1000.00' },
    { id: 'M2', type: 'judgmental', amount: '500.00' },
    { id: 'M3', type: 'projected', amount: '250.00', corrected: true },
  ], m);
  assert.equal(a.uncorrectedTotal.minor, 150000n);
  assert.equal(a.corrected.minor, 25000n);
});

await run('sampling-is-reproducible', () => {
  const population = Array.from({ length: 100 }, (_, i) => ({ id: `ROW-${i + 1}`, amount: i + 1 }));
  const a = deterministicSample(population, { size: 12, seed: 'kosif-golden-2026' });
  const b = deterministicSample(population, { size: 12, seed: 'kosif-golden-2026' });
  assert.deepEqual(a.picked.map(x => x.id), b.picked.map(x => x.id));
});

await run('framework-effective-date-guard', () => {
  const before = frameworkApplicability({ periodStart: '2026-01-01', periodEnd: '2026-12-31', jurisdiction: 'saudi' });
  const ifrs18Before = before.frameworks.find(x => x.id === 'IFRS_18');
  assert.equal(ifrs18Before.state, 'future');
  const after = frameworkApplicability({ periodStart: '2027-01-01', periodEnd: '2027-12-31', jurisdiction: 'saudi' });
  assert.equal(after.frameworks.find(x => x.id === 'IFRS_18')?.state, 'in-effect');
});

await run('saudi-vat-integer-math', () => {
  const v = computeVat({ taxableSuppliesMinor: 10000000n, inputVatMinor: 500000n, exp: 2, ratePct: 15 });
  assert.equal(v.standardRated.vat.minor, 1500000n);
  assert.equal(v.netPayable.minor, 1000000n);
  assert.equal(v.direction, 'payable');
});

const failed = results.filter(x => !x.ok);
const report = { suite: 'KOSIF accounting golden', generatedAt: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
