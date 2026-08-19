/*
 * KOSIF v38 — Books Bridge
 * جسر إلى Open Library (عشرات ملايين الكتب) مقيّدًا بمواضيع المحاسبة والأعمال،
 * مع تخزين مؤقت في KV لمدة 24 ساعة، بالإضافة إلى فهرس مهني منسق محلي.
 */
const CACHE_TTL = 24 * 60 * 60;
const ALLOWED_SUBJECTS = new Set(['accounting', 'business', 'audit', 'finance']);
const FIELDS = 'key,title,author_name,first_publish_year,edition_count,ia,cover_i,isbn,subject,publisher,language,number_of_pages_median,has_fulltext';

function cacheKeyOf({ q, subject, limit, offset }) {
  const raw = `v1|${q}|${subject}|${limit}|${offset}`;
  return 'kosif:v38:books:cache:' + raw.replace(/[^A-Za-z0-9\u0600-\u06FF|_-]/g, c => c.charCodeAt(0).toString(16)).slice(0, 240);
}

function normalizeDoc(doc, q) {
  const authors = (doc.author_name || []).slice(0, 5);
  return {
    id: String(doc.key || '').replace(/^\/works\//, 'OL-'),
    title: String(doc.title || ''),
    authors,
    year: doc.first_publish_year || null,
    editions: doc.edition_count || 0,
    publisher: (doc.publisher || [])[0] || null,
    pages: doc.number_of_pages_median || null,
    languages: (doc.language || []).slice(0, 3),
    hasFulltext: !!doc.has_fulltext,
    readableOnline: !!doc.ia?.length,
    internetArchiveId: (doc.ia || [])[0] || null,
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    url: doc.key ? `https://openlibrary.org${doc.key}` : null,
    readUrl: (doc.ia || [])[0] ? `https://archive.org/details/${doc.ia[0]}` : null,
    subjects: (doc.subject || []).filter(s => ALLOWED_SUBJECTS.has(String(s).toLowerCase())).slice(0, 6),
    matchedQuery: q
  };
}

export async function searchOpenLibrary(env, { q, subject = 'accounting', limit = 24, offset = 0 }) {
  const safeSubject = ALLOWED_SUBJECTS.has(subject) ? subject : 'accounting';
  const cleanQ = String(q || '').slice(0, 120);
  const cacheKey = cacheKeyOf({ q: cleanQ, subject: safeSubject, limit, offset });
  if (env?.DATA) {
    const cached = await env.DATA.get(cacheKey, 'json');
    if (cached) return { ...cached, cached: true };
  }
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQ)}&subject=${encodeURIComponent(safeSubject)}&fields=${FIELDS}&limit=${limit}&offset=${offset}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let res;
  try { res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'KOSIF-v38-BooksBridge/1.0' } }); }
  catch { clearTimeout(timer); return { ok: false, error: 'BOOKS_UPSTREAM_UNREACHABLE', message: 'تعذر الوصول إلى Open Library الآن.' }; }
  clearTimeout(timer);
  if (!res.ok) return { ok: false, error: `BOOKS_UPSTREAM_${res.status}`, message: 'رفض خادم الكتب الطلب.' };
  let data;
  try { data = await res.json(); } catch { return { ok: false, error: 'BOOKS_UPSTREAM_INVALID_JSON', message: 'استجابة غير صالحة من خادم الكتب.' }; }
  const total = Number(data.numFound) || 0;
  const books = (data.docs || []).map(d => normalizeDoc(d, cleanQ));
  const payload = {
    provider: 'openlibrary',
    universe: 'عشرات ملايين العناوين عبر Open Library — مقيّدة هنا بمواضيع المحاسبة والأعمال',
    subject: safeSubject,
    totalMatches: total,
    page: { offset, limit, returned: books.length },
    books,
    attribution: 'بيانات الكتب من Open Library (رخصة مفتوحة)؛ القراءة الكاملة حيثما تتيحها أرشيف الإنترنت.'
  };
  if (env?.DATA) await env.DATA.put(cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL }).catch(() => {});
  return { ...payload, cached: false };
}

