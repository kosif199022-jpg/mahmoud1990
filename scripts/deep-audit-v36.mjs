import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const json=p=>{try{return JSON.parse(read(p))}catch{return null}};
const html=read('frontend/index.html'),pub=read('public/index.html'),workspace=read('src/kosif-workspace.js'),worker=read('src/worker.js'),legacy=read('src/legacy-worker.js'),sw=read('public/sw.js'),stdHtml=read('public/standards/index.html'),stdPro=read('public/standards/reader-pro-v36.js'),stdSw=read('public/standards/sw.js'),gov=read('public/v36-governance.js'),gate=read('public/v36-ai-gate.js'),features=read('public/v36-features.js'),outputs=read('public/v36-outputs.js');
const all=[html,pub,workspace,worker,legacy,sw,stdHtml,stdPro,stdSw,gov,gate,features,outputs].join('\n');
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const p=path.join(dir,e.name);e.isDirectory()?walk(p,out):out.push(p)}return out}
const files=walk(root).map(p=>path.relative(root,p)).sort();
const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]),dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>x.startsWith('/'));
const missing=[];for(const u of refs){const clean=u.split('?')[0].split('#')[0];if(clean==='/'||clean.startsWith('/api/'))continue;if(!fs.existsSync('public'+clean))missing.push(clean)}
const legacyRefs=[...new Set(refs.map(x=>x.split('?')[0]).filter(x=>x.startsWith('/legacy/')))];
const lib=json('public/standards/data/library.json')||[];
const bookCounts=Object.fromEntries(['b1','b2','b3'].map(id=>[id,fs.existsSync('public/standards/data/'+id)?fs.readdirSync('public/standards/data/'+id).filter(x=>x.endsWith('.json')).length:0]));
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
 'Audit Trail + human decisions':/Audit Trail|HUMAN_DECISION|Accepted|Rejected/i.test(gov),
 'Multimodal AI evidence':/inline_data|inlineData|input_file|document.*base64|attachmentsUsed/i.test(workspace),
 'Council independent providers':/gemini[\s\S]*openai[\s\S]*anthropic/i.test(gov),
 'Council provider tests':/councilOK|\/api\/kosif\/ai\/test|c-test/.test(gov),
 'Owner password gate':/AI_GATE_HASH|kosif_ai_session|HttpOnly; Secure; SameSite=Strict/.test(worker),
 'Server verified-key fingerprint':/keyFingerprint|AI_NOT_VERIFIED|verified-key/.test(worker),
 'Dedicated connection test endpoint':/\/api\/kosif\/ai\/test/.test(worker)&&/testAI\(/.test(worker),
 'API key fields hard locked before owner auth':/KEY_FIELDS[\s\S]*readOnly=true[\s\S]*beforeinput/.test(gate),
 'No key-presence Active heuristic':!html.includes('AI Active ·')&&!html.includes("hasKey:()=>!!apiKey()"),
 'Connected status requires verification':/aiVerified\(st\.provider,st\.model,k\)/.test(html)&&/AI متصل/.test(html),
 'Reader TTS':/speechSynthesis|SpeechSynthesisUtterance/.test(stdPro),
 'Reader word highlighting':/Highlight|kosif-speech|onboundary/.test(stdPro),
 'Reader Media Session':/mediaSession|MediaMetadata/.test(stdPro),
 'Reader Wake Lock':/wakeLock/.test(stdPro),
 'Reader auto-scroll 1–10':/requestAnimationFrame/.test(stdPro)&&/min=\\?"1\\?" max=\\?"10/.test(stdPro),
 'Reader stops auto-scroll on touch':/touchstart[\s\S]*autoOff/.test(stdPro),
 'Reader sleep timer':/setSleep|sleepId/.test(stdPro),
 'Reader standards code jump':/jumpCode|IAS 16|IFRS 9/.test(stdPro),
 'Reader chapter/journal export':/exportChapter/.test(stdPro)&&/exportJournalPro/.test(stdPro),
 'Reader streak / continue support':/streak\(|markDay/.test(stdPro)&&/last/.test(stdHtml),
 'Standards pro runtime wired':/reader-pro-v36\.js\?v=36\.1/.test(stdHtml)&&/reader-pro-v36\.js/.test(stdSw),
 'SOCPA/latest priority policy':/SOCPA|الهيئة السعودية|أولوية/.test(all),
 'IFRS 18/19 readiness':/IFRS 18/.test(all)&&/IFRS 19/.test(all),
 'Current GPT default':/gpt-5\.6/.test(workspace),
 'Current Gemini default':/gemini-3\.6-flash/.test(workspace),
};
const architecture={
 'No missing static refs':missing.length===0,
 'No duplicate static IDs':dup.length===0,
 'Only approved recovered legacy core':legacyRefs.length===1&&legacyRefs[0]==='/legacy/core-v36.js',
 'No Google Fonts dependency':!/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html),
 'No global fetch monkeypatch':!/window\.fetch\s*=/.test(all),
 'Main SW excludes APIs':/pathname\.startsWith\('\/api\/'\)/.test(sw),
 'Standards SW scoped to standards':/pathname\.startsWith\('\/standards\/'\)/.test(stdSw),
 'Public company writes authenticated':/writeTokenHash|canWritePublic|authorization/i.test(workspace),
 'Private company encryption retained':/AES-GCM|AES_GCM|crypto\.subtle/i.test(all),
};
const critical=[...Object.entries(checks),...Object.entries(architecture)].filter(([,v])=>!v).map(([k])=>k);
const lines=['# Kosif v36.1 Deep Audit','',`Files scanned: **${files.length}**`,`Frontend bytes: **${Buffer.byteLength(html)}**`,`Duplicate IDs: **${dup.length}**`,`Missing referenced static assets: **${missing.length}**`,'', '## Standards data inventory',...lib.map(x=>`- ${x.id}: metadata chapters=${x.chapters??'—'} words=${x.words??'—'} · packaged chapter files=${bookCounts[x.id]??0}`),'', '## Capability inventory',...Object.entries(checks).map(([k,v])=>`- ${v?'✅':'❌'} ${k}`),'','## Architecture / security gates',...Object.entries(architecture).map(([k,v])=>`- ${v?'✅':'❌'} ${k}`),'',`## Critical failures: ${critical.length}`,...critical.map(x=>'- '+x),'','## Missing refs',...missing.map(x=>'- '+x)];
fs.writeFileSync('/tmp/kosif-v36-deep-audit.md',lines.join('\n'));console.log(lines.join('\n'));
if(critical.length)process.exitCode=2;
