import {
  V38_CORE_VERSION, normalizeDigits, parseMoney, moneyAdd, moneySub, moneyCmp, formatMoney,
  validateJournalEntry, postJournal, reversalEntry, trialBalance, adjustedTrialBalance,
  computeMateriality, aggregateMisstatements, journalRiskFlags, deterministicSample,
  checkInvariants, frameworkApplicability, computeVat, estimateZakat
} from '../src/engine/v38-core.mjs';

let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; } else { fail++; console.error('  ❌ ' + name); } }
function eq(a, b, name) { ok(String(a) === String(b), `${name} (got ${a}, want ${b})`); }

console.log('KOSIF v38 deterministic core tests');

/* — الأرقام والمال — */
eq(normalizeDigits('١٢٣٤٫٥٠'), '1234.50', 'arabic digits + decimal');
eq(normalizeDigits('۱٢۳'), '123', 'persian digits');
const m1 = parseMoney('1,240,500.75');
ok(m1.ok && m1.minor === 124050075n, 'parse grouped money');
const m2 = parseMoney('(1,000.50)');
ok(m2.ok && m2.minor === -100050n, 'parentheses negative');
const m3 = parseMoney('١٢٣٤٫٥٠');
ok(m3.ok && m3.minor === 123450n, 'arabic money parse');
const m4 = parseMoney('1.234,56');
ok(m4.ok && m4.minor === 123456n, 'european format');
const mBad = parseMoney('1.2345');
ok(!mBad.ok && mBad.error.startsWith('FRACTION_EXCEEDS'), 'reject excess precision');
eq(formatMoney({ minor: 124050075n, exp: 2 }), '1,240,500.75', 'format money');
eq(formatMoney({ minor: -500n, exp: 2 }), '-5.00', 'format negative');
eq(moneyAdd({ minor: 100n, exp: 2 }, { minor: 250n, exp: 2 }).minor, 350n, 'money add');
eq(moneyCmp({ minor: 350n, exp: 2 }, { minor: 350n, exp: 2 }), 0, 'money cmp equal');

/* — القيود — */
const accounts = new Map([['1101', { code: '1101', type: 'asset' }], ['4101', { code: '4101', type: 'revenue' }]]);
const badEntry = { id: 'J1', date: '2026-01-10', lines: [{ account: '1101', dr: '100.00' }, { account: '4101', cr: '90.00' }] };
ok(!validateJournalEntry(badEntry).ok, 'unbalanced entry rejected');
const goodEntry = { id: 'J1', date: '2026-01-10', memo: 'مبيعات نقدية', lines: [{ account: '1101', dr: '100.00' }, { account: '4101', cr: '100.00' }] };
const v1 = validateJournalEntry(goodEntry, { accounts, exp: 2 });
ok(v1.ok && v1.balanced, 'balanced entry passes with known accounts');
const unknown = validateJournalEntry({ ...goodEntry, lines: [{ account: '9999', dr: '1' }, { account: '4101', cr: '1' }] }, { accounts });
ok(unknown.errors.some(e => e.code === 'LINE_ACCOUNT_UNKNOWN'), 'unknown account flagged');

const ledger0 = { accounts: new Map([['1101', { code: '1101', name: 'النقدية', type: 'asset', opening: 0n }], ['4101', { code: '4101', name: 'الإيرادات', type: 'revenue', opening: 0n }]]), postings: [] };
const r1 = await postJournal(ledger0, goodEntry, { exp: 2 });
ok(r1.ok && r1.posted.seq === 1 && r1.posted.hash.length === 64, 'post journal creates hash chain');
const r2 = await postJournal(r1.ledger, { ...goodEntry, id: 'J2', lines: [{ account: '1101', dr: '50' }, { account: '4101', cr: '50' }] }, { exp: 2 });
ok(r2.ok && r2.posted.prevHash === r1.posted.hash, 'chain links to previous hash');
ok(r1.ledger.postings.length === 1, 'ledger immutable (original untouched)');
const rev = reversalEntry(r2.posted);
const vrev = validateJournalEntry(rev, { exp: 2 });
ok(vrev.ok, 'reversal entry is balanced');
const chain = await import('../src/engine/v38-core.mjs').then(x => x.verifyHashChain(r2.ledger.postings));
ok(chain.ok, 'verify hash chain passes');

/* — ميزان المراجعة — */
const tb = trialBalance(r2.ledger);
ok(tb.balanced && tb.totals.dr === 15000n, 'trial balance totals in minor units');
eq(tb.rows.find(r => r.code === '1101').closing, 15000n, 'asset closing debit-nature');
const adj = adjustedTrialBalance(tb, [{ id: 'A1', date: '2026-12-31', lines: [{ account: '4101', dr: '25' }, { account: '1101', cr: '25' }] }]);
ok(adj.balanced && adj.rows.find(r => r.code === '1101').closing === 12500n, 'adjusted TB applies adjustment');
ok(adjustedTrialBalance(tb, [{ id: 'BAD', date: '2026-12-31', lines: [{ account: '4101', dr: '1' }] }]).rejected.length === 1, 'unsafe adjustment rejected');

