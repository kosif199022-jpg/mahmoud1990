/* Unit tests for the deterministic accounting engine.
 *
 * The other gates check that features are *present*. This one checks that the
 * arithmetic is *right*, which is the only property that matters for an audit tool:
 * a wrong bucket silently moves money between the balance sheet and profit or loss,
 * and the accounting equation still balances afterwards, so nothing downstream
 * notices. Before this suite existed, "تكلفة المبيعات" was classified as revenue —
 * on a balanced trial balance that reported a 350,000 profit instead of 160,000.
 *
 * The engine ships as browser globals inside an IIFE, so the functions under test are
 * extracted from source and evaluated in isolation rather than imported.
 */
import fs from 'node:fs';

const SRC = 'public/v36-features.js';
/* CRLF checkout (core.autocrlf=true on Windows) breaks the \n-anchored
   extraction regexes below; normalize to LF before parsing. */
const s = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');

function fnSource(name) {
  const i = s.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`${name}() not found in ${SRC}`);
  const e = s.indexOf('\n}', i);
  if (e < 0) throw new Error(`${name}() has no closing brace`);
  return s.slice(i, e + 2);
}
function blockSource(re, label) {
  const m = re.exec(s);
  if (!m) throw new Error(`${label} not found in ${SRC}`);
  return m[0];
}

/* Same accessor and sign conventions the engine uses: bal() is debit-positive. */
const preamble = `
const num=v=>Number(String(v??0).replace(/[،,\\s]/g,''))||0;
function code(a){return a.code||a.accountCode||a.account_no||a.account||''}
function name(a){return a.name||a.accountName||a.title||''}
function bal(a){if(Number.isFinite(+a.balance))return +a.balance;return num(a.debit)-num(a.credit)}
`;

const engine = new Function(
  preamble +
  blockSource(/const CAT_BY_CODE=[^\n]*\n/, 'CAT_BY_CODE') +
  fnSource('categoryFromCode') +
  blockSource(/const NAME_RULES=\[[\s\S]*?\n\];\n/, 'NAME_RULES') +
  fnSource('classifyAccount') +
  'return {classifyAccount,categoryFromCode,bal}'
)();

