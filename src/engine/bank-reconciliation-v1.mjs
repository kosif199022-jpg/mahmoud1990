/*
 * KOSIF Bank Reconciliation Engine v1
 * Deterministic accounting matching. AI is intentionally not used for arithmetic,
 * amounts, match allocation, adjusted balances, or journal totals.
 */

export const BANK_RECONCILIATION_VERSION = 'kosif.bank-reconciliation.v1';

export const reconciliationCapabilities = Object.freeze({
  version: BANK_RECONCILIATION_VERSION,
  deterministic: true,
  matching: ['exact', 'date-tolerance', 'split-ledger', 'combined-bank'],
  controls: ['single-use-allocation', 'minor-unit-money', 'human-approval-required'],
  exceptions: ['DATE_DIFFERENCE', 'BANK_ONLY', 'LEDGER_ONLY', 'AMOUNT_DIFFERENCE', 'DUPLICATE', 'WRONG_SUPPLIER', 'WRONG_ACCOUNT'],
  aiAuthority: 'text-understanding-only',
  posting: 'never-automatic'
});

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const LEGAL_WORDS = new Set([
  'شركة', 'شركه', 'مؤسسة', 'مؤسسه', 'المحدودة', 'المحدوده', 'محدودة', 'محدوده',
  'ذمم', 'ذ', 'م', 'مساهمة', 'مساهمه', 'ltd', 'llc', 'co', 'company', 'corp', 'corporation', 'est'
]);

export function normalizeDigits(value) {
  return String(value ?? '').replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d)));
}

export function moneyToMinor(value, exp = 2) {
  if (typeof value === 'bigint') return value;
  let s = normalizeDigits(value).trim();
  if (!s) return 0n;
  const negative = /^\s*-/.test(s) || /^\s*\(/.test(s);
  s = s.replace(/\u066C/g, ',').replace(/\u066B/g, '.').replace(/[()]/g, '').replace(/[^0-9.,-]/g, '');
  if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= exp) s = parts.join('.');
    else s = parts.join('');
  } else s = s.replace(/,/g, '');
  s = s.replace(/-/g, '');
  if (!/^\d*(?:\.\d*)?$/.test(s)) throw new Error('MONEY_INVALID');
  let [whole = '0', frac = ''] = s.split('.');
  whole = whole || '0';
  const roundDigit = Number(frac[exp] || '0');
  frac = frac.slice(0, exp).padEnd(exp, '0');
  let minor = BigInt(whole) * (10n ** BigInt(exp)) + BigInt(frac || '0');
  if (roundDigit >= 5) minor += 1n;
  return negative ? -minor : minor;
}

function absMinor(v) { return v < 0n ? -v : v; }
function minorToDecimal(v, exp = 2) {
  const sign = v < 0n ? '-' : '';
  const x = absMinor(v);
  const scale = 10n ** BigInt(exp);
  const whole = x / scale;
  const frac = String(x % scale).padStart(exp, '0');
  return exp ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

export function normalizeDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000).toISOString().slice(0, 10);
  }
  const s = normalizeDigits(value).trim();
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) return isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if (m) return isoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function isoDate(y, m, d) {
  const x = new Date(Date.UTC(y, m - 1, d));
  if (x.getUTCFullYear() !== y || x.getUTCMonth() !== m - 1 || x.getUTCDate() !== d) return null;
  return x.toISOString().slice(0, 10);
}
function dateDiffDays(a, b) {
  if (!a || !b) return 9999;
  return Math.abs(Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000));
}

