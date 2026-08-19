/*
 * KOSIF v38 — Trusted Audit Intelligence OS
 * Deterministic orchestration shared by audit, sales analytics and evidence review.
 *
 * Monetary values are parsed through the v38 accounting core and accumulated as
 * BigInt minor units. AI remains advisory-only and cannot post, approve or form
 * the final audit opinion.
 */
import { parseMoney, normalizeDigits } from './engine/v38-core.mjs';

export const TRUSTED_INTELLIGENCE_VERSION = '38.1.0-trusted-layer';
export const TRUSTED_SALES_ROW_LIMIT = 10000;

const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const BLOCKED_ACTIONS = new Set([
  'post_entry', 'post_journal', 'approve_adjustment', 'approve_opinion',
  'finalize_opinion', 'calculate_materiality', 'set_materiality'
]);

function cleanText(value, max = 160) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stableHash(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function amount(value, { exp = 2, currency = 'SAR' } = {}) {
  return parseMoney(value == null || value === '' ? '0' : value, { exp, currency });
}

function integer(value) {
  const n = Number(normalizeDigits(value));
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function duplicateKey(row) {
  return [row?.id, row?.date, row?.product, row?.revenue, row?.cost]
    .map(x => cleanText(x, 120)).join('|');
}

export function createEvidenceFinding(input = {}) {
  const category = cleanText(input.category || 'operational', 48);
  const ref = cleanText(input.ref || input.source || 'kosif', 160);
  const code = cleanText(input.code || 'OBSERVATION', 64).toUpperCase();
  const explicitId = cleanText(input.id, 96);
  return {
    id: explicitId || `ktf-${stableHash(`${category}|${code}|${ref}`)}`,
    category,
    code,
    ref,
    severity: SEVERITIES.has(input.severity) ? input.severity : 'medium',
    message: cleanText(input.message || '', 600),
    source: cleanText(input.source || 'kosif', 80),
    requiresHumanReview: true,
    createdBy: 'kosif-v38-deterministic-layer'
  };
}

export function buildSalesAuditBridge(sales = [], opts = {}) {
  const rows = Array.isArray(sales) ? sales : [];
  if (rows.length > TRUSTED_SALES_ROW_LIMIT) {
    return { ok: false, error: 'SALES_ROW_LIMIT_EXCEEDED', limit: TRUSTED_SALES_ROW_LIMIT, count: rows.length };
  }

  const exp = Number.isInteger(opts.exp) && opts.exp >= 0 && opts.exp <= 8 ? opts.exp : 2;
  const currency = cleanText(opts.currency || 'SAR', 8).toUpperCase() || 'SAR';
  const threshold = opts.performanceMateriality == null || opts.performanceMateriality === ''
    ? null : amount(opts.performanceMateriality, { exp, currency });
  if (threshold && !threshold.ok) return { ok: false, error: 'PERFORMANCE_MATERIALITY_INVALID', detail: threshold.error };

  let revenue = 0n, cost = 0n, quantity = 0;
  let negativeMarginRows = 0, highValueRows = 0, missingEssential = 0, duplicates = 0;
  const invalidMoney = [];
  const findings = [];
  const seen = new Set();

  rows.forEach((row, index) => {
    const rev = amount(row?.revenue, { exp, currency });
    const cst = amount(row?.cost, { exp, currency });
    if (!rev.ok || !cst.ok) {
      invalidMoney.push({ index, id: cleanText(row?.id, 80), revenue: rev.ok ? null : rev.error, cost: cst.ok ? null : cst.error });
      return;
    }
    revenue += rev.minor;
    cost += cst.minor;
    quantity += integer(row?.qty);

    const missing = ['date', 'product', 'channel'].filter(k => !cleanText(row?.[k], 200));
    if (missing.length) missingEssential += missing.length;

    const key = duplicateKey(row);
    if (key && seen.has(key)) duplicates += 1;
    if (key) seen.add(key);

    const gross = rev.minor - cst.minor;
    if (gross < 0n) {
      negativeMarginRows += 1;
      findings.push(createEvidenceFinding({
        category: 'sales-audit', code: 'NEGATIVE_GROSS_MARGIN', ref: row?.id || `row-${index + 1}`,
        severity: 'high', source: 'sales-ledger', message: 'تكلفة العملية تتجاوز الإيراد المسجل وتحتاج فحص المستندات والتصنيف.'
      }));
    }
    if (threshold?.ok && rev.minor < 0n ? -rev.minor >= threshold.minor : rev.minor >= threshold.minor) {
      highValueRows += 1;
      findings.push(createEvidenceFinding({
        category: 'sales-audit', code: 'ABOVE_PERFORMANCE_MATERIALITY', ref: row?.id || `row-${index + 1}`,
        severity: 'high', source: 'sales-ledger', message: 'قيمة العملية تساوي أو تتجاوز الأهمية النسبية للأداء وتستحق فحصًا مباشرًا.'
      }));
    }
  });

  if (duplicates) findings.push(createEvidenceFinding({ category: 'data-quality', code: 'DUPLICATE_SALES_ROWS', ref: `count:${duplicates}`, severity: 'medium', source: 'sales-ledger', message: `${duplicates} سجل/سجلات مبيعات مشتبه بتكرارها.` }));
  if (missingEssential) findings.push(createEvidenceFinding({ category: 'data-quality', code: 'MISSING_ESSENTIAL_FIELDS', ref: `count:${missingEssential}`, severity: 'medium', source: 'sales-ledger', message: `${missingEssential} حقل/حقول أساسية مفقودة في بيانات المبيعات.` }));
  if (invalidMoney.length) findings.push(createEvidenceFinding({ category: 'data-quality', code: 'INVALID_MONETARY_INPUT', ref: `count:${invalidMoney.length}`, severity: 'critical', source: 'sales-ledger', message: 'توجد مبالغ لا يمكن تفسيرها بدقة وفق وحدة العملة؛ لم تُقرب أو تُخمن.' }));

  const grossProfit = revenue - cost;
  const marginBps = revenue === 0n ? null : Number((grossProfit * 10000n) / revenue);
  return {
    ok: invalidMoney.length === 0,
    version: TRUSTED_INTELLIGENCE_VERSION,
    input: { rows: rows.length, exp, currency, precision: 'minor-unit-bigint' },
    metrics: {
      revenueMinor: revenue.toString(), costMinor: cost.toString(), grossProfitMinor: grossProfit.toString(),
      marginBps, transactions: rows.length, quantity,
      negativeMarginRows, highValueRows, missingEssential, duplicates, invalidMoneyRows: invalidMoney.length
    },
    invalidMoney,
    findings,
    governance: {
      accountingImpact: 'requires-deterministic-accounting-engine',
      aiAuthority: 'advisory-only',
      humanApproval: 'required-for-posting-and-opinion'
    }
  };
}

export function buildTrustedSnapshot(input = {}) {
  const sales = buildSalesAuditBridge(input.sales || [], {
    exp: input.exp, currency: input.currency, performanceMateriality: input.performanceMateriality
  });
  if (!sales.ok && sales.error) return sales;

  const evidence = input.evidenceStats || {};
  const totals = evidence.totals || {};
  const notes = Array.isArray(input.reviewerNotes) ? input.reviewerNotes : [];
  const sourceEntries = Array.isArray(input.sourceStatus?.entries) ? input.sourceStatus.entries : [];
  const openNotes = notes.filter(n => String(n?.status || 'open') !== 'closed').length;
  const sourceWarnings = sourceEntries.filter(x => x?.last?.injectionSuspected).length;
  const evidenceNodes = Number(totals.nodes) || 0;
  const evidenceEdges = Number(totals.edges) || 0;

  let readiness = 100;
  readiness -= Math.min(30, sales.metrics.invalidMoneyRows * 10);
  readiness -= Math.min(20, sales.metrics.negativeMarginRows * 5);
  readiness -= Math.min(15, sales.metrics.duplicates * 3);
  readiness -= Math.min(15, openNotes * 2);
  readiness -= Math.min(20, sourceWarnings * 10);
  if (sales.metrics.transactions && evidenceNodes === 0) readiness -= 10;
  readiness = Math.max(0, readiness);

  return {
    ok: sales.ok,
    version: TRUSTED_INTELLIGENCE_VERSION,
    readinessScore: readiness,
    sales,
    evidence: { nodes: evidenceNodes, edges: evidenceEdges },
    reviewer: { notes: notes.length, openNotes },
    sources: { checked: sourceEntries.length, warnings: sourceWarnings },
    authority: { canPost: false, canApproveOpinion: false, aiAuthority: 'advisory-only' }
  };
}

export function governanceCheck(action = {}) {
  const type = cleanText(action.type, 80).toLowerCase();
  const blocked = BLOCKED_ACTIONS.has(type);
  return {
    allowed: !blocked,
    type,
    reason: blocked
      ? 'الإجراء يمس سلطة محاسبية أو مراجعية نهائية ويتطلب محرك KOSIF الحتمي واعتمادًا بشريًا.'
      : 'الإجراء يقع ضمن التحليل أو التنظيم أو المساندة ولا يمنح الذكاء الاصطناعي سلطة اعتماد.'
  };
}
