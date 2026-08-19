import { analyzeSalesAuditBridge } from '../src/v38-trusted-sales-audit-bridge.mjs';

let pass = 0;
let fail = 0;
const ok = (c, m) => c ? pass++ : (fail++, console.log('FAIL '+m));

const r = analyzeSalesAuditBridge([
  { date: '2026-08-01', product: 'A', revenue: 100, cost: 60, customer: 'x' },
  { date: '2026-08-01', product: 'A', revenue: 100, cost: 60, customer: 'x' },
  { date: '2026-08-02', product: 'B', revenue: 50, cost: 70, customer: 'y' }
]);

ok(r.count === 3, 'count');
ok(r.grossProfit === 20, 'profit');
ok(r.exceptions.some(x => x.type === 'duplicate_sale_candidate'), 'duplicate');
ok(r.exceptions.some(x => x.type === 'cost_exceeds_revenue'), 'cost');
ok(r.governance.postingAllowed === false, 'governance');

if (fail) process.exit(1);
console.log(`V38_SALES_AUDIT_BRIDGE pass=${pass} fail=${fail}`);