/* — الأهمية النسبية — */
const mat = computeMateriality({ basis: 'profit', amount: '4,000,000.00', riskProfile: 'medium' });
ok(mat.ok, 'materiality computed');
eq(mat.overall.minor, 20000000n, 'overall = 5% PBT');
eq(mat.performance.minor, 13000000n, 'performance = 65% of overall (medium risk)');
eq(mat.clearlyTrivial.minor, 1000000n, 'trivial = 5% of overall');

/* — ISA 450 — */
const agg = aggregateMisstatements([
  { id: 'F1', type: 'factual', amount: '300,000' },
  { id: 'F2', type: 'factual', amount: '150,000', corrected: true },
  { id: 'J1', type: 'judgmental', amount: '450,000' },
  { id: 'P1', type: 'projected', amount: '600,000' }
], mat);
eq(agg.factual.minor, 30000000n, 'factual sum (uncorrected only)');
eq(agg.corrected.minor, 15000000n, 'corrected tracked separately');
ok(agg.exceedsPerformanceMateriality === true, 'uncorrected total exceeds PM');

/* — أعلام المخاطر — */
const flags = journalRiskFlags({ id: 'X', date: '2026-01-01', memo: 'تسوية نهائية', lines: [{ account: '1101', dr: '10,000,000' }, { account: '9999', cr: '10,000,000' }] }, { suspenseAccount: '9999', amountThreshold: '5,000,000', exp: 2 });
ok(flags.flags.some(f => f.code === 'SUSPENSE_ACCOUNT'), 'suspense flag');
ok(flags.flags.some(f => f.code === 'ABOVE_PERFORMANCE_MATERIALITY'), 'materiality threshold flag');
ok(flags.flags.some(f => f.code === 'ROUND_LARGE_AMOUNT'), 'round amount flag');

/* — المعاينة الحتمية — */
const pop = Array.from({ length: 100 }, (_, i) => ({ i, amt: (i + 1) * 100 }));
const s1 = deterministicSample(pop, { size: 10, seed: '380019' });
const s2 = deterministicSample(pop, { size: 10, seed: '380019' });
eq(JSON.stringify(s1.picked.map(x => x.i)), JSON.stringify(s2.picked.map(x => x.i)), 'same seed → same sample');
const s3 = deterministicSample(pop, { size: 10, seed: '380020' });
ok(JSON.stringify(s1.picked.map(x => x.i)) !== JSON.stringify(s3.picked.map(x => x.i)), 'different seed → different sample');
const mus = deterministicSample(pop, { size: 15, seed: '38', method: 'mus', amountKey: 'amt' });
ok(mus.method === 'monetary-unit' && mus.picked.length <= 15, 'MUS sampling works');
const sys = deterministicSample(pop, { size: 10, seed: '1', method: 'systematic' });
ok(sys.picked.length === 10 && sys.interval > 0, 'systematic sampling works');

/* — الثوابت — */
const inv = await checkInvariants(r2.ledger);
ok(inv.allOk, 'invariants pass on clean ledger');
const broken = { accounts: r2.ledger.accounts, postings: [...r2.ledger.postings, { ...r2.ledger.postings[1], hash: '0'.repeat(64) }] };
ok((await checkInvariants(broken)).results.find(r => r.id === 'POSTING_HASH_CHAIN')?.ok === false, 'tampered posting breaks hash chain');

/* — الإطار — */
const fw = frameworkApplicability({ periodStart: '2027-01-01', periodEnd: '2027-12-31' });
ok(fw.frameworks.find(f => f.id === 'IFRS_18')?.state === 'in-effect', 'IFRS 18 in effect for 2027 periods');
const fw2 = frameworkApplicability({ periodStart: '2026-01-01', periodEnd: '2026-12-31' });
ok(fw2.frameworks.find(f => f.id === 'IFRS_18')?.state === 'future', 'IFRS 18 future for 2026');
ok(fw2.frameworks.find(f => f.id === 'ISA_240_REVISED')?.state === 'in-effect', 'ISA 240 revised effective for periods ending >= 2026-12-15');
ok(frameworkApplicability({ periodStart: '2025-01-01', periodEnd: '2025-12-31' }).frameworks.find(f => f.id === 'ISA_240_REVISED')?.state === 'future', 'ISA 240 revised future for FY2025');
ok(frameworkApplicability({ periodStart: '2026-01-01', periodEnd: '2026-12-31', earlyAdoption: { IFRS_18: true } }).frameworks.find(f => f.id === 'IFRS_18')?.state === 'early-adoption', 'early adoption respected');

/* — ضريبة وزكاة — */
const vat = computeVat({ taxableSuppliesMinor: 1150000n, inputVatMinor: 69000n });
eq(vat.standardRated.vat.minor, 172500n, 'output VAT 15%');
eq(vat.netPayable.minor, 103500n, 'net payable');
ok(vat.direction === 'payable', 'direction payable');
const zk = estimateZakat({ basisMinor: 100000000n });
eq(zk.estimatedZakat.minor, 2500000n, 'zakat 2.5%');

console.log(`V38_CORE_RESULT pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
console.log('V38_CORE_OK version=' + V38_CORE_VERSION);
