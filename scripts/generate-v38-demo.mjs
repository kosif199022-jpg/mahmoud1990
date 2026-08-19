/*
 * KOSIF v38 — مولّد مختبر التدقيق الاصطناعي
 * بذرة 380019 — بيانات اصطناعية بالكامل: لا بيانات شخصية حقيقية
 * ولا نصوص معايير مرخصة. يولّد مجلد public/v38-demo.
 *
 *   node scripts/generate-v38-demo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SEED = 380019;
const OUT_DIR = path.join(process.cwd(), 'public', 'demo', 'v38');

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
const pick = arr => arr[Math.floor(rng() * arr.length)];
const int = (min, max) => min + Math.floor(rng() * (max - min + 1));
const money = (min, max) => BigInt(int(min, max)) * 100n + BigInt(int(0, 99)); // وحدات صغرى
const iso = d => d.toISOString().slice(0, 10);

/* ——— دليل الحسابات (1,000 حساب) ——— */
const SEGMENTS = [
  { pre: '1', type: 'asset', names: ['النقدية بالصندوق', 'البنك الأهلي — جاري', 'بنك الرياض — جاري', 'العملاء التجارية', 'مخصص الخسائر الائتمانية', 'المخزون — بضاعة', 'مصروفات مقدمة', 'تأمينات مستردة', 'أراضٍ', 'مباني', 'آلات ومعدات', 'سيارات نقل', 'أثاث ومفروشات', 'أجهزة حاسب', 'مجمع إهلاك المباني', 'مجمع إهلاك الآلات', 'مشاريع تحت التنفيذ', 'استثمارات مالية', 'ودائع طويلة الأجل'] },
  { pre: '2', type: 'liability', names: ['الموردون التجاريون', 'أوراق دفع', 'مصروفات مستحقة', 'رواتب مستحقة', 'ضريبة القيمة المضافة المستحقة', 'زكاة مستحقة', 'دائنو توزيعات', 'قروض بنكية طويلة', 'التزامات إيجار', 'إيرادات مؤجلة', 'مخصصات ضمان', 'التزامات منافع موظفين'] },
  { pre: '3', type: 'equity', names: ['رأس المال', 'احتياطي نظامي', 'احتياطي عام', 'أرباح مبقاة', 'جاري الشركاء'] },
  { pre: '4', type: 'revenue', names: ['إيرادات المبيعات', 'إيرادات خدمات', 'إيرادات عقود بناء', 'إيرادات أخرى', 'خصم مسموح به', 'مردودات المبيعات'] },
  { pre: '5', type: 'expense', names: ['تكلفة المبيعات', 'رواتب وأجور', 'بدل سكن', 'تأمينات اجتماعية', 'إهلاك المباني', 'إهلاك الآلات', 'إهلاك السيارات', 'صيانة وإصلاح', 'كهرباء ومياه', 'اتصالات وإنترنت', 'إيجارات', 'قرطاسية ومطبوعات', 'أتعاب مهنية', 'زكاة العام', 'مصروفات بنكية', 'مصروفات تدريب', 'تبرعات', 'خسائر ائتمانية'] }
];
const accounts = [];
for (const seg of SEGMENTS) {
  const majorCount = Math.ceil(1000 / 5 / 4);
  for (let m = 1; m <= 42 && accounts.length < 200; m++) {
    const major = seg.pre + String(m).padStart(2, '0');
    for (let s = 0; s < 5 && accounts.length < 200; s++) {
      const code = major + String(s + 1).padStart(2, '0');
      accounts.push({ code, name: pick(seg.names) + (s > 0 ? ' — فرع ' + int(1, 9) : ''), type: seg.type });
    }
  }
}
while (accounts.length < 1000) accounts.push({ code: '9' + String(accounts.length).padStart(3, '0'), name: 'حساب وسيط ' + accounts.length, type: 'suspense' });

