// KOSIF v38 Trusted Audit Intelligence OS
// Hardened deterministic orchestration layer.
// Monetary calculations must flow through the v38 core.

import { parseMoney } from './engine/v38-core.mjs';

export const TRUSTED_INTELLIGENCE_VERSION = '38.1.0-trusted-layer';

const BLOCKED_ACTIONS = new Set([
  'post_entry', 'post_journal', 'approve_adjustment',
  'approve_opinion', 'finalize_opinion',
  'calculate_materiality', 'set_materiality'
]);

const clean = (v, n = 160) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function money(v) {
  return parseMoney(v == null || v === '' ? '0' : v, { exp: 2, currency: 'SAR' });
}

function idFor(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return `ktf-${(h >>> 0).toString(16)}`;
}

export function createEvidenceFinding(input = {}) {
  return {
    id: clean(input.id) || idFor(`${input.category}|${input.code}|${input.ref}`),
    category: clean(input.category || 'operational', 50),
    code: clean(input.code || 'OBSERVATION', 60),
    ref: clean(input.ref || 'kosif', 160),
    severity: ['low', 'medium', 'high', 'critical'].includes(input.severity) ? input.severity : 'medium',
    message: clean(input.message || '', 600),
    requiresHumanReview: true,
    createdBy: 'kosif-v38-deterministic-layer'
  };
}

export function buildSalesAuditBridge(sales = []) {
  const rows = Array.isArray(sales) ? sales : [];
  let revenue = 0n;
  let cost = 0n;
  const findings = [];

  for (const [index, row] of rows.entries()) {
    const r = money(row?.revenue);
    const c = money(row?.cost);
    if (!r.ok || !c.ok) {
      findings.push(createEvidenceFinding({
        category: 'data-quality',
        code: 'INVALID_MONEY',
        ref: row?.id || `row-${index + 1}`,
        severity: 'critical'
      }));
      continue;
    }
    revenue += r.minor;
    cost += c.minor;
    if (r.minor < c.minor) {
      findings.push(createEvidenceFinding({
        category: 'sales-audit',
        code: 'NEGATIVE_MARGIN',
        ref: row?.id || `row-${index + 1}`,
        severity: 'high'
      }));
    }
  }

  const profit = revenue - cost;
  return {
    ok: findings.every(x => x.code !== 'INVALID_MONEY'),
    version: TRUSTED_INTELLIGENCE_VERSION,
    metrics: {
      revenueMinor: revenue.toString(),
      costMinor: cost.toString(),
      grossProfitMinor: profit.toString(),
      precision: 'minor-unit-bigint',
      transactions: rows.length
    },
    findings,
    governance: {
      aiAuthority: 'advisory-only',
      humanApproval: 'required-for-posting-and-opinion'
    }
  };
}

export function governanceCheck(action = {}) {
  const type = clean(action.type, 80).toLowerCase();
  return {
    allowed: !BLOCKED_ACTIONS.has(type),
    type,
    reason: BLOCKED_ACTIONS.has(type)
      ? 'القرار النهائي يتطلب محرك KOSIF الحتمي واعتمادًا بشريًا.'
      : 'الإجراء تحليلي ولا يمنح AI سلطة اعتماد.'
  };
}