let failures = 0;
const fail = (m) => { failures++; console.error('  ✗ ' + m); };
const eq = (got, want, label) => { if (got !== want) fail(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };

/* ── 1. classification, by code and by name ──────────────────────────────── */
const ACCOUNTS = [
  ['110100', 'النقد لدى البنوك', 'asset'],
  ['120100', 'ذمم مدينة تجارية', 'asset'],
  ['120300', 'مصروفات مدفوعة مقدمًا', 'asset'],
  ['120400', 'إيرادات مستحقة غير مفوترة', 'asset'],
  ['130100', 'المخزون', 'asset'],
  ['140100', 'أوراق قبض', 'asset'],
  ['150900', 'مجمع إهلاك الممتلكات والمعدات', 'asset'],
  ['160100', 'أصل حق الاستخدام', 'asset'],
  ['210100', 'ذمم دائنة تجارية', 'liability'],
  ['210300', 'أوراق دفع', 'liability'],
  ['210500', 'مصروفات مستحقة الدفع', 'liability'],
  ['211000', 'إيرادات مقبوضة مقدمًا', 'liability'],
  ['212000', 'ضريبة القيمة المضافة المستحقة', 'liability'],
  ['213000', 'مخصص الزكاة', 'liability'],
  ['220100', 'قرض بنكي طويل الأجل', 'liability'],
  ['221000', 'التزام عقد الإيجار', 'liability'],
  ['230000', 'مخصص مكافأة نهاية الخدمة', 'liability'],
  ['310000', 'رأس المال', 'equity'],
  ['320000', 'احتياطي نظامي', 'equity'],
  ['330000', 'أرباح مبقاة', 'equity'],
  ['410000', 'إيرادات المبيعات', 'revenue'],
  ['420000', 'إيرادات الخدمات', 'revenue'],
  ['510000', 'تكلفة المبيعات', 'expense'],
  ['520100', 'مصروف الرواتب والأجور', 'expense'],
  ['520200', 'مصاريف البيع والتسويق', 'expense'],
  ['520300', 'مصروف إهلاك', 'expense'],
  ['530000', 'مصروف الزكاة', 'expense'],
  ['540000', 'مصروف ضريبة الدخل', 'expense'],
  ['550000', 'مصاريف تمويلية', 'expense'],
];

for (const [c, n, want] of ACCOUNTS) {
  eq(engine.classifyAccount({ code: c, name: n }).cat, want, `by code ${c} «${n}»`);
  /* The name path is the fallback for charts without codes, and it is where the
   * qualifier ordering matters, so it is held to the same standard. */
  eq(engine.classifyAccount({ name: n }).cat, want, `by name «${n}»`);
}

/* Codes are authoritative even when the name would suggest otherwise. */
eq(engine.classifyAccount({ code: '510000', name: 'إيرادات المبيعات' }).basis, 'code', 'code wins over name (basis)');
eq(engine.classifyAccount({ code: '510000', name: 'إيرادات المبيعات' }).cat, 'expense', 'code wins over name (cat)');
eq(engine.classifyAccount({ name: 'حساب غير معروف تمامًا' }).basis, 'default', 'unmatched name reports default basis');

/* Saudi exports frequently carry Arabic-Indic digits. */
eq(engine.categoryFromCode('٤١٠٠'), 'revenue', 'arabic-indic digits');
eq(engine.categoryFromCode('١١٠١٠٠'), 'asset', 'arabic-indic asset code');
eq(engine.categoryFromCode('A-2100'), 'liability', 'code with alpha prefix');
eq(engine.categoryFromCode(''), null, 'empty code');
eq(engine.categoryFromCode('abc'), null, 'non-numeric code');

/* ── 2. a balanced trial balance must produce a balanced draft ────────────── */
const TB = [
  ['110100', 'النقد لدى البنوك', 450000, 0],
  ['120100', 'ذمم مدينة تجارية', 320000, 0],
  ['120300', 'مصروفات مدفوعة مقدمًا', 40000, 0],
  ['130100', 'المخزون', 280000, 0],
  ['150100', 'ممتلكات وآلات ومعدات', 900000, 0],
  ['150900', 'مجمع إهلاك الممتلكات', 0, 180000],
  ['210100', 'ذمم دائنة تجارية', 0, 260000],
  ['211000', 'إيرادات مقبوضة مقدمًا', 0, 50000],
  ['220100', 'قرض بنكي طويل الأجل', 0, 400000],
  ['230000', 'مخصص مكافأة نهاية الخدمة', 0, 90000],
  ['310000', 'رأس المال', 0, 700000],
  ['330000', 'أرباح مبقاة', 0, 150000],
  ['410000', 'إيرادات المبيعات', 0, 1400000],
  ['510000', 'تكلفة المبيعات', 840000, 0],
  ['520100', 'مصروف الرواتب والأجور', 260000, 0],
  ['520300', 'مصروف إهلاك', 90000, 0],
  ['550000', 'مصاريف تمويلية', 50000, 0],
].map(([code, name, debit, credit]) => ({ code, name, debit, credit }));

eq(TB.reduce((t, a) => t + a.debit, 0), TB.reduce((t, a) => t + a.credit, 0), 'fixture trial balance is balanced');

const sums = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
for (const a of TB) sums[engine.classifyAccount(a).cat] += engine.bal(a);
const profit = -(sums.revenue + sums.expense);

eq(sums.asset, 1810000, 'total assets');
eq(-sums.liability, 800000, 'total liabilities');
eq(-sums.equity, 850000, 'total equity');
eq(-sums.revenue, 1400000, 'total revenue');
eq(sums.expense, 1240000, 'total expenses');
eq(profit, 160000, 'profit for the period');

/* A = L + E + P must hold exactly on a balanced trial balance. */
eq(sums.asset - (-sums.liability + -sums.equity + profit), 0, 'accounting equation residual');
eq(sums.asset + sums.liability + sums.equity + sums.revenue + sums.expense, 0, 'debit-positive residual');

/* ── 3. the specific regression that motivated this suite ─────────────────── */
eq(engine.classifyAccount({ name: 'تكلفة المبيعات' }).cat, 'expense', 'COGS is not revenue');
eq(engine.classifyAccount({ name: 'مصروفات مدفوعة مقدمًا' }).cat, 'asset', 'prepaid expense is an asset');
eq(engine.classifyAccount({ name: 'إيرادات مقبوضة مقدمًا' }).cat, 'liability', 'deferred revenue is a liability');
eq(engine.classifyAccount({ name: 'مجمع إهلاك الممتلكات' }).cat, 'asset', 'accumulated depreciation is contra-asset');

if (failures) {
  console.error(`KOSIF_ACCOUNTING_CHECK_FAILED (${failures})`);
  process.exit(2);
}
console.log('KOSIF_ACCOUNTING_CHECK_OK', JSON.stringify({
  accounts: ACCOUNTS.length,
  assertions: ACCOUNTS.length * 2 + 19,
  trialBalance: { assets: sums.asset, liabilities: -sums.liability, equity: -sums.equity, profit },
}));
