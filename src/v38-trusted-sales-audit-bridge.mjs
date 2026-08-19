/*
 * KOSIF v38 — Sales to Trusted Audit Bridge
 *
 * يحول مؤشرات المبيعات إلى إشارات مراجعة قابلة للتتبع.
 * لا ينشئ أرقامًا محاسبية ولا يعتمد أرباحًا أو قيودًا.
 */

function money(value) {
  const s = String(value ?? '0').replace(/[,_\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return 0n;
  const [i, f = ''] = s.split('.');
  return BigInt(i + f.padEnd(2, '0').slice(0, 2));
}

export function analyzeSalesAuditBridge(rows = []) {
  const sales = Array.isArray(rows) ? rows : [];
  const totals = sales.reduce((a, r) => ({
    revenue: a.revenue + money(r.revenue),
    cost: a.cost + money(r.cost),
    qty: a.qty + Number(r.qty || 0)
  }), { revenue: 0n, cost: 0n, qty: 0 });

  const exceptions = [];
  const seen = new Set();
  for (const row of sales) {
    const key = [row.date, row.product, row.revenue, row.customer].join('|');
    if (seen.has(key)) exceptions.push({ type: 'duplicate_sale_candidate', key });
    seen.add(key);
    if (money(row.cost) > money(row.revenue)) exceptions.push({ type: 'cost_exceeds_revenue', product: row.product || null });
  }

  const grossProfit = totals.revenue - totals.cost;
  return {
    count: sales.length,
    totals: {
      revenue: totals.revenue.toString(),
      cost: totals.cost.toString(),
      qty: totals.qty
    },
    grossProfit: grossProfit.toString(),
    grossMargin: totals.revenue ? Number(grossProfit) / Number(totals.revenue) : 0,
    exceptions,
    precision: 'minor-unit-bigint',
    governance: { postingAllowed: false, requiresEvidence: true }
  };
}
