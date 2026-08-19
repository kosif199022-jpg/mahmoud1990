import { analyzeSalesAuditBridge } from '../src/v38-trusted-sales-audit-bridge.mjs';

let pass = 0;
let fail = 0;
const ok = (c, m) => c ? pass++ : (fail++, console.log('FAIL '+m));
const throws = (fn, m) => {
  try { fn(); fail++; console.log('FAIL '+m); }
  catch { pass++; }
};

const r = analyzeSalesAuditBridge([
  { date: '2026-08-01', product: 'A', revenue: 100, cost: 60, customer: 'x' },
  { date: '2026-08-01', product: 'A', revenue: 100, cost: 60, customer: 'x' },
  { date: '2026-08-02', product: 'B', revenue: 50, cost: 70, customer: 'y' }
]);

ok(r.count === 3, 'count');
ok(r.grossProfit === '6000', 'profit minor units');
ok(r.totals.revenue === '25000', 'revenue minor units');
ok(r.totals.cost === '19000', 'cost minor units');
ok(r.precision === 'minor-unit-bigint', 'precision contract');
ok(r.exceptions.some(x => x.type === 'duplicate_sale_candidate'), 'duplicate');
ok(r.exceptions.some(x => x.type === 'cost_exceeds_revenue'), 'cost');
ok(r.governance.postingAllowed === false, 'governance');

const penny = analyzeSalesAuditBridge([{ revenue: '0.01', cost: '0', qty: 1 }]);
ok(penny.totals.revenue === '1' && penny.grossProfit === '1', '0.01 SAR');

const negative = analyzeSalesAuditBridge([{ revenue: '-1.25', cost: '-0.25', qty: 1 }]);
ok(negative.grossProfit === '-100', 'negative values');

const separated = analyzeSalesAuditBridge([{ revenue: '1,234.56', cost: '234.56', qty: 1 }]);
ok(separated.totals.revenue === '123456' && separated.grossProfit === '100000', 'separators');

const huge = analyzeSalesAuditBridge([{ revenue: '9007199254740993.99', cost: '0', qty: 1 }]);
ok(huge.totals.revenue === '900719925474099399', 'large values preserve precision');

const zero = analyzeSalesAuditBridge([{ revenue: '0', cost: '0', qty: 0 }]);
ok(zero.grossProfit === '0' && zero.grossMargin === 0, 'zero');

throws(() => analyzeSalesAuditBridge([{ revenue: 'abc', cost: '0' }]), 'malformed rejected');
throws(() => analyzeSalesAuditBridge([{ revenue: '1.999', cost: '0' }]), 'over precision rejected');
throws(() => analyzeSalesAuditBridge([{ revenue: '', cost: '0' }]), 'empty monetary value rejected');

if (fail) process.exit(1);
console.log(`V38_SALES_AUDIT_BRIDGE pass=${pass} fail=${fail}`);
