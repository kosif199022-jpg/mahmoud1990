import fs from 'node:fs';
import {parse} from 'acorn';

const R=p=>fs.readFileSync(p,'utf8'),W=(p,s)=>fs.writeFileSync(p,s);
function rep(s,from,to,label){if(!s.includes(from))throw new Error('Patch anchor missing: '+label);return s.replace(from,to)}

// 1) Remove known unreachable top-level declarations from the legacy worker using an AST.
{
  const p='src/legacy-worker.js',s=R(p),ast=parse(s,{ecmaVersion:'latest',sourceType:'module'});
  const dead=new Set(['injectAccessibility','injectPWA','injectV10','injectKosifV11','injectKosifV12','injectKosifCleanV15','injectStandardsIntegration','injectKosifCacheRecovery','PWA_FIRST_RUN_HTML_V3']);
  const cuts=[];
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration'&&dead.has(n.id?.name))cuts.push([n.start,n.end,n.id.name]);
    if(n.type==='VariableDeclaration'){
      const names=n.declarations.map(d=>d.id?.type==='Identifier'?d.id.name:null);
      const hit=names.filter(x=>dead.has(x));
      if(hit.length){if(hit.length!==names.length)throw new Error('Target shares declaration: '+hit.join(','));cuts.push([n.start,n.end,hit.join(',')])}
    }
  }
  const found=new Set(cuts.flatMap(x=>x[2].split(',')));for(const n of dead)if(!found.has(n))throw new Error('Dead declaration not found: '+n);
  let out=s;for(const [a,b] of cuts.sort((x,y)=>y[0]-x[0]))out=out.slice(0,a)+out.slice(b);
  W(p,out.replace(/\n{4,}/g,'\n\n'));
  console.log('LEGACY_PRUNE',s.length,'->',out.length);
}

// 2) Wire the final fallback tier for professional search.
{
  const p='src/professional-upgrade.js';let s=R(p);
  s=rep(s,
    'function roleFor(m){if(m?.id==="b3")return "مرجع رسمي أحدث";if(m?.id==="b1")return "مرجع رسمي سابق";return "مرجع تدريبي/مساند"}',
    'function roleFor(m){if(m?.id==="b3")return "مرجع رسمي أحدث";if(m?.id==="b1")return "مرجع رسمي سابق";if(m?.id==="b4"||m?.kind==="development")return "تطوير — ليس سندًا مهنيًا";return "مرجع تدريبي/مساند"}',
    'professional role b4');
  s=rep(s,
    'q=displayClean(q);if(q.length<2)return[];let idx;try{idx=await indexData(env)}catch(_){return serviceProfessionalSearch(env,q,opt)}const terms=expansionTerms(q),list=await library(env),out=[];',
    'q=displayClean(q);if(q.length<2)return[];let idx;try{idx=await indexData(env)}catch(_){const svc=await serviceProfessionalSearch(env,q,opt);if(Array.isArray(svc)&&svc.length)return svc;try{idx=await fallbackProfessionalIndex(env)}catch(__){idx=[]}}const terms=expansionTerms(q),list=await library(env),out=[];',
    'professional fallback chain');
  W(p,s);
}

