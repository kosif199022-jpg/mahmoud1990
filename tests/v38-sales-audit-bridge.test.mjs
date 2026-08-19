import { analyzeSalesAuditBridge } from '../src/v38-trusted-sales-audit-bridge.mjs';

let pass = 0;
let fail = 0;
const ok = (c, m) => c ? (pass++, console.log('✅ ' + m)) : (fail++, console.log('❌ ' + m));

const r = analyzeSalesAuditBridge([
  { date: '2026-08-01', product: 'نعيمي', revenue: 100, cost: 60, customer: 'A' },
  { date: '2026-08-01', product: 'نعيمي', revenue: 100, cost: 60, customer: 'A' },
  { date: '2026-08-02', product: 'حري', revenue: 50, cost: 70, customer: 'B' }
]);

ok(r.count === 3, 'counts sales rows');
ok(r.grossProfit === 20, 'computes gross profit deterministically');
ok(r.exceptions.some(x => x.type === 'duplicate_sale_candidate'), 'detects duplicate candidate');
ok(r.exceptions.some(x => x.type === 'cost_exceeds_revenue'), 'detects cost exception');
ok(r.governance.postingAllowed === false, 'does not authorize posting');

console.log(`V38_SALES_AUDIT_BRIDGE pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