/* ——— القيود (6,000 قيد متوازنة بالضبط) ——— */
const users = ['sys-gl', 'fin-mgr', 'ap-clerk', 'ar-clerk', 'aud-liaison'];
const journals = [];
const START = new Date('2026-01-01T00:00:00Z'), END = new Date('2026-12-31T00:00:00Z');
let jseq = 0;
for (let i = 0; i < 6000; i++) {
  const date = iso(new Date(START.getTime() + Math.floor(rng() * (END - START))));
  const nLines = rng() < 0.72 ? 2 : rng() < 0.85 ? 3 : 4;
  const amount = money(2_000, 9_500_000);
  const lines = [];
  const drAcc = pick(accounts), crAcc = pick(accounts.filter(a => a !== drAcc));
  lines.push({ account: drAcc.code, dr: amount.toString(), cr: null, desc: '' });
  lines.push({ account: crAcc.code, dr: null, cr: amount.toString(), desc: '' });
  for (let l = 2; l < nLines; l++) {
    const split = amount / BigInt(nLines - 1);
    const acc = pick(accounts);
    lines.push({ account: acc.code, dr: split.toString(), cr: null, desc: 'توزيع' });
    lines[1] = { account: lines[1].account, dr: null, cr: (BigInt(lines[1].cr) + split).toString(), desc: '' };
  }
  journals.push({ id: 'JV-2026-' + String(++jseq).padStart(5, '0'), date, memo: pick(['قيد مبيعات', 'قيد مشتريات', 'تسوية بنكية', 'قيد رواتب', 'استهلاك شهري', 'قيد ضريبة', 'تصحيح خطأ', 'قسط إيجار', 'قيد إقفال جزئي', 'مصروفات عمومية']), user: pick(users), source: 'auto', lines });
}

/* ——— سادة البيانات ——— */
const customers = Array.from({ length: 600 }, (_, i) => ({ id: 'CUS-' + String(i + 1).padStart(4, '0'), name: 'عميل اصطناعي ' + (i + 1), segment: pick(['تجزئة', 'جملة', 'حكومي', 'قطاع خاص']), creditLimit: int(50, 900) * 1000, balance: int(0, 2500) * 1000 }));
const suppliers = Array.from({ length: 300 }, (_, i) => ({ id: 'SUP-' + String(i + 1).padStart(4, '0'), name: 'مورد اصطناعي ' + (i + 1), terms: pick(['30 يومًا', '60 يومًا', 'فوري']), balance: int(0, 1800) * 1000 }));
const salesInvoices = Array.from({ length: 2500 }, (_, i) => ({ id: 'SI-2026-' + String(i + 1).padStart(5, '0'), customer: pick(customers).id, date: iso(new Date(START.getTime() + Math.floor(rng() * (END - START)))), amount: int(1, 480) * 1000, vat: 15, status: pick(['مسدد', 'مفتوح', 'متأخر']) }));
const purchaseInvoices = Array.from({ length: 1500 }, (_, i) => ({ id: 'PI-2026-' + String(i + 1).padStart(5, '0'), supplier: pick(suppliers).id, date: iso(new Date(START.getTime() + Math.floor(rng() * (END - START)))), amount: int(1, 350) * 1000, vat: 15, status: pick(['مسدد', 'مفتوح']) }));
const bankTx = Array.from({ length: 1000 }, (_, i) => ({ id: 'BT-' + String(i + 1).padStart(5, '0'), date: iso(new Date(START.getTime() + Math.floor(rng() * (END - START)))), amount: int(-400, 700) * 1000, type: pick(['إيداع', 'سحب', 'رسوم', 'فوائد', 'تحويل صادر', 'تحويل وارد']), matched: rng() > 0.12 }));
const employees = Array.from({ length: 250 }, (_, i) => ({ id: 'EMP-' + String(i + 1).padStart(4, '0'), role: pick(['محاسب', 'مراجع داخلي', 'محلل', 'إداري', 'فني']), grade: int(1, 12), salary: int(7, 45) * 1000 }));
const fixedAssets = Array.from({ length: 500 }, (_, i) => ({ id: 'FA-' + String(i + 1).padStart(4, '0'), name: 'أصل اصطناعي ' + (i + 1), category: pick(['مباني', 'آلات', 'سيارات', 'أجهزة']), cost: int(10, 800) * 1000, life: pick([5, 8, 10, 15]), method: 'قسط ثابت' }));
const inventory = Array.from({ length: 1000 }, (_, i) => ({ sku: 'SKU-' + String(i + 1).padStart(5, '0'), name: 'صنف اصطناعي ' + (i + 1), qty: int(0, 500), cost: int(5, 900), nrv: int(4, 950) }));
const leases = Array.from({ length: 60 }, (_, i) => ({ id: 'LSE-' + String(i + 1).padStart(3, '0'), asset: 'عقار/معدة ' + (i + 1), years: int(1, 10), annualPayment: int(40, 500) * 1000, rate: pick([0.05, 0.06, 0.07]) }));
const contracts = Array.from({ length: 100 }, (_, i) => ({ id: 'CTR-' + String(i + 1).padStart(3, '0'), customer: pick(customers).id, value: int(100, 5000) * 1000, stage: pick(['بداية', 'منفذ جزئيًا', 'قريب الإتمام', 'مكتمل']) }));
const risks = Array.from({ length: 80 }, (_, i) => ({ id: 'RSK-' + String(i + 1).padStart(3, '0'), title: 'خطر اصطناعي مرقّم ' + (i + 1), area: pick(['إيرادات', 'مخزون', 'ذمم', 'أصول ثابتة', 'التزامات', 'غش', 'تقديرات']), likelihood: pick(['منخفض', 'متوسط', 'مرتفع']), impact: pick(['منخفض', 'متوسط', 'مرتفع']) }));
const controls = Array.from({ length: 60 }, (_, i) => ({ id: 'CTL-' + String(i + 1).padStart(3, '0'), title: 'ضابط اصطناعي ' + (i + 1), type: pick(['وقائي', 'كاشف', 'تصحيحي']), automated: rng() > 0.5, frequency: pick(['يومي', 'أسبوعي', 'شهري']) }));
const pbc = Array.from({ length: 100 }, (_, i) => ({ id: 'PBC-' + String(i + 1).padStart(3, '0'), item: 'بند مطلوب ' + (i + 1), owner: pick(users), status: pick(['مستلم', 'بانتظار', 'مرفض']) }));
const evidenceManifest = Array.from({ length: 150 }, (_, i) => ({ id: 'EVD-' + String(i + 1).padStart(3, '0'), kind: pick(['مصادقة بنكية', 'كشف ذمم', 'جرد', 'عقد', 'فاتورة', 'محضر', 'تحليل']), status: pick(['موثق', 'مسودة', 'مفقود']) }));
const confirmations = Array.from({ length: 150 }, (_, i) => ({ id: 'CNF-' + String(i + 1).padStart(3, '0'), party: pick([...customers, ...suppliers]).id, sent: rng() > 0.2, replied: rng() > 0.45, agreed: rng() > 0.25 }));
const relatedParties = Array.from({ length: 30 }, (_, i) => ({ id: 'RP-' + String(i + 1).padStart(3, '0'), name: 'طرف ذو علاقة اصطناعي ' + (i + 1), relation: pick(['شركة شقيقة', 'مدير تنفيذي', 'مساهم رئيس', 'شركة تابعة']), txCount: int(0, 40) }));

