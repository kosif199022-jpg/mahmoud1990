import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const html=read('frontend/index.html');
const pub=read('public/index.html');
const workspace=read('src/kosif-workspace.js');
const worker=read('src/worker.js');
const legacy=read('src/legacy-worker.js');
const sw=read('public/sw.js');
const manifest=read('public/manifest.webmanifest');
const all=[html,pub,workspace,worker,legacy,sw,manifest].join('\n');

function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else out.push(p)}return out}
const files=walk(root).map(p=>path.relative(root,p)).sort();
const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>x.startsWith('/'));
const missing=[];for(const u of refs){const clean=u.split('?')[0].split('#')[0];if(clean==='/'||clean.startsWith('/api/'))continue;const p='public'+clean;if(!fs.existsSync(p))missing.push(clean)}
const featureChecks={
  'TB CSV/XLSX import': /\.xlsx|SheetJS|XLSX|tb-file|CSV/i.test(all),
  'JSON engagement export': /export-json|تصدير.*JSON|JSON.*تصدير/i.test(all),
  'CSV adjusting entries export': /export-aje|قيود.*CSV|CSV.*قيود/i.test(all),
  'Word report export': /export.*word|\.docx|msword|Word/i.test(all),
  'PBC center': /renderPBC|طلبات المستندات|PBC/i.test(all),
  'Reviewer notes': /renderNotes|ملاحظات المراجع|reviewer/i.test(all),
  'Analytics': /renderAnalytics|التحليلات|Benford|بنفورد/i.test(all),
  'Adjusted TB': /adj-tb|الميزان المعدل|الميزان المعدّل/i.test(all),
  'Standards library': /مكتبة المعايير|standards/i.test(all),
  'Official sources center': /المصادر الرسمية|sourceSnapshot|refreshSources/i.test(all),
  'Voice summary': /speechSynthesis|ملخص صوتي|قراءة.*صوت|speak\(/i.test(all),
  'AI council': /مجلس المراجعين|consensus|adjudicat|Claude.*Gemini|OpenAI.*Claude/i.test(all),
  'Engagement acceptance': /قبول الارتباط|ISA 210|independence|الاستقلال/i.test(all),
  'Framework selection': /s-framework|IFRS for SMEs|منشآت صغيرة/i.test(all),
  'Listed entity control': /s-listed|ISA 701|IFRS 8|IAS 33/i.test(all),
  'Prior year TB': /previous year|prior year|السنة السابقة|سنة مقارنة|comparative/i.test(all),
  'Journal import/testing': /journal|دفتر اليومية|قيود اليومية|ISA 240/i.test(all),
  'Sampling ISA 530': /ISA 530|MUS|PPS|العينات/i.test(all),
  'Misstatement schedule ISA 450': /ISA 450|misstatement|التحريفات/i.test(all),
  'Risk register': /risk register|سجل المخاطر|assertions/i.test(all),
  'Editable templates': /قوالب|templates|نماذج عمل/i.test(all),
  'Draft financial statements': /قوائم مالية|financial statements draft|مسودة.*قوائم/i.test(all),
  'Materiality revision log': /materiality.*revision|تنقيح.*الأهمية|سجل.*الأهمية/i.test(all),
  'Attachments sent to AI': /inline_data|inlineData|contents\b|input_file|document.*base64/i.test(workspace),
};
const riskChecks={
  'Legacy external assets missing': missing.length===0,
  'No duplicate IDs': dup.length===0,
  'No visible Tamhees brand in frontend': !/تمحيص/i.test(html),
  'No legacy /legacy script refs': !/\/legacy\//i.test(html),
  'No Google Fonts dependency': !/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html),
  'No broken motion import fragment': !/^500;600;700;800;900&family=/m.test(workspace),
  'AI proxy accepts structured contents': /b\.contents|const\s+contents\s*=/.test(workspace),
  'Public company write is authenticated': /authorization|workspace[_-]?key|access/i.test(workspace.match(/async function companiesApi[\s\S]*?function sourceDigest/)?.[0]||''),
  'Service worker network-first navigation': /network/i.test(sw)&&/fetch/i.test(sw),
};

const lines=[];
lines.push('# Kosif v36 Deep Audit');
lines.push('');
lines.push(`Files scanned: **${files.length}**`);
lines.push(`Frontend bytes: **${Buffer.byteLength(html)}**`);
lines.push(`Duplicate IDs: **${dup.length}** ${dup.length?'('+dup.join(', ')+')':''}`);
lines.push(`Missing referenced static assets: **${missing.length}** ${missing.length?'('+missing.join(', ')+')':''}`);
lines.push('');
lines.push('## Feature inventory');
for(const [k,v] of Object.entries(featureChecks))lines.push(`- ${v?'✅':'❌'} ${k}`);
lines.push('');
lines.push('## Architecture / reliability gates');
for(const [k,v] of Object.entries(riskChecks))lines.push(`- ${v?'✅':'❌'} ${k}`);
lines.push('');
lines.push('## Legacy markers');
for(const token of ['تمحيص','tamhees','theme-restore','/legacy/','bn-map','window.fetch=','document.write(','MutationObserver']){
 const n=(all.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'))||[]).length;
 lines.push(`- ${token}: ${n}`);
}
lines.push('');
lines.push('## Missing refs');
for(const x of missing)lines.push(`- ${x}`);
lines.push('');
lines.push('## Production file list');
for(const x of files.filter(x=>/^(src|frontend|public|scripts|wrangler|package|README|RELEASE)/.test(x)))lines.push(`- ${x}`);
fs.writeFileSync('/tmp/kosif-v36-deep-audit.md',lines.join('\n'));
console.log(lines.join('\n'));

if(dup.length)process.exitCode=2;