export function normalizeText(value) {
  return normalizeDigits(value).toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function partyTokens(value) {
  return normalizeText(value).split(' ').filter(Boolean).filter(t => !LEGAL_WORDS.has(t));
}
function partyKey(value) { return partyTokens(value).join(' '); }
function tokenSimilarity(a, b) {
  const A = new Set(String(a || '').split(' ').filter(Boolean));
  const B = new Set(String(b || '').split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  let hit = 0; for (const x of A) if (B.has(x)) hit++;
  return hit / new Set([...A, ...B]).size;
}
function buildAliasMap(aliases = []) {
  const map = new Map();
  const rows = Array.isArray(aliases) ? aliases : Object.entries(aliases || {}).map(([alias, canonical]) => ({ alias, canonical }));
  for (const row of rows) {
    const alias = partyKey(row?.alias ?? row?.[0]);
    const canonical = partyKey(row?.canonical ?? row?.[1]);
    if (alias && canonical) map.set(alias, canonical);
  }
  return map;
}
function canonicalParty(value, aliasMap) {
  const key = partyKey(value);
  return aliasMap.get(key) || key;
}
function partySimilarity(a, b, aliasMap) {
  const A = canonicalParty(a, aliasMap), B = canonicalParty(b, aliasMap);
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.92;
  return tokenSimilarity(A, B);
}
function descSimilarity(a, b) { return tokenSimilarity(normalizeText(a), normalizeText(b)); }
function normRef(v) { return normalizeDigits(v).toUpperCase().replace(/[^A-Z0-9]/g, ''); }

export function extractBankDescription(description = '', type = '') {
  const raw = String(description || '');
  const normalized = normalizeText(raw);
  const ref = raw.match(/\b(?:20\d{6})[A-Z0-9]{8,}\b/i)?.[0] || raw.match(/\b[A-Z]{3,}[A-Z0-9]{10,}\b/i)?.[0] || '';
  const purpose = /شراء\s+بضاع/.test(normalized) ? 'شراء بضاعة' : /راتب|رواتب/.test(normalized) ? 'رواتب' : /ايجار|إيجار/.test(raw) ? 'إيجار' : '';
  return { purpose, bankReference: ref, channel: String(type || '').trim(), raw: raw.slice(0, 1200) };
}

function sourceAmount(row, source, exp) {
  const fee = absMinor(moneyToMinor(row.charges ?? row.fee ?? row.fees ?? row.bankCharges ?? 0, exp));
  let raw;
  if (source === 'bank') raw = row.supplierAmount ?? row.principalAmount ?? row.amount ?? row.value ?? 0;
  else if (row.amount != null && row.amount !== '') raw = row.amount;
  else {
    const debit = moneyToMinor(row.debit ?? row.dr ?? 0, exp);
    const credit = moneyToMinor(row.credit ?? row.cr ?? 0, exp);
    raw = debit !== 0n ? debit : credit;
  }
  let amount = absMinor(moneyToMinor(raw, exp));
  if (source === 'bank' && row.amountIncludesCharges === true && fee > 0n && amount >= fee) amount -= fee;
  return { amount, fee };
}

export function normalizeTransaction(row = {}, source = 'bank', index = 0, options = {}) {
  const exp = options.exp ?? 2;
  const aliasMap = options.aliasMap || buildAliasMap(options.aliases);
  const { amount, fee } = sourceAmount(row, source, exp);
  const date = normalizeDate(row.date ?? row.transactionDate ?? row.postingDate);
  const counterparty = String(row.counterparty ?? row.beneficiary ?? row.supplier ?? row.vendor ?? row.party ?? '').trim();
  const description = String(row.description ?? row.note ?? row.memo ?? '').trim();
  const reference = String(row.reference ?? row.bankReference ?? row.voucher ?? row.documentNo ?? '').trim();
  const parsed = source === 'bank' ? extractBankDescription(description, row.type ?? row.channel) : null;
  const signed = moneyToMinor(row.amount ?? 0, exp);
  const debit = moneyToMinor(row.debit ?? row.dr ?? 0, exp);
  const credit = moneyToMinor(row.credit ?? row.cr ?? 0, exp);
  const direction = String(row.direction || '').toLowerCase() || (source === 'bank' ? (signed < 0n ? 'out' : 'in') : (debit > credit ? 'out' : 'in'));
  return {
    id: String(row.transaction_id ?? row.transactionId ?? row.id ?? `${source}-${index + 1}`),
    source, index, date, amountMinor: amount, feeMinor: fee, direction,
    counterparty, partyCanonical: canonicalParty(counterparty, aliasMap),
    reference: reference || parsed?.bankReference || '', refCanonical: normRef(reference || parsed?.bankReference || ''),
    description, type: String(row.type ?? row.channel ?? '').trim(), account: String(row.account ?? row.counterAccount ?? '').trim(),
    purpose: parsed?.purpose || '', channel: parsed?.channel || String(row.type ?? row.channel ?? '').trim(), raw: row
  };
}

function datePoints(diff) { return diff === 0 ? 20 : diff === 1 ? 15 : diff <= 3 ? 10 : 0; }
function statusForScore(score) { return score >= 90 ? 'CONFIRMED' : score >= 75 ? 'PROBABLE' : score >= 50 ? 'REVIEW' : 'UNMATCHED'; }
function scorePair(a, b, aliasMap) {
  const amountEqual = a.amountMinor === b.amountMinor;
  const pSim = partySimilarity(a.counterparty, b.counterparty, aliasMap);
  const dDiff = dateDiffDays(a.date, b.date);
  const refEqual = Boolean(a.refCanonical && b.refCanonical && a.refCanonical === b.refCanonical);
  const dSim = descSimilarity(a.description, b.description);
  let score = amountEqual ? 50 : 0;
  if (pSim >= 0.99) score += 25; else if (pSim >= 0.8) score += 20; else if (pSim >= 0.55) score += 12;
  score += datePoints(dDiff);
  if (refEqual) score += 20;
  if (dSim >= 0.65) score += 5;
  return { score: Math.min(100, score), amountEqual, partySimilarity: pSim, dateDifferenceDays: dDiff, referenceEqual: refEqual, descriptionSimilarity: dSim };
}
function publicTx(t, exp) {
  return { id: t.id, source: t.source, date: t.date, amount: minorToDecimal(t.amountMinor, exp), charges: minorToDecimal(t.feeMinor, exp), direction: t.direction, counterparty: t.counterparty, reference: t.reference, description: t.description, type: t.type, account: t.account, purpose: t.purpose, channel: t.channel };
}
function matchRecord(kind, bankRows, ledgerRows, metric, exp) {
  const score = metric.score ?? 85;
  return {
    id: `match-${bankRows.map(x => x.id).join('+')}--${ledgerRows.map(x => x.id).join('+')}`,
    kind, status: statusForScore(score), confidence: score,
    dateDifferenceDays: metric.dateDifferenceDays ?? null,
    evidence: metric,
    bank: bankRows.map(x => publicTx(x, exp)), ledger: ledgerRows.map(x => publicTx(x, exp)),
    amount: minorToDecimal(bankRows.reduce((s, x) => s + x.amountMinor, 0n), exp),
    allocationLocked: true
  };
}

function findSubset(candidates, target, maxSize) {
  const rows = candidates.filter(x => x.amountMinor > 0n && x.amountMinor <= target).slice(0, 18);
  let best = null;
  function dfs(start, picked, sum) {
    if (sum === target && picked.length >= 2) { best = [...picked]; return true; }
    if (picked.length >= maxSize || sum >= target) return false;
    for (let i = start; i < rows.length; i++) {
      if (dfs(i + 1, [...picked, rows[i]], sum + rows[i].amountMinor)) return true;
    }
    return false;
  }
  dfs(0, [], 0n);
  return best;
}

function duplicateExceptions(rows, side, exp) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.date || ''}|${row.amountMinor}|${row.partyCanonical}`;
    const arr = groups.get(key) || []; arr.push(row); groups.set(key, arr);
  }
  return [...groups.values()].filter(g => g.length > 1).map(g => ({
    type: 'DUPLICATE', side, severity: 'warning', message: `يوجد ${g.length} عمليات متشابهة في ${side === 'bank' ? 'كشف البنك' : 'الدفاتر'}.`, transactions: g.map(x => publicTx(x, exp))
  }));
}

export function reconcileBankLedger(input = {}) {
  const exp = Number.isInteger(Number(input.exp)) ? Math.max(0, Math.min(6, Number(input.exp))) : 2;
  const dateToleranceDays = Math.max(0, Math.min(30, Number(input.dateToleranceDays ?? 3) || 0));
  const maxSplitSize = Math.max(2, Math.min(6, Number(input.maxSplitSize ?? 4) || 4));
  const aliasMap = buildAliasMap(input.aliases);
  const opts = { exp, aliasMap };
  const bank = (Array.isArray(input.bankTransactions) ? input.bankTransactions : []).slice(0, 10000).map((x, i) => normalizeTransaction(x, 'bank', i, opts));
  const ledger = (Array.isArray(input.ledgerTransactions) ? input.ledgerTransactions : []).slice(0, 10000).map((x, i) => normalizeTransaction(x, 'ledger', i, opts));
  const usedBank = new Set(), usedLedger = new Set(), matches = [], exceptions = [];

  const candidates = [];
  for (const b of bank) for (const l of ledger) {
    const m = scorePair(b, l, aliasMap);
    if (m.amountEqual && m.dateDifferenceDays <= dateToleranceDays && m.score >= 50) candidates.push({ b, l, m });
  }
  candidates.sort((x, y) => y.m.score - x.m.score || x.m.dateDifferenceDays - y.m.dateDifferenceDays || x.b.index - y.b.index || x.l.index - y.l.index);
  for (const c of candidates) {
    if (usedBank.has(c.b.id) || usedLedger.has(c.l.id)) continue;
    usedBank.add(c.b.id); usedLedger.add(c.l.id);
    const kind = c.m.dateDifferenceDays === 0 && c.m.partySimilarity >= 0.99 ? 'EXACT_MATCH' : c.m.dateDifferenceDays > 0 ? 'DATE_TOLERANCE_MATCH' : 'PROBABLE_MATCH';
    matches.push(matchRecord(kind, [c.b], [c.l], c.m, exp));
  }

  for (const b of bank) {
    if (usedBank.has(b.id)) continue;
    const pool = ledger.filter(l => !usedLedger.has(l.id) && dateDiffDays(b.date, l.date) <= dateToleranceDays && (!b.partyCanonical || !l.partyCanonical || partySimilarity(b.counterparty, l.counterparty, aliasMap) >= 0.55));
    const picked = findSubset(pool, b.amountMinor, maxSplitSize);
    if (!picked) continue;
    usedBank.add(b.id); picked.forEach(x => usedLedger.add(x.id));
    const dd = Math.max(...picked.map(x => dateDiffDays(b.date, x.date)));
    const ps = picked.length ? Math.min(...picked.map(x => partySimilarity(b.counterparty, x.counterparty, aliasMap))) : 0;
    const metric = { score: Math.min(100, 50 + (ps >= 0.99 ? 25 : ps >= 0.8 ? 20 : ps >= 0.55 ? 12 : 0) + datePoints(dd)), amountEqual: true, partySimilarity: ps, dateDifferenceDays: dd, compositeCount: picked.length };
    matches.push(matchRecord('COMPOSITE_MATCH', [b], picked, metric, exp));
  }
  for (const l of ledger) {
    if (usedLedger.has(l.id)) continue;
    const pool = bank.filter(b => !usedBank.has(b.id) && dateDiffDays(b.date, l.date) <= dateToleranceDays && (!b.partyCanonical || !l.partyCanonical || partySimilarity(b.counterparty, l.counterparty, aliasMap) >= 0.55));
    const picked = findSubset(pool, l.amountMinor, maxSplitSize);
    if (!picked) continue;
    usedLedger.add(l.id); picked.forEach(x => usedBank.add(x.id));
    const dd = Math.max(...picked.map(x => dateDiffDays(x.date, l.date)));
    const ps = picked.length ? Math.min(...picked.map(x => partySimilarity(x.counterparty, l.counterparty, aliasMap))) : 0;
    const metric = { score: Math.min(100, 50 + (ps >= 0.99 ? 25 : ps >= 0.8 ? 20 : ps >= 0.55 ? 12 : 0) + datePoints(dd)), amountEqual: true, partySimilarity: ps, dateDifferenceDays: dd, compositeCount: picked.length };
    matches.push(matchRecord('COMBINED_PAYMENT_MATCH', picked, [l], metric, exp));
  }

  exceptions.push(...duplicateExceptions(bank, 'bank', exp), ...duplicateExceptions(ledger, 'ledger', exp));
  for (const m of matches) if (Number(m.dateDifferenceDays) > 0) exceptions.push({ type: 'DATE_DIFFERENCE', severity: 'info', matchId: m.id, days: m.dateDifferenceDays, message: `تمت المطابقة مع فرق تاريخ ${m.dateDifferenceDays} يوم.` });

  const unmatchedBank = bank.filter(x => !usedBank.has(x.id));
  const unmatchedLedger = ledger.filter(x => !usedLedger.has(x.id));
  for (const b of unmatchedBank) {
    const near = unmatchedLedger.map(l => ({ l, m: scorePair(b, l, aliasMap), diff: absMinor(b.amountMinor - l.amountMinor) })).sort((a, z) => a.diff < z.diff ? -1 : a.diff > z.diff ? 1 : a.m.dateDifferenceDays - z.m.dateDifferenceDays)[0];
    if (near && near.m.dateDifferenceDays <= dateToleranceDays && b.amountMinor === near.l.amountMinor && near.m.partySimilarity < 0.55) {
      exceptions.push({ type: 'WRONG_SUPPLIER', severity: 'warning', bank: publicTx(b, exp), ledger: publicTx(near.l, exp), message: 'المبلغ والتاريخ متقاربان لكن اسم المورد مختلف.', learningSuggestion: { alias: b.counterparty, canonical: near.l.counterparty } });
    } else if (near && near.m.dateDifferenceDays <= dateToleranceDays && near.m.partySimilarity >= 0.55 && near.diff > 0n && (near.diff <= 500n || Number(near.diff * 10000n / (b.amountMinor || 1n)) <= 100)) {
      exceptions.push({ type: 'AMOUNT_DIFFERENCE', severity: 'warning', bank: publicTx(b, exp), ledger: publicTx(near.l, exp), difference: minorToDecimal(near.diff, exp), message: 'توجد عملية مرشحة بنفس المورد والفترة لكن بقيمة مختلفة.' });
    } else exceptions.push({ type: 'BANK_ONLY', severity: 'error', bank: publicTx(b, exp), message: 'العملية موجودة في البنك ولم تُخصص إلى قيد دفتري.' });
  }
  for (const l of unmatchedLedger) {
    if (exceptions.some(e => e.type === 'WRONG_SUPPLIER' && e.ledger?.id === l.id)) continue;
    exceptions.push({ type: 'LEDGER_ONLY', severity: 'error', ledger: publicTx(l, exp), message: 'القيد موجود في الدفاتر ولم يُخصص إلى حركة بنكية.' });
  }

  const expectedAccount = normalizeText(input.expectedAccount || '');
  if (expectedAccount) for (const l of ledger) if (normalizeText(l.account) && normalizeText(l.account) !== expectedAccount) exceptions.push({ type: 'WRONG_ACCOUNT', severity: 'warning', ledger: publicTx(l, exp), expectedAccount: input.expectedAccount, message: 'الحساب المقابل لا يطابق الحساب المتوقع للتسوية.' });

  const bankOnlyRows = unmatchedBank.filter(b => exceptions.some(e => e.type === 'BANK_ONLY' && e.bank?.id === b.id));
  const bankOnlyTotal = bankOnlyRows.reduce((s, x) => s + x.amountMinor, 0n);
  const bankFeeTotal = bank.reduce((s, x) => s + x.feeMinor, 0n);
  const ledgerOnlyTotal = unmatchedLedger.filter(l => exceptions.some(e => e.type === 'LEDGER_ONLY' && e.ledger?.id === l.id)).reduce((s, x) => s + x.amountMinor, 0n);
  let adjustedBalance = null, suppliedBalance = null;
  if (input.supplierBalance != null && input.supplierBalance !== '') {
    suppliedBalance = moneyToMinor(input.supplierBalance, exp);
    adjustedBalance = String(input.balanceNature || 'credit').toLowerCase() === 'debit' ? suppliedBalance + bankOnlyTotal : suppliedBalance - bankOnlyTotal;
  }

  const adjustmentProposals = bankOnlyRows.filter(x => x.direction !== 'in').map(x => ({
    id: `adj-${x.id}`, sourceTransactionId: x.id, status: 'PROPOSED', postingAllowed: false, humanApprovalRequired: true,
    rationale: 'حوالة بنكية محتملة غير مسجلة — لا تُرحّل قبل الاعتماد البشري وفحص المستند.',
    lines: [
      { side: 'debit', account: 'المورد', amount: minorToDecimal(x.amountMinor, exp) },
      ...(x.feeMinor > 0n ? [{ side: 'debit', account: 'مصروفات بنكية', amount: minorToDecimal(x.feeMinor, exp) }] : []),
      { side: 'credit', account: 'البنك', amount: minorToDecimal(x.amountMinor + x.feeMinor, exp) }
    ]
  }));

  const confirmed = matches.filter(x => x.status === 'CONFIRMED').length;
  const probable = matches.filter(x => x.status === 'PROBABLE').length;
  const review = matches.filter(x => x.status === 'REVIEW').length;
  return {
    ok: true, version: BANK_RECONCILIATION_VERSION, precision: `minor-unit-bigint-exp-${exp}`,
    policy: { dateToleranceDays, maxSplitSize, allocation: 'single-use', aiArithmetic: false, humanApprovalRequired: true },
    summary: {
      bankTransactions: bank.length, ledgerTransactions: ledger.length, matches: matches.length,
      confirmed, probable, review, unmatchedBank: unmatchedBank.length, unmatchedLedger: unmatchedLedger.length,
      bankOnlyTotal: minorToDecimal(bankOnlyTotal, exp), ledgerOnlyTotal: minorToDecimal(ledgerOnlyTotal, exp), bankChargesTotal: minorToDecimal(bankFeeTotal, exp)
    },
    matches, exceptions,
    proposedSupplierBalance: suppliedBalance == null ? null : { before: minorToDecimal(suppliedBalance, exp), bankOnlyPayments: minorToDecimal(bankOnlyTotal, exp), after: minorToDecimal(adjustedBalance, exp), label: 'رصيد مقترح بعد التسوية', final: false },
    adjustmentProposals,
    governance: { automaticPosting: false, approvalRequired: true, aiMayInterpretText: true, aiMayCalculateOrAllocate: false }
  };
}