/* ——— كتالوج السيناريوهات (83) ——— */
const SCENARIO_BASES = [
  ['IFRS 15', 'الاعتراف بالإيراد متعدد الالتزامات', 'accounting'], ['IFRS 9', 'الخسائر الائتمانية المتوقعة', 'accounting'], ['IFRS 16', 'قياس حق استخدام الأصول', 'accounting'],
  ['IAS 2', 'قياس المخزون بالأقل من التكلفة والصافي', 'accounting'], ['IAS 36', 'مؤشرات انخفاض قيمة وحدة توليد النقد', 'accounting'], ['IAS 38', 'رأسمالية التطوير', 'accounting'],
  ['IAS 12', 'أصول والتزامات ضريبية مؤجلة', 'accounting'], ['IAS 19', 'منفع نهاية الخدمة المحددة', 'accounting'], ['IAS 21', 'عملة أجنبية عالية التضخم', 'accounting'],
  ['IFRS 13', 'هرمية القيمة العادلة المستوى الثالث', 'accounting'], ['IAS 24', 'إفصاح الأطراف ذات العلاقة', 'accounting'], ['IAS 37', 'مخصص ضمان المنتجات', 'accounting'],
  ['IFRS 10', 'السيطرة الفعلية والقوائم المجمعة', 'accounting'], ['IFRS 3', 'حق الشراء والعناصر غير الملموسة', 'accounting'], ['IAS 40', 'تصنيف الاستثمار العقاري', 'accounting'],
  ['IFRS 18', 'فئات العرض الجديدة للإيراد', 'accounting-future'], ['IFRS 17', 'تعهدات التأمين — محفظة', 'accounting'], ['IAS 33', 'ربحية السهم المخففة', 'accounting'],
  ['ISA 315', 'فهم بيئة الكيان وتقييم المخاطر', 'audit'], ['ISA 240', 'تفكير الغش — تحريز الدخول', 'audit'], ['ISA 330', 'استجابة مخاطر الاعتماد على الضوابط', 'audit'],
  ['ISA 450', 'تقييم تحريف غير مصحح', 'audit'], ['ISA 500', 'كفاية وملاءمة الدليل', 'audit'], ['ISA 505', 'مصادقات موجبة وسلبية', 'audit'],
  ['ISA 530', 'معاينة الوحدات النقدية', 'audit'], ['ISA 540', 'تقديرات محاسبية معقدة', 'audit'], ['ISA 550', 'كشف معاملات الأطراف', 'audit'],
  ['ISA 560', 'أحداث لاحقة حتى تاريخ التقرير', 'audit'], ['ISA 570', 'شك الاستمرارية', 'audit'], ['ISA 700', 'تكوين الرأي غير المعدل', 'audit'],
  ['ISA 701', 'تحديد المسائل الرئيسية KAM', 'audit'], ['ISA 705', 'رأي متحفظ — تحريف جوهري', 'audit'], ['ISA 720', 'اتساق معلومات أخرى', 'audit'],
  ['ISQM 1', 'مراقبة الجودة على مستوى الشركة', 'quality'], ['ISQM 2', 'قرارات قبول الارتباط', 'quality'], ['ISA 220', 'جودة الارتباط وتوجيه الفريق', 'audit'],
  ['ISA 230', 'توثيق المراجعة الإلكتروني', 'audit'], ['ISA 250', 'الالتزام بالأنظمة — ضريبة وزكاة', 'audit-local'], ['ISA 260', 'تواصل لجنة المراجعة', 'audit'],
  ['ISA 320', 'تحديد الأهمية التنفيذية', 'audit'], ['ISA 520', 'إجراءات تحليلية تنبؤية', 'audit'], ['ISA 580', 'تمثيلات الإدارة المكتوبة', 'audit'],
  ['COSO', 'خريطة الضوابط إلى المكونات الخمسة', 'framework'], ['ZATCA-VAT', 'إثبات ضريبة مدخلات الفاتورة الإلكترونية', 'local-tax'], ['ZATCA-EINV', 'تكامل الفاتورة الإلكترونية المرحلة الثانية', 'local-tax'],
  ['ZATCA-ZAKAT', 'وعاء الزكاة والتسويات', 'local-tax'], ['SA-COMPANY-LAW', 'توزيعات ومخصص نظامية', 'local-law'], ['NCA-ECC', 'ضوابط الوصول للأنظمة المالية', 'local-security'],
  ['SDAIA-PDPL', 'بيانات العملاء ضمن ملف الارتباط', 'local-privacy'], ['IFRS S1/S2', 'ربط الإفصاح الاستدامة بالتمويل', 'sustainability']
];
const scenarios = [];
let sIdx = 0;
while (scenarios.length < 83) {
  const base = SCENARIO_BASES[sIdx % SCENARIO_BASES.length];
  const variant = Math.floor(sIdx / SCENARIO_BASES.length);
  scenarios.push({ id: 'SCN-' + String(scenarios.length + 1).padStart(3, '0'), ref: base[0], title: base[1] + (variant ? ' — حالة ' + (variant + 1) : ''), kind: base[2], procedures: int(2, 6), evidence: int(2, 8) });
  sIdx++;
}
const procedures = Array.from({ length: 83 }, (_, i) => ({ id: 'PRC-' + String(i + 1).padStart(3, '0'), scenario: scenarios[i % 83].id, title: 'إجراء اصطناعي مرتبط بـ' + scenarios[i % 83].ref, method: pick(['فحص مستندي', 'إعادة أداء', 'مصادقة', 'ملاحظة', 'تحليلي']), sampleSize: int(5, 60) }));