// 3) Wire service -> packaged-library fallback for standards search/context and mark b4 as development-only.
{
  const p='src/standards-mafateeh.js';let s=R(p);
  s=rep(s,
    "function role(m){return m.id==='b3'?'مرجع رسمي أحدث':m.id==='b1'?'مرجع رسمي سابق':'مرجع تدريبي/مساند'}",
    "function role(m){return m.id==='b3'?'مرجع رسمي أحدث':m.id==='b1'?'مرجع رسمي سابق':(m.id==='b4'||m.kind==='development')?'تطوير — ليس سندًا مهنيًا':'مرجع تدريبي/مساند'}",
    'library role b4');
  s=rep(s,
    "<a class=\"book\" href=\"/library/read?book=${encodeURIComponent(m.id)}\">",
    "<a class=\"book${m.id==='b4'||m.kind==='development'?' development':''}\" href=\"/library/read?book=${encodeURIComponent(m.id)}\">",
    'development class');
  s=rep(s,
    "try{const r=await std('/data/search-index.json.gz'),ds=new DecompressionStream('gzip');data=JSON.parse(await new Response(r.body.pipeThrough(ds)).text())}catch(e){return serviceStdSearch(book||'b3',q,60)}const nq=",
    "try{const r=await std('/data/search-index.json.gz'),ds=new DecompressionStream('gzip');data=JSON.parse(await new Response(r.body.pipeThrough(ds)).text())}catch(e){const svc=await serviceStdSearch(book||'b3',q,60);if(Array.isArray(svc)&&svc.length)return svc;try{data=await fallbackRecords(book||'b3')}catch(_){data=[]}}const nq=",
    'standards search fallback');
  s=rep(s,
    'try{const r=await std("/data/search-index.json.gz"),ds=new DecompressionStream("gzip");data=JSON.parse(await new Response(r.body.pipeThrough(ds)).text())}catch(e){return serviceStdContext(query)}\nconst nq=',
    'try{const r=await std("/data/search-index.json.gz"),ds=new DecompressionStream("gzip");data=JSON.parse(await new Response(r.body.pipeThrough(ds)).text())}catch(e){const svc=await serviceStdContext(query);if(svc)return svc;try{data=await fallbackRecords("b3")}catch(_){data=[]}}\nconst nq=',
    'standards context fallback');
  // visual dashed treatment lives only in the protected shelf, never in professional context.
  s=s.replace('</style></head><body>', '.book.development{border:1.5px dashed #9a72d8;background:linear-gradient(135deg,#fff,#faf7ff)}.book.development .cover{outline:2px dashed #9a72d866;outline-offset:-7px}</style></head><body>');
  W(p,s);
}

// 4) Static standards reader: development badge, no-page fallback, and separated study layer.
{
  const p='public/standards/index.html';let s=R(p);
  s=rep(s,'.card:active{border-color:var(--seal)}',`.card:active{border-color:var(--seal)}
.card.development{border-style:dashed;border-color:#8B5CC7;background:color-mix(in srgb,var(--paper) 94%,#8B5CC7 6%)}
.devbadge{display:inline-block;margin-inline-start:8px;padding:2px 9px;border:1px dashed #8B5CC7;border-radius:99px;color:#7343B0;font-size:11px;font-family:var(--ui);font-weight:700}
.study-wrap{margin-top:28px;border-top:1px solid var(--rule);padding-top:18px;font-family:var(--ui)}
.study-note{font-size:12px;color:var(--ink2);margin-bottom:10px}.study-box{border:1px dashed #8B5CC7;border-radius:12px;padding:13px 14px;margin:10px 0;background:color-mix(in srgb,var(--paper) 94%,#8B5CC7 6%)}
.study-box b{display:block;color:#7343B0;margin-bottom:5px}.study-box p{margin:0;line-height:1.75}.study-box ul{margin:6px 0 0;padding-inline-start:22px;line-height:1.8}`,'reader development css');
  s=rep(s,
    'return `<button class="card" data-b="${b.id}">\n        <span class="yr">${AR(b.year)}</span>\n        <h3>${esc(b.title)}</h3><p>${esc(b.sub)}</p>',
    'return `<button class="card ${b.id===\'b4\'||b.kind===\'development\'?\'development\':\'\'}" data-b="${b.id}">\n        <span class="yr">${AR(b.year)}</span>${b.id===\'b4\'||b.kind===\'development\'?\'<span class="devbadge">تطوير — ليس سندًا مهنيًا</span>\':\'\'}\n        <h3>${esc(b.title)}</h3><p>${esc(b.sub)}</p>',
    'reader b4 card');
  s=rep(s,
    "  $('#toc').innerHTML=`<h2 class=\"tp\">${esc(BOOK.title)}</h2>\n    <p class=\"ts\">${esc(BOOK.sub)} · ${AR(BOOK.year)}</p>`+",
    "  $('#toc').innerHTML=`<h2 class=\"tp\">${esc(BOOK.title)}${BOOK.id==='b4'||BOOK.kind==='development'?'<span class=\"devbadge\">تطوير — ليس سندًا مهنيًا</span>':''}</h2>\n    <p class=\"ts\">${esc(BOOK.sub)} · ${AR(BOOK.year)}</p>`+",
    'reader toc badge');
  s=rep(s,
    "function render(){\n  const mk=(marks[BOOK.id]||{})[CH.no]||[];",
    "function render(){\n  const mk=(marks[BOOK.id]||{})[CH.no]||[];\n  const pageLabel=Array.isArray(CH.pages)&&CH.pages.length?`صفحات المصدر ${AR(CH.pages[0])}${CH.pages.length>1?'–'+AR(CH.pages[CH.pages.length-1]):''}`:esc([CH.part,CH.partTitle].filter(Boolean).join(' · ')||'بدون ترقيم صفحات');\n  const st=CH.study&&typeof CH.study==='object'?CH.study:null;\n  const study=st&&((st.key||st.idea||st.application||st.weeklyTask)||(Array.isArray(st.questions)&&st.questions.length))?`<aside class=\"study-wrap\"><div class=\"study-note\">طبقة دراسة مساعدة — <b>ليست من متن الكتاب</b></div>${st.key?`<div class=\"study-box\"><b>المفتاح · ليست من متن الكتاب</b><p>${esc(st.key)}</p></div>`:''}${st.idea?`<div class=\"study-box\"><b>الفكرة · ليست من متن الكتاب</b><p>${esc(st.idea)}</p></div>`:''}${Array.isArray(st.questions)&&st.questions.length?`<div class=\"study-box\"><b>الأسئلة · ليست من متن الكتاب</b><ul>${st.questions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}${st.application?`<div class=\"study-box\"><b>التطبيق · ليست من متن الكتاب</b><p>${esc(st.application)}</p></div>`:''}${st.weeklyTask?`<div class=\"study-box\"><b>مهمة الأسبوع · ليست من متن الكتاب</b><p>${esc(st.weeklyTask)}</p></div>`:''}</aside>`:'';",
    'reader page/study prep');
  s=rep(s,
    '<div class="pg">صفحات المصدر ${AR(CH.pages[0])}–${AR(CH.pages[1])} · ${AR(CH.body.length)} فقرة</div>\n    </header><article id="prose">${html}</article>`;',
    '<div class="pg">${pageLabel} · ${AR(CH.body.length)} فقرة</div>\n    </header><article id="prose">${html}</article>${study}`;',
    'reader pages fallback');
  W(p,s);
}

