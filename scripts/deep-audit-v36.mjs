import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root=process.cwd();
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const json=p=>{try{return JSON.parse(read(p))}catch{return null}};
const src={
 html:read('frontend/index.html'),pub:read('public/index.html'),workspace:read('src/kosif-workspace.js'),worker:read('src/worker.js'),legacy:read('src/legacy-worker.js'),sw:read('public/sw.js'),stdHtml:read('public/standards/index.html'),stdPro:read('public/standards/reader-pro-v36.js'),stdSw:read('public/standards/sw.js'),gov:read('public/v36-governance.js'),gate:read('public/v36-ai-gate.js'),features:read('public/v36-features.js'),outputs:read('public/v36-outputs.js'),readiness:read('public/v36-standards-readiness.js'),ops:read('public/v36-operations.js'),motion:read('public/v36-motion.css'),pkg:read('package.json'),checker:read('scripts/check-all.mjs'),zai:read('src/zai-provider.js'),audio:read('src/audio-proxy.js'),stdSwSrc:read('public/standards/sw.js')
};
const all=Object.values(src).join('\n');
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const p=path.join(dir,e.name);e.isDirectory()?walk(p,out):out.push(p)}return out}
const files=walk(root).map(p=>path.relative(root,p)).sort();
const ids=[...src.html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
const refs=[...src.html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>x.startsWith('/'));
const missing=[];for(const u of refs){const clean=u.split('?')[0].split('#')[0];if(clean==='/'||clean.startsWith('/api/'))continue;if(!fs.existsSync('public'+clean))missing.push(clean)}
const legacyRefs=[...new Set(refs.map(x=>x.split('?')[0]).filter(x=>x.startsWith('/legacy/')))];
const libRaw=json('public/standards/data/library.json')||[],lib=Array.isArray(libRaw)?libRaw:(libRaw.books||[]);
const bookCounts=Object.fromEntries(lib.map(x=>{const id=String(x.id||'');const d='public/standards/data/'+id;return[id,fs.existsSync(d)?fs.readdirSync(d).filter(n=>/^\d+\.json$/.test(n)).length:0]}));
const chapterSequences=Object.fromEntries(lib.map(x=>{const id=String(x.id||''),d='public/standards/data/'+id,expected=Number(x.chapters||0);const nums=fs.existsSync(d)?fs.readdirSync(d).filter(n=>/^\d+\.json$/.test(n)).map(n=>+n.replace('.json','')).sort((a,b)=>a-b):[];return[id,expected>0&&nums.length===expected&&nums.every((n,i)=>n===i+1)]}));
const metadataConsistent=lib.every(x=>Number(x.chapters||0)>0&&Number(x.chapters||0)===(bookCounts[x.id]||0)&&chapterSequences[x.id]);
const deadFns=[...src.legacy.matchAll(/^function\s+(\w+)\s*\(/gm)].map(m=>m[1]).filter(n=>((src.legacy+'\n'+src.worker).match(new RegExp('\\b'+n+'\\b','g'))||[]).length===1);
let professionalIndexText='';try{professionalIndexText=zlib.gunzipSync(fs.readFileSync('public/standards/data/search-index.json.gz')).toString('utf8')}catch{}
const b4=lib.find(x=>x.id==='b4');
const checks={
 'TB / Excel / CSV import':/XLSX|tb-file|CSV/i.test(all),
 'Deterministic audit engine':/core-v36|applyDemo|renderTB/i.test(all),
 'PBC center':/renderPBC|طلبات المستندات|PBC/i.test(all),
 'Analytics / Benford':/renderAnalytics|Benford|بنفورد/i.test(all),
 'Risk + assertions register':/risk register|سجل المخاطر|assertions/i.test(all),
 'Reviewer notes + voice':/ملاحظات المراجع|SpeechRecognition|reviewer/i.test(all),
 'Acceptance / independence':/قبول الارتباط|ISA 210|independence|الاستقلال/i.test(all),
 'Prior-year comparison':/prior year|السنة السابقة|سنة مقارنة|comparative/i.test(all),
 'Journal testing / ISA 240':/ISA 240|قيود اليومية|journal/i.test(all),
 'Sampling / ISA 530':/ISA 530|MUS|PPS|العينات/i.test(all),
 'Misstatements / ISA 450':/ISA 450|misstatement|التحريفات/i.test(all),
 'Adjusted TB + CSV':/adj-tb|الميزان المعدّل|export-adj/i.test(all),
 'Word / report outputs':/export-word|msword|Word/i.test(all),
 'Audit Trail + human decisions':/Audit Trail|HUMAN_DECISION|Accepted|Rejected/i.test(src.gov),
 'Multimodal AI evidence':/inline_data|inlineData|input_file|document.*base64|attachmentsUsed/i.test(src.workspace),
 'Council independent providers':/gemini[\s\S]*openai[\s\S]*anthropic/i.test(src.gov),
 'Council provider tests':/councilOK|\/api\/kosif\/ai\/test|c-test/.test(src.gov),
 'Owner password gate':/AI_GATE_HASH|kosif_ai_session|HttpOnly; Secure; SameSite=Strict/.test(src.worker),
 'Server verified-key fingerprint':/keyFingerprint|AI_NOT_VERIFIED|verified-key/.test(src.worker),
 'Dedicated connection test endpoint':/\/api\/kosif\/ai\/test/.test(src.worker)&&/testAI\(/.test(src.worker),
 'API key fields hard locked before owner auth':/KEY_FIELDS[\s\S]*readOnly=true[\s\S]*beforeinput/.test(src.gate),
 'No key-presence Active heuristic':!src.html.includes('AI Active ·')&&!src.html.includes("hasKey:()=>!!apiKey()"),
 'Connected status requires verification':/aiVerified\(st\.provider,st\.model,k\)/.test(src.html)&&/AI متصل/.test(src.html),
 'Reader TTS':/speechSynthesis|SpeechSynthesisUtterance/.test(src.stdPro),
 'Reader word highlighting':/Highlight|kosif-speech|onboundary/.test(src.stdPro),
 'Reader Media Session':/mediaSession|MediaMetadata/.test(src.stdPro),
 'Reader Wake Lock':/wakeLock/.test(src.stdPro),
 'Reader auto-scroll 1–10':/requestAnimationFrame/.test(src.stdPro)&&/min="1" max="10"/.test(src.stdPro),
 'Reader stops auto-scroll on touch':/touchstart[\s\S]*autoOff/.test(src.stdPro),
 'Reader sleep timer':/setSleep|sleepId/.test(src.stdPro),
 'Reader standards code jump':/jumpCode|IAS 16|IFRS 9/.test(src.stdPro),
 'Reader chapter/journal export':/exportChapter/.test(src.stdPro)&&/exportJournalPro/.test(src.stdPro),
 'Reader streak / continue support':/streak\(|markDay/.test(src.stdPro)&&/last/.test(src.stdHtml),
 'Standards pro runtime wired':/reader-pro-v36\.js\?v=36\.1/.test(src.stdHtml)&&/reader-pro-v36\.js/.test(src.stdSw),
 'Standards metadata matches packaged chapters':metadataConsistent,
 'SOCPA-first / official-latest priority policy':/SOCPA|الهيئة السعودية/.test(src.readiness)&&/المصدر الرسمي الأحدث|Official post-book updates override|قاعدة الحداثة/.test(src.readiness),
 'IFRS 18/19/20 period-aware readiness':/IFRS 18/.test(src.readiness)&&/IFRS 19/.test(src.readiness)&&/IFRS 20/.test(src.readiness)&&/2029/.test(src.readiness),
 'Source freshness date is explicit':/VERIFIED_AS_OF=['"]2026-08-17['"]/.test(src.readiness)&&/sourceVerifiedAsOf/.test(src.readiness),
 'Post-2025 Saudi update layer':/socpaUpdate2026/.test(src.readiness)&&/4076/.test(src.readiness),
 'International vs Saudi audit distinction':/iaasbHandbook/.test(src.readiness)&&/latest international|مرجع دولي/.test(src.readiness)&&/الاعتماد المحلي/.test(src.readiness),
 'Current GPT default':/gpt-5\.6/.test(src.workspace),
 'Current Gemini default':/gemini-3\.6-flash/.test(src.workspace),
 'Browser payload validator wired':/validate-payloads\.mjs/.test(src.pkg)&&/check-all\.mjs/.test(src.pkg)&&fs.existsSync('scripts/validate-payloads.mjs'),
 'Operational sales/cost analytics':/KosifOperations/.test(src.ops)&&/هوامش سالبة|negative margin/.test(src.ops)&&/قطع زمني/.test(src.ops),
 'Operational data-quality bridge':/تكرار محتمل/.test(src.ops)&&/تنسيق جوال العميل/.test(src.ops)&&/riskItems/.test(src.ops),
 'Four-book library with development b4':!!b4&&b4.kind==='development'&&b4.professionalAuthority===false&&Number(b4.chapters)===46&&Number(b4.words)===34700,
 'Development book excluded from professional index':professionalIndexText.length>0&&!/\"book\"\s*:\s*\"b4\"/.test(professionalIndexText),
 'Motion layer wired and accessible':fs.existsSync('public/v36-motion.css')&&src.pub.includes('/v36-motion.css')&&src.html.includes('/v36-motion.css')&&/prefers-reduced-motion/.test(src.motion)&&!/fonts\.googleapis|@import|font-family/i.test(src.motion),
};
const architecture={
 'App shell copies byte-identical':src.html===src.pub,
 'No unreachable declarations in worker sources':deadFns.length===0,
 'Chapter files numbered contiguously 1..n':Object.values(chapterSequences).every(Boolean),
 'No missing static refs':missing.length===0,
 'No duplicate static IDs':dup.length===0,
 'Only approved recovered legacy core':legacyRefs.length===1&&legacyRefs[0]==='/legacy/core-v36.js',
 'No Google Fonts dependency':!/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(src.html),
 'No global fetch monkeypatch':!/window\.fetch\s*=/.test(all),
 'Main SW excludes APIs':/pathname\.startsWith\('\/api\/'\)/.test(src.sw),
 'Standards SW scoped to standards':/pathname\.startsWith\('\/standards\/'\)/.test(src.stdSw),
 'Public company writes authenticated':/writeTokenHash|canWritePublic|authorization/i.test(src.workspace),
 'Private company encryption retained':/AES-GCM|AES_GCM|crypto\.subtle/i.test(all),
 /* The brand was a <div>, so the document had no h1 at all and screen-reader heading
  * navigation — a primary AT mode — had no top-level anchor. */
 'App shell exposes a top-level h1':/<h1 class="brand-name">/.test(src.pub)&&/<h1 class="brand-name">/.test(src.html),
 /* Reader feedback ("نُسخ المرجع", audio load failures) is delivered only through the
  * toast; without a live region none of it reaches assistive tech at all. */
 'Standards reader announces toasts':/id="toast"[^>]*role="status"/.test(src.stdHtml)&&/aria-live="polite"/.test(src.stdHtml),
 /* A skip link is only useful as the first focusable element, so it must precede the
  * top bar in source order — after it, the bar's buttons win the first Tab. */
 'Reader skip link precedes the top bar':(()=>{
  const a=src.stdHtml.indexOf('id="std-skip"'),b=src.stdHtml.indexOf('<div id="bar">');
  return a>=0&&b>=0&&a<b;
 })(),
 /* npm install is required to run the checks; without an ignore file a broad `git add -A`
  * after a local run would commit node_modules. */
 'Repository ignores local build state':(()=>{
  const g=read('.gitignore');return /(^|\n)node_modules\/?\s*(\n|$)/.test(g)&&/\.wrangler/.test(g);
 })(),
 /* The narration lives in mafateeh-al-tharwa (~66MB). Copying it here would bloat every
  * clone and fork the source of truth, so the worker proxies it instead. */
 'Narration proxied, not copied into the repo':(()=>{
  const hit=[];const walkAudio=d=>{if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const p=path.join(d,e.name);e.isDirectory()?walkAudio(p):(/\.(mp3|m4a|ogg|wav|aac)$/i.test(e.name)&&hit.push(p))}};
  walkAudio(root);return hit.length===0;
 })(),
 /* iOS Safari sends a Range probe before playing any audio and rejects a plain 200, so a
  * proxy that drops Range silently breaks playback on the primary target device. */
 'Audio proxy forwards Range requests':!src.audio||/['"]range['"]/.test(src.audio)&&/content-range/.test(src.audio),
 /* Caching 66MB of MP3 would exhaust the origin quota, and replaying a cached 206 as a
  * full response breaks seeking. */
 'Audio excluded from Service Worker caching':/standards\/audio\//.test(src.stdSwSrc),
 /* The recording is TTS, not a human reading; the reader must not imply otherwise. */
 'Synthesized narration disclosed in the reader':/مُولَّدة آليًا|synthesized/.test(src.stdHtml),
 'Audio index matches chapters carrying a track':(()=>{
  const idx=json('public/standards/data/b4-audio.json');if(!idx)return true;
  const tracks=new Map((idx.tracks||[]).map(t=>[t.chapter,t.track]));
  for(let n=1;n<=46;n++){
   const f='public/standards/data/b4/'+n+'.json';if(!fs.existsSync(f))return false;
   const ch=json(f);const has=ch?.study?.track!=null;
   if(has!==tracks.has(n))return false;
   if(has&&tracks.get(n)!==ch.study.track)return false;
  }
  return tracks.size===34;
 })(),
 /* A connection probe skips all standards/professional context and swaps in a
  * "you are testing a connection" system prompt. Deciding that from the prompt text
  * meant a real audit question containing "connected" silently lost its grounding and
  * its auditor role, so the probe path must be driven by the caller's explicit flag. */
 'AI probe detection is flag-driven, not text-sniffed':
   !src.zai||(/b\.probe===true/.test(src.zai)&&!/\/[^\n]*\bCONNECTED\b[^\n]*\/i\.test\(task\)/.test(src.zai)),
 /* Anchored to the probeBody literal, not the file: a bare /probe:true/ also matches the
  * explanatory comment above it, so the gate would pass even with the flag deleted. */
 'Worker marks its own connection probe explicitly':
   !src.zai||/probeBody\s*=\s*\{[^}]*\bprobe:\s*true\b/.test(src.worker),
 /* Snippet offsets are found in normalized text but sliced from the source; without an
  * index map they drift by however much normalization shrank the page, which can push
  * the matched term out of the excerpt handed to the model. Require the mapped offset to
  * actually be *used* at the slice site, not merely defined somewhere in the file. */
 'Evidence snippets use index-mapped offsets':
   [src.zai,src.workspace].filter(Boolean).every(s=>
     /function normBookTextMapped/.test(s)&&/mapped\.idx\[z\]/.test(s)&&/mapped\.src\.slice\(/.test(s)),
};
const critical=[...Object.entries(checks),...Object.entries(architecture)].filter(([,v])=>!v).map(([k])=>k);
const lines=['# Kosif v36.3 Deep Audit','',`Files scanned: **${files.length}**`,`Frontend bytes: **${Buffer.byteLength(src.html)}**`,`Duplicate IDs: **${dup.length}**`,`Missing referenced static assets: **${missing.length}**`,'','## Standards data inventory',...lib.map(x=>`- ${x.id}: metadata chapters=${x.chapters??'—'} words=${x.words??'—'} · packaged chapter files=${bookCounts[x.id]??0}`),'','## Capability inventory',...Object.entries(checks).map(([k,v])=>`- ${v?'✅':'❌'} ${k}`),'','## Architecture / security gates',...Object.entries(architecture).map(([k,v])=>`- ${v?'✅':'❌'} ${k}`),'',`## Critical failures: ${critical.length}`,...critical.map(x=>'- '+x),'','## Missing refs',...missing.map(x=>'- '+x)];
fs.writeFileSync('/tmp/kosif-v36-deep-audit.md',lines.join('\n'));console.log(lines.join('\n'));
if(critical.length)process.exitCode=2;