/* ——— النتائج والتحريفات المزروعة (12 + 12) ——— */
const findings = Array.from({ length: 12 }, (_, i) => ({ id: 'FND-' + String(i + 1).padStart(2, '0'), title: pick(['إيراد معترف قبل التسليم', 'مخزون لم يُخفض لصافي قيمة البيع', 'مصروف رسمل دون معيار', 'مصادقة بنكية لم تُستلم', 'فروق تسوية بنكية قديمة', 'التزام إيجار غير مقيس', 'مخصص ضمان منخفض', 'إفصاح طرف ذو علاقة ناقص', 'أصل متوقف لم يتوقف إهلاكه', 'فروق جرد غير محشوة', 'إيراد مؤجل لم يُؤجل', 'ضريبة مدخلات بلا فاتورة أهل']), severity: pick(['high', 'medium', 'low']), ref: pick(scenarios).ref }));
const misstatements = Array.from({ length: 12 }, (_, i) => ({ id: 'MS-' + String(i + 1).padStart(2, '0'), type: pick(['factual', 'judgmental', 'projected']), amount: (int(20, 4000) * 1000 * 100).toString(), corrected: rng() > 0.6, finding: pick(findings).id }));

/* ——— تثبيتات ضريبة وتسوية ——— */
const vatFixture = { period: '2026-Q4', standard: (int(40000, 90000) * 1000 * 100).toString(), input: (int(8000, 30000) * 1000 * 100).toString(), ratePct: 15 };
const bankrecFixture = { book: int(300, 800) * 1000, bank: int(280, 760) * 1000, outstanding: int(5, 60) * 1000, inTransit: int(3, 40) * 1000, fees: int(0, 3) * 1000 };