// 5) Dashboard motion link: keep app shell copies byte-identical.
for(const p of ['frontend/index.html','public/index.html']){
  let s=R(p);if(!s.includes('/v36-motion.css'))s=s.replace('</head>','<link rel="stylesheet" href="/v36-motion.css?v=36.2.1">\n</head>');W(p,s)
}

// 6) Service workers: retain network-first/API exclusion and bump cache generations.
{
  const p='public/sw.js';let s=R(p);s=s.replace("const C='kosif-native-v36-2-app';","const C='kosif-native-v36-2-1-app';");s=s.replace("'/v36.css',","'/v36.css','/v36-motion.css',");W(p,s);
  const q='public/standards/sw.js';let t=R(q);t=t.replace("const C='kosif-native-v36-1-standards'","const C='kosif-native-v36-2-1-standards'");t=t.replace("'/standards/data/ref-map.json',","'/standards/data/library.json','/standards/data/b4.json','/standards/data/ref-map.json',");W(q,t);
}

// 7) Expose explicit syntax/payload/audit commands; check becomes the complete release gate.
{
  const p='scripts/check-all.mjs';let s=R(p);s=s.replace("\nconst r=spawnSync(process.execPath,['scripts/validate-payloads.mjs'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||2);\n",'\n');W(p,s);
  const pkg=JSON.parse(R('package.json'));pkg.name='kosif-native-v36-2-1';pkg.version='36.2.1';pkg.scripts={...pkg.scripts,syntax:'node scripts/check-all.mjs',payloads:'node scripts/validate-payloads.mjs',audit:'node scripts/deep-audit-v36.mjs',check:'npm run syntax && npm run payloads && npm run audit'};W('package.json',JSON.stringify(pkg,null,2)+'\n');
}

