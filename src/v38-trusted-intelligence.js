/*
 * KOSIF v38 — Trusted Audit Intelligence OS
 * Orchestration primitives shared by audit, sales analytics and evidence review.
 *
 * Rule: derived indicators are deterministic. AI may explain findings but cannot
 * create accounting authority, postings, approvals or audit opinions.
 */

export const TRUSTED_INTELLIGENCE_VERSION = '38.0.0-trusted-layer';

const clamp = (n, min, max) => Math.min(Math.max(Number(n) || 0, min), max);

export function buildSalesAuditBridge(sales = []) {
  const rows = Array.isArray(sales) ? sales : [];
  const totals = rows.reduce((a, x) => {
    a.revenue += Number(x.revenue) || 0;
    a.cost += Number(x.cost) || 0;
    a.count += 1;
    return a;
  }, { revenue: 0, cost: 0, count: 0 });

  return {
    version: TRUSTED_INTELLIGENCE_VERSION,
    metrics: {
      revenue: totals.revenue,
      cost: totals.cost,
      grossProfit: totals.revenue - totals.cost,
      marginPct: totals.revenue ? ((totals.revenue - totals.cost) / totals.revenue) * 100 : 0,
      transactions: totals.count
    },
    governance: {
      accountingImpact: 'requires-deterministic-accounting-engine',
      aiAuthority: 'advisory-only'
    }
  };
}

export function createEvidenceFinding(input = {}) {
  return {
    id: String(input.id || crypto.randomUUID?.() || 'finding'),
    category: String(input.category || 'operational'),
    severity: ['low', 'medium', 'high', 'critical'].includes(input.severity) ? input.severity : 'medium',
    source: String(input.source || 'kosif'),
    confidence: clamp(input.confidence ?? 0, 0, 1),
    requiresHumanReview: true,
    createdBy: 'kosif-v38-deterministic-layer'
  };
}

export function governanceCheck(action = {}) {
  const blocked = new Set(['post_entry', 'approve_opinion', 'calculate_materiality']);
  return {
    allowed: !blocked.has(String(action.type || '')),
    reason: blocked.has(String(action.type || ''))
      ? 'القرار المحاسبي النهائي يتطلب محرك KOSIF الحتمي واعتمادًا بشريًا.'
      : 'الإجراء ضمن طبقة التحليل والمساندة.'
  };
}