/* ——— إجمالي الميزان من القيود (تحقق التوازن) ——— */
let totalDr = 0n, totalCr = 0n;
for (const j of journals) for (const l of j.lines) { if (l.dr) totalDr += BigInt(l.dr); if (l.cr) totalCr += BigInt(l.cr); }
if (totalDr !== totalCr) throw new Error('DEMO_GEN_IMBALANCE');

/* ——— الكتابة ——— */
fs.mkdirSync(OUT_DIR, { recursive: true });
const files = {
  'manifest.json': {
    format: 'kosif-v38-demo',
    version: 1, seed: SEED, generatedAt: new Date().toISOString(),
    synthetic_only: true,
    disclaimer: 'بيانات اصطناعية بالكامل لأغراض الاختبار والتدريب والعرض؛ لا تحتوي بيانات شخصية حقيقية ولا نصوص معايير مرخصة.',
    period: '2026-01-01..2026-12-31', currency: 'SAR', exp: 2,
    counts: { accounts: accounts.length, journals: journals.length, lines: journals.reduce((a, j) => a + j.lines.length, 0) },
    totals: { journals: journals.length, lines: journals.reduce((a, j) => a + j.lines.length, 0), accounts: accounts.length, trialBalanceMinor: totalDr.toString(), balanced: totalDr === totalCr },
    datasets: {
      accounts: { file: 'accounts.json', count: accounts.length },
      journals: { file: 'journals.json', count: journals.length },
      customers: { file: 'customers.json', count: customers.length },
      suppliers: { file: 'suppliers.json', count: suppliers.length },
      'sales-invoices': { file: 'sales-invoices.json', count: salesInvoices.length },
      'purchase-invoices': { file: 'purchase-invoices.json', count: purchaseInvoices.length },
      'bank-transactions': { file: 'bank-transactions.json', count: bankTx.length },
      employees: { file: 'employees.json', count: employees.length },
      'fixed-assets': { file: 'fixed-assets.json', count: fixedAssets.length },
      inventory: { file: 'inventory.json', count: inventory.length },
      leases: { file: 'leases.json', count: leases.length },
      contracts: { file: 'contracts.json', count: contracts.length },
      risks: { file: 'risks.json', count: risks.length },
      controls: { file: 'controls.json', count: controls.length },
      pbc: { file: 'pbc.json', count: pbc.length },
      evidence: { file: 'evidence.json', count: evidenceManifest.length },
      scenarios: { file: 'scenarios.json', count: scenarios.length },
      procedures: { file: 'procedures.json', count: procedures.length },
      confirmations: { file: 'confirmations.json', count: confirmations.length },
      'related-parties': { file: 'related-parties.json', count: relatedParties.length },
      findings: { file: 'findings.json', count: findings.length },
      misstatements: { file: 'misstatements.json', count: misstatements.length },
      'vat-fixture': { file: 'vat-fixture.json', count: 1 },
      'bankrec-fixture': { file: 'bankrec-fixture.json', count: 1 }
    }
  },
  'accounts.json': accounts, 'journals.json': journals, 'customers.json': customers, 'suppliers.json': suppliers,
  'sales-invoices.json': salesInvoices, 'purchase-invoices.json': purchaseInvoices, 'bank-transactions.json': bankTx,
  'employees.json': employees, 'fixed-assets.json': fixedAssets, 'inventory.json': inventory, 'leases.json': leases,
  'contracts.json': contracts, 'risks.json': risks, 'controls.json': controls, 'pbc.json': pbc,
  'evidence.json': evidenceManifest, 'scenarios.json': scenarios, 'procedures.json': procedures,
  'confirmations.json': confirmations, 'related-parties.json': relatedParties,
  'findings.json': findings, 'misstatements.json': misstatements, 'vat-fixture.json': vatFixture, 'bankrec-fixture.json': bankrecFixture
};
let totalBytes = 0;
for (const [name, data] of Object.entries(files)) {
  const json = JSON.stringify(data);
  totalBytes += json.length;
  fs.writeFileSync(path.join(OUT_DIR, name), json);
}
console.log('V38_DEMO_GENERATED seed=' + SEED);
console.log('  journals=' + journals.length + ' lines=' + journals.reduce((a, j) => a + j.lines.length, 0));
console.log('  accounts=' + accounts.length + ' tbMinor=' + totalDr.toString() + ' balanced=' + (totalDr === totalCr));
console.log('  files=' + Object.keys(files).length + ' bytes=' + totalBytes);
