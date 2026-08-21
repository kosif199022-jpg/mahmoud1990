import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`KOSIF_PROJECT_HYGIENE_FAIL: ${message}`);
  console.log(`  ✅ ${message}`);
};

const publicShell = read('public/index.html');
const frontendShell = read('frontend/index.html');
const hub = read('public/hub.html');
const libraries = read('public/libraries/index.html');
const salesHtml = read('public/sales/index.html');
const salesJs = read('public/sales/sales.js');
const salesMotion = read('public/sales/sales-motion-v1.js');
const sw = read('public/sw.js');
const books = read('src/v38-books.js');
const api = read('src/v38-api.js');
const readme = read('README.md');
const workflow = read('.github/workflows/ci-quality-gate.yml');
const gitignore = read('.gitignore');

ok(publicShell === frontendShell, 'canonical public/frontend audit shells are byte-identical');
ok(fs.existsSync('public/bundles/kosif-suite-core-v46.css'), 'shared suite CSS bundle exists');
ok(fs.existsSync('public/sales/sales-ui-v46.css'), 'Sales CSS bundle exists');
for (const [name, html] of [['hub', hub], ['libraries', libraries], ['sales', salesHtml]]) {
  ok(html.includes('/bundles/kosif-suite-core-v46.css?v=46'), `${name} uses the generated shared suite bundle`);
}
ok(salesHtml.includes('/sales/sales-ui-v46.css?v=46'), 'Sales uses the generated sales UI bundle');
ok(!fs.existsSync('public/sales/sales-general-bootstrap.js') && !salesHtml.includes('sales-general-bootstrap.js'), 'obsolete Sales bootstrap is fully merged and removed');
ok(salesJs.includes("const STORE='kosif:sales:v1'") && salesJs.includes("const LEGACY_STORE='kosif:aghnam:v7:native'"), 'Sales uses a generic canonical storage key with legacy migration support');
ok(salesMotion.includes("window.__KOSIF_SALES_STORE_KEY__||'kosif:sales:v1'"), 'Sales motion consumes the canonical shared storage key');
ok(salesJs.includes("a.download='kosif-sales-backup.json'"), 'Sales exports a generic KOSIF backup filename');
ok(salesJs.includes('function parseDelimited(') && salesJs.includes('rowsFromDelimited('), 'Sales CSV/TSV importer handles quoted delimiters');
ok(!/[اأإآ]غنام|نعيمي|سواكني|حري|ذبائح/.test(salesHtml + salesJs + salesMotion), 'legacy livestock demo copy is absent from the active Sales workspace');
ok((salesJs.match(/Aghnam v7 native integration/g) || []).length === 1, 'legacy Aghnam label appears only in the exact migration detector');
for (const phrase of ['التواصل مع المكلفين بالحوكمة','الإقرارات المكتوبة','استخدام عمل المراجعين الداخليين','فقرات لفت الانتباه وفقرات الأمور الأخرى في تقرير المراجع المستقل','مسؤوليات المراجع المتعلقة بالمعلومات الأخرى']) ok(books.includes(phrase), `professional standards wording retained: ${phrase}`);
ok(!books.includes('التواصل مع أولياء الأمور'), 'incorrect ISA 260 wording is removed');
ok(api.includes('لا تُستبدل معرّفات الملاحظات القائمة بصمت؛ استخدم تعديلًا صريحًا.'), 'reviewer-note conflict message is clear Arabic');
ok(readme.startsWith('# KOSIF — منصة المراجعة والامتثال والذكاء المهني'), 'README describes the current layered KOSIF platform');
ok(!readme.includes('### نسيق ذكاء المصادر'), 'README source-intelligence heading typo is fixed');
ok(workflow.includes('npm run source-export') && workflow.includes('Kosif-Full-Application-Source.json'), 'unified CI exports the complete source snapshot as an artifact');
ok(!fs.existsSync('.github/workflows/export-full-code-json.yml'), 'obsolete standalone source-export workflow stays removed');
ok(gitignore.includes('Kosif-Full-Application-Source.json'), 'generated full-source snapshot is ignored and never becomes repository truth');
ok(sw.includes('/bundles/kosif-suite-core-v46.css?v=46') && sw.includes('/sales/sales-ui-v46.css?v=46'), 'PWA cache includes generated UI bundles');
ok(!sw.includes('/sales/sales-general-bootstrap.js'), 'PWA cache does not reference the deleted Sales bootstrap');
const htmlFiles=['public/index.html','public/hub.html','public/libraries/index.html','public/libraries/reader.html','public/sales/index.html','public/standards/index.html','public/requirements/index.html'];
const dynamicPrefixes=['/audit/','/wealth/','/library/','/api/','/standards/audio/','/__'];
const missingRefs=[];
for(const file of htmlFiles){const html=read(file);for(const match of html.matchAll(/(?:href|src)=["'](\/[^"'#]+)["']/g)){const raw=match[1],pathname=raw.split('?')[0];if(dynamicPrefixes.some(prefix=>pathname.startsWith(prefix)))continue;let candidate=`public${pathname}`;if(pathname.endsWith('/'))candidate+='index.html';if(!fs.existsSync(candidate))missingRefs.push(`${file} -> ${raw}`)}}
ok(missingRefs.length===0,`primary HTML surfaces have no missing local assets${missingRefs.length?`: ${missingRefs.join(', ')}`:''}`);
console.log('KOSIF_PROJECT_HYGIENE_OK');
