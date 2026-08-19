/*
 * KOSIF v38 — Sales to Trusted Audit Bridge
 *
 * يحول مؤشرات المبيعات إلى إشارات مراجعة قابلة للتتبع.
 * لا ينشئ أرقامًا محاسبية ولا يعتمد أرباحًا أو قيودًا.
 */

export function analyzeSalesAuditBridge(rows = []) {
  const sales = Array.isArray(rows) ? rows : [];
  const totals = sales.reduce((a, r) => ({
    revenue: a.revenue + Number(r.revenue || 0),
    cost: a.cost + Number(r.cost || 0),
    qty: a.qty + Number(r.qty || 0)
  }), { revenue: 0, cost: 0, qty: 0 });

  const exceptions = [];
  const seen = new Set();
  for (const row of sales) {
    const key = [row.date, row.product, row.revenue, row.customer].join('|');
    if (seen.has(key)) exceptions.push({ type: 'duplicate_sale_candidate', key });
    seen.add(key);
    if (Number(row.cost || 0) > Number(row.revenue || 0)) exceptions.push({ type: 'cost_exceeds_revenue', product: row.product || null });
  }

  return {
    count: sales.length,
    totals,
    grossProfit: totals.revenue - totals.cost,
    grossMargin: totals.revenue ? (totals.revenue - totals.cost) / totals.revenue : 0,
    exceptions,
    governance: { postingAllowed: false, requiresEvidence: true }
  };
}