/* — فهرس مهني منسق: مراجع مختارة لا يستغني عنها مراجع/محاسب — */
const CURATED = [
  { section: 'المعايير الدولية للتقارير المالي IFRS/IAS', items: [
    ['IFRS 1', 'التبني الأول للمعايير الدولية للتقارير المالي'], ['IFRS 2', 'مدفوعات الأسهم'], ['IFRS 3', 'اندماج الأعمال'], ['IFRS 5', 'الأصول غير المتداولة المحتفظة للبيع والأنشطة المتوقفة'], ['IFRS 7', 'الإفصاحات المالية للأدوات المالية'], ['IFRS 8', 'القطاعات التشغيلية'], ['IFRS 9', 'الأدوات المالية'], ['IFRS 10', 'القوائم المالية المجمعة'], ['IFRS 11', 'الاتفاقيات المشتركة'], ['IFRS 12', 'الإفصاح عن الحصص في كيانات أخرى'], ['IFRS 13', 'القيمة العادلة'], ['IFRS 15', 'الإيراد من العقود مع العملاء'], ['IFRS 16', 'عقود الإيجار'], ['IFRS 17', 'عقود التأمين'], ['IFRS 18', 'عرض التقارير المالية والإفصاح (الإصدار القادم)'], ['IAS 1', 'عرض القوائم المالية'], ['IAS 2', 'المخزون'], ['IAS 7', 'قائمة التدفقات النقدية'], ['IAS 8', 'السياسات المحاسبية والتقديرات والأخطاء'], ['IAS 10', 'الأحداث اللاحقة لتاريخ الميزانية'], ['IAS 12', 'ضرائب الدخل'], ['IAS 16', 'الممتلكات والآلات والمعدات'], ['IAS 19', 'منافع الموظفين'], ['IAS 21', 'آثار التغيرات في أسعار الصرف'], ['IAS 23', 'تكاليف الاقتراض'], ['IAS 24', 'الإفصاح عن الأطراف ذات العلاقة'], ['IAS 27', 'القوائم المالية المنفصلة'], ['IAS 28', 'الاستثمارات في الشركات الزميلة والمشتركة'], ['IAS 29', 'التقرير المالي في الاقتصادات شديدة التضخم'], ['IAS 33', 'ربحية السهم'], ['IAS 34', 'التقرير المالي المرحلي'], ['IAS 36', 'انخفاض قيمة الأصول'], ['IAS 37', 'المخصصات والالتزامات المحتملة والأصول المحتملة'], ['IAS 38', 'الأصول غير الملموسة'], ['IAS 40', 'الاستثمار العقاري'], ['IAS 41', 'الزراعة']
  ] },
  { section: 'معايير المراجعة الدولية ISA', items: [
    ['ISA 200', 'الأهداف العامة للمستقل المراجع'], ['ISA 210', 'الاتفاق على شروط الارتباط'], ['ISA 220', 'إدارة الجودة لمراجعة القوائم المالية'], ['ISA 230', 'التوثيق المراجعي'], ['ISA 240', 'المسؤوليات المتعلقة بالغش في مراجعة القوائم المالية'], ['ISA 250', 'مراعاة القوانين واللوائح'], ['ISA 260', 'التواصل مع أولياء الأمور'], ['ISA 265', 'التواصل بشأن أوجه القصور في الرقابة الداخلية'], ['ISA 315', 'تحديد وتقييم مخاطر التحريف الجوهري'], ['ISA 320', 'الأهمية النسبية عند التخطيط والتنفيذ'], ['ISA 330', 'استجابات المراجع للمخاطر المقيّمة'], ['ISA 402', 'اعتبارات المراجعة للكيانات المستخدمة لخدمات مؤسسة خدمية'], ['ISA 450', 'تقييم التحريفات المكتشفة'], ['ISA 500', 'أدلة المراجعة'], ['ISA 501', 'أدلة محددة لبنود محددة'], ['ISA 505', 'المصادقات الخارجية'], ['ISA 510', 'ارتباطات المراجعة الأولية — الأرصدة الافتتاحية'], ['ISA 520', 'الإجراءات التحليلية'], ['ISA 530', 'معاينة المراجعة'], ['ISA 540', 'مراجعة التقديرات المحاسبية'], ['ISA 550', 'الأطراف ذات العلاقة'], ['ISA 560', 'الأحداث اللاحقة'], ['ISA 570', 'الاستمرارية'], ['ISA 580', 'التمثيلات'], ['ISA 600', 'مراجعة القوائم المالية المجمعة'], ['ISA 610', 'استخدام عمل مراجعة الوظائف'], ['ISA 700', 'تكوين الرأي والإبلاغ عنه'], ['ISA 701', 'الإبلاغ عن المسائل الرئيسية للمراجعة KAM'], ['ISA 705', 'تعديلات الرأي'], ['ISA 706', 'فقرات التأكيد والقيود في التقرير'], ['ISA 720', 'مسؤوليات المراجع عن المعلومات المصاحبة']
  ] },
  { section: 'مراجع سعودية رسمية', items: [
    ['SOCPA-IFRS-2025', 'المعايير الدولية للتقارير المالي المعتمدة في المملكة (طبعة 2025)'], ['SOCPA-ISA-2026', 'المعايير الدولية لإدارة الجودة والمراجعة (طبعة 2026)'], ['SOCPA-IFRS-SME', 'معيار المنشآت الصغيرة والمتوسطة المعتمد سعوديًا'], ['ZATCA-VAT-GUIDE', 'أدلة ضريبة القيمة المضافة لهيئة الزكاة والضريبة والجمارك'], ['ZATCA-EINVOICING', 'دليل الفاتورة الإلكترونية (المرحلتان الأولى والثانية)'], ['ZATCA-ZAKAT', 'قواعد احتساب الزكاة للكيانات'], ['SAUDI-COMPANY-LAW', 'نظام الشركات السعودي'], ['SAUDI-COMPETITION-LAW', 'نظام المنافسة'], ['NCA-ECC', 'الضوابط الأساسية للأمن السيبراني — الهيئة الوطنية للأمن السيبراني'], ['SDAIA-DATA-LAW', 'نظام حماية البيانات الشخصية']
  ] },
  { section: 'مراجع مهنية كلاسيكية عالمية', items: [
    ['KIESO-INTERMEDIATE', 'Intermediate Accounting — Kieso, Weygandt, Warfield'], ['HORNGREN-COST', 'Cost Accounting: A Managerial Emphasis — Horngren'], ['SPICELAND-INTERMEDIATE', 'Intermediate Accounting — Spiceland, Nelson, Thomas'], ['WILD-FUNDAMENTALS', 'Fundamentals of Financial Accounting — Wild'], ['NOBLES-MANAGERIAL', 'Horngren’s Financial & Managerial Accounting — Nobles, Mattison'], ['MEIGS-ACCOUNTING', 'Accounting: The Basis for Business Decisions — Meigs'], ['LARSEN-FUNDAMENTALS', 'Fundamentals of Auditing — Larsen'], ['ARENS-AUDITING', 'Auditing and Assurance Services — Arens, Elder, Beasley'], ['GUY-AUDIT', 'Audit Sampling — Guy, Carmichael'], ['COSO-FRAMEWORK', 'Internal Control — Integrated Framework (COSO 2013)'], ['COSO-ERM', 'Enterprise Risk Management — Integrating with Strategy (COSO ERM)'], ['COBIT-2019', 'COBIT 2019 Framework — ISACA'], ['IFAC-IES', 'معايير التعليم المهني الدولية IFAC'], ['ACCA-AA', 'Audit and Assurance — ACCA'], ['ACCA-FR', 'Financial Reporting — ACCA'], ['CPA-BECKER', 'Becker CPA Review — FAR/AUD'], ['GLEIM-CIA', 'Gleim CIA Review — Internal Audit'], ['CFA-L1-FRA', 'CFA Level I — Financial Reporting and Analysis'], ['BPP-DIPIFR', 'Diploma in IFRS — BPP Learning Media'], ['KAPLAN-FIA', 'Foundations in Accountancy — Kaplan'], ['FRANK-WOOD-AR', 'فرانك وود — الأعمال والحسابات (المعروفة عربيًا)'], ['SHIM-FINANCIAL-MGMT', 'Financial Management — Shim & Siegel'], ['BRIGHAM-CORP-FIN', 'Corporate Finance — Brigham & Ehrhardt'], ['PENMAN-ANALYSIS', 'Financial Statement Analysis and Security Valuation — Penman'], ['SUBRAMANYAM-ANALYSIS', 'Financial Statement Analysis — Subramanyam'], ['GRAHAM-SECURITY-ANALYSIS', 'Security Analysis — Graham & Dodd'], ['MCKINSEY-VALUATION', 'Valuation — McKinsey & Company'], ['PORTER-STRATEGY', 'Competitive Strategy — Porter'], ['DRUCKER-MANAGEMENT', 'The Practice of Management — Drucker'], ['DEMING-QUALITY', 'Out of the Crisis — Deming'], ['GILBRETH-MOTION', 'Motion Study — Gilbreth'], ['TAYLOR-SCIENTIFIC', 'The Principles of Scientific Management — Taylor'], ['FAYOL-ADMIN', 'General and Industrial Management — Fayol'], ['MASLOW-MOTIVATION', 'Motivation and Personality — Maslow'], ['HELMKAMP-COST', 'Managerial Accounting — Helmkamp'], ['HILTON-MANAGERIAL', 'Managerial Accounting — Hilton'], ['BLOCK-HIRT-FIN', 'Foundations of Financial Management — Block & Hirt'], ['ROSS-CORP-FIN', 'Corporate Finance — Ross, Westerfield, Jaffe'], ['BREALEY-PRINCIPLES', 'Principles of Corporate Finance — Brealey & Myers'], ['SIEGEL-FORENSIC', 'Forensic Accounting — Silverstone & Sheetz'], ['GOLDEN-FRAUD', 'A Guide to Forensic Accounting Investigation — Golden'], ['WELLS-FRAUD-EXAM', 'Fraud Examination — Wells'], ['ACFE-REPORT', 'Report to the Nations — ACFE'], ['IIA-STANDARDS', 'المعايير الدولية للممارسة المهنية لوظيفة التدقيق الداخلي IIA'], ['ISO-31000', 'إدارة المخاطر — ISO 31000'], ['ISO-9001', 'إدارة الجودة — ISO 9001'], ['ISO-27001', 'أمن المعلومات — ISO/IEC 27001']
  ] }
];

export function curatedCatalog() {
  const sections = CURATED.map(sec => ({
    section: sec.section,
    items: sec.items.map(([code, title]) => ({ code, title, searchUrl: `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}`, kind: 'curated-reference' }))
  }));
  return { total: sections.reduce((a, s) => a + s.items.length, 0), sections, note: 'فهرس منسق مهني للبحث السريع؛ الوصول الكامل للملايين عبر بوابة Open Library داخل المنصة.' };
}
