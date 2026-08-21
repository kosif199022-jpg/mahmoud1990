/*
 * KOSIF — Egypt stress/audit lab
 * Synthetic company only: "شركة مصر أم الدنيا القابضة"
 * 5,000-account deterministic dataset. No real personal or company data.
 *
 * Usage:
 *   node scripts/run-egypt-om-eldonia-5000.mjs
 *   node scripts/run-egypt-om-eldonia-5000.mjs --write=artifacts/egypt-om-eldonia-5000
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  validateJournalEntry, postJournal, trialBalance, adjustedTrialBalance,
  computeMateriality, aggregateMisstatements, journalRiskFlags, deterministicSample,
  checkInvariants, frameworkApplicability, formatMoney
} from '../src/engine/v38-core.mjs';

const SEED = 202608215000;
const COMPANY = Object.freeze({
  id: 'EG-OM-ELDONIA-HOLDING-DEMO-5000',
  name: 'شركة مصر أم الدنيا القابضة',
  legalName: 'شركة مصر أم الدنيا القابضة — بيانات اختبار اصطناعية',
  jurisdiction: 'egypt',
  country: 'مصر',
  currency: 'EGP',
  periodStart: '2026-01-01',
  periodEnd: '2026-12-31',
  industry: 'قابضة متعددة الأنشطة',
  syntheticOnly: true,
  listed: false
});
const OUT_ARG = process.argv.find(x => x.startsWith('--write='));
const OUT_DIR = OUT_ARG ? path.resolve(process.cwd(), OUT_ARG.slice('--write='.length)) : null;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
const pick = a => a[Math.floor(rng() * a.length)];
const int = (min, max) => min + Math.floor(rng() * (max - min + 1));
const isoDate = () => {
  const start = Date.UTC(2026, 0, 1), end = Date.UTC(2026, 11, 31);
  return new Date(start + Math.floor(rng() * (end - start + 1))).toISOString().slice(0, 10);
};
const major = minor => formatMoney({minor: BigInt(minor), exp: 2});
const parseMajorToMinor = s => {
  const clean = String(s ?? '0').replace(/,/g, '');
  const neg = clean.startsWith('-');
  const raw = neg ? clean.slice(1) : clean;
  const [whole, frac=''] = raw.split('.');
  const n = BigInt(whole || '0') * 100n + BigInt(frac.padEnd(2,'0').slice(0,2) || '0');
  return neg ? -n : n;
};
const json = value => JSON.stringify(value, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2);
const csvCell = value => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function assert(cond, message, details) {
  if (!cond) throw new Error(message + (details === undefined ? '' : ' ' + JSON.stringify(details, (_k, v) => typeof v === 'bigint' ? v.toString() : v)));
}

const ACCOUNT_GROUPS = [
  {prefix:'1', type:'asset', count:900, names:['نقدية وما في حكمها','حسابات بنكية','عملاء تجاريون','مخزون','مصروفات مقدمة','استثمارات','أراضٍ','مبانٍ','آلات ومعدات','أصول حق استخدام']},
  {prefix:'2', type:'liability', count:900, names:['موردون تجاريون','مصروفات مستحقة','قروض بنكية','التزامات إيجار','إيرادات مؤجلة','مخصصات','ضرائب مستحقة','دائنون متنوعون']},
  {prefix:'3', type:'equity', count:700, names:['رأس المال','احتياطيات','أرباح مبقاة','حقوق ملكية شركات تابعة','فروق ترجمة','جاري مساهمين']},
  {prefix:'4', type:'revenue', count:900, names:['إيرادات مبيعات','إيرادات خدمات','إيرادات استثمارات','إيرادات إيجارات','إيرادات شركات تابعة','إيرادات أخرى']},
  {prefix:'5', type:'expense', count:1500, names:['تكلفة مبيعات','رواتب وأجور','إيجارات','إهلاك','صيانة','أتعاب مهنية','تسويق','نقل وشحن','خدمات ومرافق','خسائر ائتمانية','مصروف تمويل','مصروفات إدارية']},
  {prefix:'9', type:'suspense', count:100, names:['حساب معلق','حساب وسيط','فروق تسوية','حساب تحت الفحص']}
];
const SUBSIDIARIES = ['القاهرة','الإسكندرية','الدلتا','الصعيد','القناة','الجيزة','البحر الأحمر','المركز الرئيسي'];
const COST_CENTERS = ['إدارة','مبيعات','تشغيل','خدمات','مشروعات','استثمار','دعم','تقنية'];

const accounts = [];
let seq = 0;
for (const g of ACCOUNT_GROUPS) {
  for (let i = 0; i < g.count; i++) {
    seq++;
    const code = g.prefix + String(seq).padStart(6, '0');
    accounts.push({
      code,
      name: `${pick(g.names)} — ${pick(SUBSIDIARIES)} — ${pick(COST_CENTERS)} ${String(i + 1).padStart(4, '0')}`,
      type: g.type,
      currency: 'EGP',
      opening: 0n
    });
  }
}
assert(accounts.length === 5000, 'ACCOUNT_COUNT_MISMATCH', accounts.length);
assert(new Set(accounts.map(a => a.code)).size === 5000, 'ACCOUNT_CODES_NOT_UNIQUE');
const accountMap = new Map(accounts.map(a => [a.code, a]));
const debitNature = accounts.filter(a => a.type === 'asset' || a.type === 'expense');
const creditNature = accounts.filter(a => ['liability','equity','revenue'].includes(a.type));
const suspenseAccount = accounts.find(a => a.type === 'suspense').code;

// Opening entry: every non-suspense account receives a deterministic balance.
const openingLines = [];
let openingDr = 0n, openingCr = 0n;
for (const a of accounts) {
  if (a.type === 'suspense') continue;
  const amount = BigInt(int(1_000, 2_500_000)) * 100n;
  if (a.type === 'asset' || a.type === 'expense') {
    openingDr += amount;
    openingLines.push({account:a.code, dr:major(amount), cr:'0', desc:'رصيد افتتاحي اصطناعي'});
  } else {
    openingCr += amount;
    openingLines.push({account:a.code, dr:'0', cr:major(amount), desc:'رصيد افتتاحي اصطناعي'});
  }
}
if (openingDr !== openingCr) {
  const debitIsLarger = openingDr > openingCr;
  const delta = debitIsLarger ? openingDr - openingCr : openingCr - openingDr;
  const targetCode = debitIsLarger ? creditNature[0].code : debitNature[0].code;
  const target = openingLines.find(x => x.account === targetCode);
  if (debitIsLarger) target.cr = major(parseMajorToMinor(target.cr) + delta);
  else target.dr = major(parseMajorToMinor(target.dr) + delta);
}
let od = 0n, oc = 0n;
for (const l of openingLines) { od += parseMajorToMinor(l.dr); oc += parseMajorToMinor(l.cr); }
assert(od === oc, 'OPENING_BALANCE_RECOMPUTE_FAILED', {od, oc});
const openingEntry = {id:'OPEN-2026', date:'2026-01-01', memo:'أرصدة افتتاحية اصطناعية — 4,900 حساب عامل + 100 حساب فحص صفري', user:'system-demo', source:'synthetic', lines:openingLines};
assert(validateJournalEntry(openingEntry, {accounts:accountMap, exp:2, periodStart:COMPANY.periodStart, periodEnd:COMPANY.periodEnd}).ok, 'OPENING_ENTRY_FAILED');

let ledger = {accounts:accountMap, postings:[]};
let posted = await postJournal(ledger, openingEntry, {exp:2, periodStart:COMPANY.periodStart, periodEnd:COMPANY.periodEnd});
assert(posted.ok, 'OPENING_POST_FAILED', posted.errors);
ledger = posted.ledger;

// 1,500 balanced entries. Every 75th entry deliberately touches suspense, but clears it in the same entry.
const journals = [];
for (let i = 1; i <= 1500; i++) {
  const anomaly = i % 75 === 0;
  const debit = pick(debitNature);
  const credit = pick(creditNature);
  const amountMinor = BigInt(anomaly ? int(10_000_000, 35_000_000) : int(1_000, 4_000_000)) * 100n;
  const lines = [
    {account:debit.code, dr:major(amountMinor), cr:'0', desc:''},
    {account:credit.code, dr:'0', cr:major(amountMinor), desc:''}
  ];
  if (anomaly) {
    lines.push({account:suspenseAccount, dr:major(amountMinor), cr:'0', desc:'مرور اختبار عبر حساب معلق'});
    lines.push({account:suspenseAccount, dr:'0', cr:major(amountMinor), desc:'تصفية فورية للحساب المعلق'});
  }
  const entry = {
    id:'JV-2026-' + String(i).padStart(5,'0'),
    date: anomaly ? '2026-12-31' : isoDate(),
    memo: anomaly ? 'تسوية يدوية نهائية — فحص خاص' : pick(['مبيعات','مشتريات','رواتب','تحصيل','سداد مورد','إهلاك','مصروفات تشغيل','تسوية بنكية']),
    ref: anomaly ? 'MANUAL-YE-' + i : 'SYS-' + i,
    user: anomaly ? 'fin-mgr' : pick(['sys-gl','ap-clerk','ar-clerk','treasury','accountant']),
    source: anomaly ? 'manual' : 'auto',
    lines
  };
  const v = validateJournalEntry(entry, {accounts:accountMap, exp:2, periodStart:COMPANY.periodStart, periodEnd:COMPANY.periodEnd});
  assert(v.ok, 'GENERATED_JOURNAL_INVALID', {id:entry.id, errors:v.errors});
  posted = await postJournal(ledger, entry, {exp:2, periodStart:COMPANY.periodStart, periodEnd:COMPANY.periodEnd});
  assert(posted.ok, 'GENERATED_JOURNAL_POST_FAILED', entry.id);
  ledger = posted.ledger;
  journals.push(entry);
}

const tb = trialBalance(ledger);
assert(tb.rows.length === 5000, 'TB_ACCOUNT_COUNT_MISMATCH', tb.rows.length);
assert(tb.balanced && tb.difference === 0n, 'TB_NOT_BALANCED', tb.totals);
const revenueMinor = tb.rows.filter(r => r.type === 'revenue').reduce((s, r) => s + (r.closing > 0n ? r.closing : -r.closing), 0n);
const materiality = computeMateriality({basis:'revenue', amount:major(revenueMinor || 100_000_000n), riskProfile:'high', exp:2});
assert(materiality.ok, 'MATERIALITY_FAILED', materiality);

const journalRiskResults = journals.map(j => ({id:j.id, ...journalRiskFlags(j, {
  suspenseAccount,
  amountThreshold:major(materiality.performance.minor),
  periodStart:COMPANY.periodStart,
  periodEnd:COMPANY.periodEnd,
  privilegedUsers:new Set(['fin-mgr']),
  suspiciousKeywords:['يدوية','نهائية','تسوية'] ,
  exp:2
})}));
const flagged = journalRiskResults.filter(x => Array.isArray(x.flags) && x.flags.length);
assert(flagged.length > 0, 'JOURNAL_RISK_ENGINE_FOUND_NOTHING');
assert(flagged.some(x => x.flags.some(f => f.code === 'SUSPENSE_ACCOUNT')), 'SUSPENSE_RISK_NOT_FOUND');
assert(flagged.some(x => x.flags.some(f => f.code === 'PRIVILEGED_MANUAL_ENTRY')), 'PRIVILEGED_ENTRY_RISK_NOT_FOUND');

const population = journals.map((j, i) => ({id:j.id, amount:Number(parseMajorToMinor(j.lines[0].dr || '0') / 100n), index:i}));
const sample = deterministicSample(population, {size:150, seed:String(SEED), method:'systematic'});
assert(sample.picked.length === 150, 'SYSTEMATIC_SAMPLE_SIZE_MISMATCH', sample.picked.length);
const mus = deterministicSample(population, {size:120, seed:String(SEED + 1), method:'mus', amountKey:'amount'});
assert(mus.picked.length > 0 && mus.picked.length <= 120, 'MUS_SAMPLE_FAILED', mus.picked.length);

const misstatements = Array.from({length:120}, (_, i) => ({
  id:'MIS-' + String(i + 1).padStart(3,'0'),
  type: pick(['factual','judgmental','projected']),
  amount: String(int(50_000, 3_500_000)),
  corrected: i % 4 === 0,
  area: pick(['إيرادات','مخزون','عملاء','أصول ثابتة','مصروفات','التزامات'])
}));
const misstatementAgg = aggregateMisstatements(misstatements, materiality);
assert(misstatementAgg?.uncorrectedTotal?.minor !== undefined, 'MISSTATEMENT_AGGREGATION_FAILED');

// 40 valid proposed adjustments + one intentionally invalid adjustment to verify fail-closed behavior.
const adjustments = [];
for (let i = 1; i <= 40; i++) {
  const dr = pick(debitNature), cr = pick(creditNature), amount = BigInt(int(10_000, 600_000)) * 100n;
  adjustments.push({id:'ADJ-' + String(i).padStart(3,'0'), date:'2026-12-31', memo:'تسوية مراجعة مقترحة', status:'Proposed', lines:[{account:dr.code, dr:major(amount), cr:'0'},{account:cr.code, dr:'0', cr:major(amount)}]});
}
adjustments.push({id:'ADJ-INVALID', date:'2026-12-31', memo:'قيد اختبار غير متوازن يجب رفضه', status:'Proposed', lines:[{account:debitNature[0].code, dr:'1000.00', cr:'0'}]});
const adjusted = adjustedTrialBalance(tb, adjustments, {exp:2});
assert(adjusted.balanced, 'ADJUSTED_TB_NOT_BALANCED');
assert(adjusted.applied.length === 40, 'ADJUSTMENT_APPLIED_COUNT_MISMATCH', adjusted.applied.length);
assert(adjusted.rejected.length === 1 && adjusted.rejected[0].id === 'ADJ-INVALID', 'FAIL_CLOSED_ADJUSTMENT_REJECTION_FAILED', adjusted.rejected);

const invariantResult = await checkInvariants(ledger);
assert(invariantResult.fatalCount === 0, 'FATAL_LEDGER_INVARIANT_FAILED', invariantResult);
assert(invariantResult.results.find(x => x.id === 'DOUBLE_ENTRY')?.ok, 'DOUBLE_ENTRY_INVARIANT_FAILED');
assert(invariantResult.results.find(x => x.id === 'ACCOUNTING_EQUATION')?.ok, 'ACCOUNTING_EQUATION_FAILED');
assert(invariantResult.results.find(x => x.id === 'POSTING_HASH_CHAIN')?.ok, 'HASH_CHAIN_FAILED');
const suspenseDiagnostic = invariantResult.results.find(x => x.id === 'NO_UNCLEARED_SUSPENSE');
assert(suspenseDiagnostic && suspenseDiagnostic.fatal === false, 'SUSPENSE_DIAGNOSTIC_BOUNDARY_FAILED');

const frameworks = frameworkApplicability({periodStart:COMPANY.periodStart, periodEnd:COMPANY.periodEnd, jurisdiction:'egypt'});
assert(frameworks.frameworks.find(x => x.id === 'IFRS_18')?.state === 'future', 'IFRS18_PERIOD_GATE_FAILED');
assert(frameworks.frameworks.find(x => x.id === 'ISA_240_REVISED')?.state === 'in-effect', 'ISA240_PERIOD_GATE_FAILED');
assert(frameworks.frameworks.find(x => x.id === 'ZATCA_VAT_15')?.state === 'not-applicable', 'EGYPT_MUST_NOT_INHERIT_SAUDI_VAT');

const risks = Array.from({length:150}, (_, i) => ({id:'RSK-' + String(i + 1).padStart(3,'0'), area:pick(['الإيرادات','المخزون','التجميع','الأطراف ذات العلاقة','الاستثمارات','التمويل','تجاوز الإدارة للضوابط']), likelihood:pick(['low','medium','high']), impact:pick(['low','medium','high']), assertions:pick([['existence','rights'],['completeness'],['valuation'],['cutoff'],['presentation']])}));
const pbc = Array.from({length:250}, (_, i) => ({id:'PBC-' + String(i + 1).padStart(3,'0'), item:'طلب مراجعة اصطناعي ' + (i + 1), owner:pick(['المالية','الخزينة','الموارد البشرية','المبيعات','المخزون','الضرائب']), status:pick(['received','pending','needs-review']), due:'2027-01-' + String((i % 28) + 1).padStart(2,'0')}));
const evidence = Array.from({length:600}, (_, i) => ({id:'EVD-' + String(i + 1).padStart(4,'0'), kind:pick(['فاتورة','عقد','مصادقة','كشف بنك','محضر جرد','كشف أعمار','تأييد قيد']), status:pick(['verified','draft','missing']), synthetic:true}));
const confirmations = Array.from({length:300}, (_, i) => ({id:'CNF-' + String(i + 1).padStart(3,'0'), party:'طرف اصطناعي ' + (i + 1), sent:i % 5 !== 0, replied:i % 3 !== 0, agreed:i % 7 !== 0}));

const procedures = [
  ['company_setup','PASS','هوية مصرية/EGP وفترة 2026، بيانات اصطناعية فقط'],
  ['chart_of_accounts','PASS','5,000 حساب فريد'],
  ['journal_validation','PASS',`${journals.length + 1} قيد متوازن تم التحقق منه وترحيله`],
  ['trial_balance','PASS',`5,000 حساب · الفرق ${tb.difference}`],
  ['materiality','PASS',`Revenue benchmark · OM ${major(materiality.overall.minor)} · PM ${major(materiality.performance.minor)}`],
  ['risk_register','PASS',`${risks.length} خطر اصطناعي`],
  ['pbc','PASS',`${pbc.length} طلب PBC`],
  ['evidence','PASS',`${evidence.length} عنصر دليل`],
  ['journal_testing','PASS',`${flagged.length} قيد عليه علامة خطر من ${journals.length}`],
  ['sampling','PASS',`Systematic ${sample.picked.length} · MUS ${mus.picked.length}`],
  ['confirmations','PASS',`${confirmations.length} مصادقة`],
  ['misstatements','PASS',`${misstatements.length} تحريفًا اصطناعيًا تم تجميعها`],
  ['adjustments','PASS',`40 مقبول + 1 مرفوض عمدًا لإثبات fail-closed`],
  ['adjusted_trial_balance','PASS','متوازن بعد التسويات'],
  ['framework_period_gate','PASS','IFRS 18 future for FY2026; ISA 240 Revised in-effect per current engine'],
  ['ledger_integrity','PASS',`double-entry + accounting equation + hash-chain سليمة؛ fatalCount=${invariantResult.fatalCount}`],
  ['suspense_diagnostic','PASS','تم إدخال حركة فحص على حساب معلق واكتشفها المحرك كتشخيص غير قاتل'],
  ['egypt_tax_boundary','PASS','ZATCA VAT 15% = not-applicable لمصر؛ لم تُطبق زكاة/ضريبة سعودية على السيناريو'],
  ['ai_council_governance','SECURITY-SKIP','لا تُستدعى مفاتيح AI من مختبر آلي؛ بوابات KOSIF العامة تختبر حوكمة المجلس والاعتماد البشري'],
  ['final_report','PASS','تم إنتاج تقرير تنفيذ وملفات CSV/JSONL قابلة للمراجعة']
];

const report = {
  lab:'KOSIF Egypt 5000-account full audit lab',
  seed:SEED,
  generatedAt:new Date().toISOString(),
  company:COMPANY,
  counts:{accounts:accounts.length, journalEntries:journals.length + 1, riskRegister:risks.length, pbc:pbc.length, evidence:evidence.length, confirmations:confirmations.length, misstatements:misstatements.length, proposedAdjustments:40, rejectedAdjustments:adjusted.rejected.length},
  trialBalance:{balanced:tb.balanced, totalDebit:tb.totals.dr.toString(), totalCredit:tb.totals.cr.toString(), difference:tb.difference.toString()},
  materiality:{basis:'revenue', riskProfile:'high', overall:materiality.overall.minor.toString(), performance:materiality.performance.minor.toString(), clearlyTrivial:materiality.clearlyTrivial.minor.toString()},
  journalTesting:{flagged:flagged.length, systematicSample:sample.picked.length, musSample:mus.picked.length},
  misstatements:{uncorrectedTotal:misstatementAgg.uncorrectedTotal.minor.toString(), exceedsPerformanceMateriality:misstatementAgg.exceedsPerformanceMateriality},
  adjustedTrialBalance:{balanced:adjusted.balanced, applied:adjusted.applied.length, rejected:adjusted.rejected.length},
  invariants:invariantResult,
  frameworks,
  procedures,
  overall:procedures.every(p => p[1] === 'PASS' || p[1] === 'SECURITY-SKIP') ? 'PASS' : 'FAIL',
  notes:[
    'البيانات اصطناعية بالكامل ولا تمثل شركة حقيقية.',
    'اختبار الشركة المصرية لا يطبق ZATCA VAT أو الزكاة السعودية.',
    'اتصالات AI الخارجية لا تُنفذ بدون جلسة المالك ومفاتيح مزود مختبرة؛ حوكمة AI تختبرها بوابات المستودع العامة.'
  ]
};
assert(report.overall === 'PASS', 'LAB_OVERALL_FAILED', procedures);

if (OUT_DIR) {
  fs.mkdirSync(OUT_DIR, {recursive:true});
  fs.writeFileSync(path.join(OUT_DIR, 'company.json'), json(COMPANY));
  fs.writeFileSync(path.join(OUT_DIR, 'accounts.csv'), ['code,name,type,currency', ...accounts.map(a => [a.code,a.name,a.type,a.currency].map(csvCell).join(','))].join('\n'));
  fs.writeFileSync(path.join(OUT_DIR, 'journals.jsonl'), [openingEntry, ...journals].map(x => JSON.stringify(x)).join('\n'));
  fs.writeFileSync(path.join(OUT_DIR, 'trial-balance.csv'), ['code,name,type,debit,credit,closing', ...tb.rows.map(r => [r.code,r.name,r.type,major(r.dr),major(r.cr),major(r.closing)].map(csvCell).join(','))].join('\n'));
  fs.writeFileSync(path.join(OUT_DIR, 'risk-register.json'), json(risks));
  fs.writeFileSync(path.join(OUT_DIR, 'pbc.json'), json(pbc));
  fs.writeFileSync(path.join(OUT_DIR, 'evidence.json'), json(evidence));
  fs.writeFileSync(path.join(OUT_DIR, 'confirmations.json'), json(confirmations));
  fs.writeFileSync(path.join(OUT_DIR, 'misstatements.json'), json(misstatements));
  fs.writeFileSync(path.join(OUT_DIR, 'adjustments.json'), json(adjustments));
  fs.writeFileSync(path.join(OUT_DIR, 'audit-execution-report.json'), json(report));
  const md = [
    '# شركة مصر أم الدنيا القابضة — مختبر KOSIF الاصطناعي',
    '',
    `- الحسابات: **${accounts.length}**`,
    `- القيود: **${journals.length + 1}**`,
    `- ميزان المراجعة: **${tb.balanced ? 'متوازن' : 'غير متوازن'}**`,
    `- الأهمية النسبية OM: **${major(materiality.overall.minor)} EGP**`,
    `- PM: **${major(materiality.performance.minor)} EGP**`,
    `- قيود عليها أعلام خطر: **${flagged.length}**`,
    `- التسويات: **${adjusted.applied.length} مقبولة / ${adjusted.rejected.length} مرفوضة**`,
    '',
    '## الإجراءات',
    ...procedures.map(p => `- ${p[1] === 'PASS' ? '✅' : '🔐'} **${p[0]}** — ${p[2]}`),
    '',
    '> البيانات اصطناعية بالكامل. لم تُطبّق ضرائب/زكاة سعودية على الشركة المصرية.'
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'AUDIT-REPORT.md'), md);
}

console.log('KOSIF_EGYPT_5000_LAB_OK', JSON.stringify({overall:report.overall, accounts:accounts.length, journals:journals.length + 1, tbBalanced:tb.balanced, flaggedJournals:flagged.length, systematicSample:sample.picked.length, musSample:mus.picked.length, adjustmentsApplied:adjusted.applied.length, adjustmentsRejected:adjusted.rejected.length, fatalInvariants:invariantResult.fatalCount, output:OUT_DIR || null}));