// 8) Strengthen deep audit around the exact failure classes from the attachment.
{
  const p='scripts/deep-audit-v36.mjs';let s=R(p);
  s=s.replace("import path from 'node:path';","import path from 'node:path';\nimport zlib from 'node:zlib';");
  s=s.replace("ops:read('public/v36-operations.js'),pkg:read('package.json'),checker:read('scripts/check-all.mjs')","ops:read('public/v36-operations.js'),motion:read('public/v36-motion.css'),pkg:read('package.json'),checker:read('scripts/check-all.mjs')");
  s=s.replace("const bookCounts=Object.fromEntries(['b1','b2','b3'].map(id=>[id,fs.existsSync('public/standards/data/'+id)?fs.readdirSync('public/standards/data/'+id).filter(x=>/^\\d+\\.json$/.test(x)).length:0]));\nconst metadataConsistent=lib.every(x=>Number(x.chapters||0)===(bookCounts[x.id]||0));",
`const bookCounts=Object.fromEntries(lib.map(x=>{const id=String(x.id||'');const d='public/standards/data/'+id;return[id,fs.existsSync(d)?fs.readdirSync(d).filter(n=>/^\\d+\\.json$/.test(n)).length:0]}));
const chapterSequences=Object.fromEntries(lib.map(x=>{const id=String(x.id||''),d='public/standards/data/'+id,expected=Number(x.chapters||0);const nums=fs.existsSync(d)?fs.readdirSync(d).filter(n=>/^\\d+\\.json$/.test(n)).map(n=>+n.replace('.json','')).sort((a,b)=>a-b):[];return[id,expected>0&&nums.length===expected&&nums.every((n,i)=>n===i+1)]}));
const metadataConsistent=lib.every(x=>Number(x.chapters||0)>0&&Number(x.chapters||0)===(bookCounts[x.id]||0)&&chapterSequences[x.id]);
const deadFns=[...src.legacy.matchAll(/^function\\s+(\\w+)\\s*\\(/gm)].map(m=>m[1]).filter(n=>((src.legacy+'\\n'+src.worker).match(new RegExp('\\\\b'+n+'\\\\b','g'))||[]).length===1);
let professionalIndexText='';try{professionalIndexText=zlib.gunzipSync(fs.readFileSync('public/standards/data/search-index.json.gz')).toString('utf8')}catch{}
const b4=lib.find(x=>x.id==='b4');`);
  s=s.replace("'Operational data-quality bridge':/تكرار محتمل/.test(src.ops)&&/تنسيق جوال العميل/.test(src.ops)&&/riskItems/.test(src.ops),",
`'Operational data-quality bridge':/تكرار محتمل/.test(src.ops)&&/تنسيق جوال العميل/.test(src.ops)&&/riskItems/.test(src.ops),
 'Four-book library with development b4':!!b4&&b4.kind==='development'&&b4.professionalAuthority===false&&Number(b4.chapters)===46&&Number(b4.words)===34700,
 'Development book excluded from professional index':professionalIndexText.length>0&&!/\\"book\\"\\s*:\\s*\\"b4\\"/.test(professionalIndexText),
 'Motion layer wired and accessible':fs.existsSync('public/v36-motion.css')&&src.pub.includes('/v36-motion.css')&&src.html.includes('/v36-motion.css')&&/prefers-reduced-motion/.test(src.motion)&&!/fonts\\.googleapis|@import|font-family/i.test(src.motion),`);
  s=s.replace("'No missing static refs':missing.length===0,",
`'App shell copies byte-identical':src.html===src.pub,
 'No unreachable declarations in worker sources':deadFns.length===0,
 'Chapter files numbered contiguously 1..n':Object.values(chapterSequences).every(Boolean),
 'No missing static refs':missing.length===0,`);
  s=s.replace("const lines=['# Kosif v36.2 Deep Audit'","const lines=['# Kosif v36.2.1 Deep Audit'");
  W(p,s);
}

// 9) Release marker only; core runtime behaviour remains the same.
{
  const p='src/worker.js';let s=R(p);s=s.replaceAll('native-v36-2-attachments-upgrade','native-v36-2-1-library-hardening');s=s.replace("version:'v36.2',release:'Attachment Review & Operational Intelligence'","version:'v36.2.1',release:'Library Integrity & Motion Hardening'");W(p,s);
}

console.log('KOSIF_ATTACHMENT_HARDENING_PATCH_OK');
