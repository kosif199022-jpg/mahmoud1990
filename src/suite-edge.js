import securityEdge from './security-edge.js';
import { proxyWealth } from './suite-proxy.js';
import { handleV38 } from './v38-api.js';
import { handleRealtimeSession } from './v38-realtime-session.js';
import { handleSystemBrainV2 } from './system-brain-v2.js';

const SUITE={
  productName:'Kosif',
  version:'v41.0.0-root',
  buildId:'2026.08.20-v41-editorial-cinematic-canva',
  architecture:'suite-edge → security-edge → native-worker + v38 trusted core',
  modules:{audit:'/audit/',libraries:'/libraries/',wealth:'/wealth/reader.html',sales:'/sales/'},
  systemBrain:'/data/kosif-system-brain-v1.json',
  semanticMemory:'LlamaParse → embeddings → Supabase PostgreSQL/pgvector',
  bookEngine:'kosif.book.v1',
  designAuthority:'KOSIF Editorial v41 cinematic Arabic magazine system informed by Canva with governed motion and color',
  experienceVersion:'v41.0.0',
  baseVisualVersion:'v40.0.0',
  installable:true,
  deterministicEngine:'kosif-blueprint-v3 + ISA opinion tree + v38 minor-unit core',
  aiGate:'owner-password+verified-key',
  aiProviders:['gemini','openai','anthropic','zai','public-local'],
  sourceRepo:'kosif199022-jpg/mahmoud1990'
};
const OWNER_COOKIE='kosif_ai_session';
const enc=new TextEncoder();
const READER_BOOKS={
  std2018:{source:'b1',author:'الهيئة السعودية للمحاسبين القانونيين',role:'نسخة عربية معتمدة',note:'مرجع تاريخي. الأولوية المهنية لأحدث إصدار رسمي نافذ.'},
  std2025:{source:'b3',author:'الهيئة السعودية للمراجعين والمحاسبين',role:'مرجع رسمي محدث',note:'المتن من المصدر الرسمي المجهز داخل Kosif. الأولوية دائمًا لأحدث إصدار رسمي نافذ.'},
  dipifr:{source:'b2',author:'BPP Learning Media',role:'مادة تدريبية',note:'مادة تدريبية وتمارين؛ لا تحل محل SOCPA أو IFRS كمصدر اعتماد مهني.'}
};
async function sha256(s){const d=await crypto.subtle.digest('SHA-256',enc.encode(String(s||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cookies(req){const out={};for(const p of String(req.headers.get('cookie')||'').split(';')){const i=p.indexOf('=');if(i>0){try{out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}catch{}}}return out}
async function ownerSession(req,env){if(!env?.DATA)return null;const t=cookies(req)[OWNER_COOKIE];if(!t)return null;const rec=await env.DATA.get('kosif:ai:session:'+await sha256(t),'json');return rec?.expiresAt&&Number(rec.expiresAt)>Date.now()?rec:null}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-kosif-suite':SUITE.version}})}
function redirect(req,path,status=308){return Response.redirect(new URL(path,req.url),status)}
async function staticAsset(req,env,path){if(!env?.ASSETS)return null;const assetUrl=new URL(path,'https://assets.local');const h=new Headers();for(const k of ['accept','accept-language','range','if-none-match','if-modified-since']){const v=req.headers.get(k);if(v)h.set(k,v)}const r=await env.ASSETS.fetch(new Request(assetUrl,{method:'GET',headers:h}));return r.status===404?null:r}
async function assetJson(req,env,path){const r=await staticAsset(req,env,path);if(!r?.ok)return null;try{return await r.json()}catch{return null}}
function sameOriginApi(r,req){const h=new Headers(r.headers);h.delete('access-control-allow-origin');const origin=req.headers.get('origin');if(origin){try{const a=new URL(origin),b=new URL(req.url);if(a.protocol===b.protocol&&a.host===b.host){h.set('access-control-allow-origin',origin);h.set('vary','Origin')}}catch{}}h.set('x-kosif-suite',SUITE.version);h.set('x-content-type-options','nosniff');return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
function decorate(r,kind='module'){const h=new Headers(r.headers);h.set('x-kosif-suite',SUITE.version);h.set('x-kosif-suite-module',kind);h.set('x-content-type-options','nosniff');return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
function partLabel(c,id){const t=`${c?.title||''} ${c?.name||''}`;if(id==='dipifr'){if(/ANSWER/i.test(t))return'الإجابات';if(/MOCK/i.test(t))return'الاختبارات التجريبية';if(/QUESTION/i.test(t))return'الأسئلة';return'المقدمة'}if((Number(c?.no)||0)<=2||/إطار مفاهيم|التحول للمعايير|حقوق التأليف/.test(t))return'التمهيد وإطار المفاهيم';if(/معيار المحاسبة الدولي/.test(t))return'معايير المحاسبة الدولية IAS';if(/تفسير|IFRIC|SIC/.test(t))return'التفسيرات';if(/المعيار الدولي للتقرير المالي/.test(t))return'المعايير الدولية للتقرير المالي IFRS';return'إصدارات سعودية مكملة'}
function readerParts(data,id){const ch=Array.isArray(data?.chapters)?data.chapters:[];const out=[];for(const c of ch){const label=partLabel(c,id),no=Number(c.no)||1,last=out[out.length-1];if(!last||last.title!==label)out.push({name:`الباب ${out.length+1}`,title:label,intro:'',from:no,to:no});else last.to=no}return out.length?out:[{name:'الكتاب',title:data?.title||'الكتاب',intro:'',from:1,to:Math.max(1,ch.length)}]}
async function wealthBookData(req,env,u){
  const p=u.pathname;
  if(p==='/wealth/books/library.json'){
    const lib=await assetJson(req,env,'/standards/data/library.json');if(!Array.isArray(lib))return json({error:'LIBRARY_DATA_UNAVAILABLE'},503);
    const byId=new Map(lib.map(x=>[x.id,x]));const specs=[['mafateeh','b4'],['std2018','b1'],['std2025','b3'],['dipifr','b2']],out=[];
    for(const [id,source] of specs){const x=byId.get(source);if(!x)continue;let parts=Number(x.parts)||1;if(id!=='mafateeh'){const meta=await assetJson(req,env,`/standards/data/${source}.json`);if(meta)parts=readerParts(meta,id).length}const cfg=READER_BOOKS[id]||{};out.push({id,title:x.title,subtitle:x.sub||'',author:x.author||cfg.author||'',year:x.year||'',dir:x.dir||'rtl',parts,chapters:Number(x.chapters)||0,words:Number(x.words)||0,audio:id==='mafateeh',embedded:id==='mafateeh',kind:x.kind||((id==='dipifr')?'training':'professional'),professionalAuthority:id==='mafateeh'?false:id!=='dipifr'})}
    return json(out);
  }
  const idx=p.match(/^\/wealth\/books\/(std2018|std2025|dipifr)\.json$/);if(idx){const cfg=READER_BOOKS[idx[1]];return redirect(req,`/standards/data/${cfg.source}.json`,307)}
  const chapter=p.match(/^\/wealth\/books\/(std2018|std2025|dipifr)\/(\d+)\.json$/);if(chapter){const id=chapter[1],n=Number(chapter[2]),cfg=READER_BOOKS[id];if(!Number.isInteger(n)||n<1||n>500)return json({error:'INVALID_CHAPTER'},400);return redirect(req,`/standards/data/${cfg.source}/${n}.json`,307)}
  return json({error:'BOOK_ROUTE_NOT_FOUND'},404);
}
async function hub(req,env){const r=await staticAsset(req,env,'/hub.html');if(!r)return new Response('Kosif hub unavailable',{status:503});const h=new Headers(r.headers);h.set('cache-control','no-cache');h.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");h.set('referrer-policy','strict-origin-when-cross-origin');h.set('permissions-policy','camera=(), microphone=(), geolocation=(), payment=()');h.set('x-frame-options','DENY');h.set('x-content-type-options','nosniff');h.set('x-kosif-suite',SUITE.version);return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
async function auditShell(req,env,ctx){const u=new URL(req.url);u.pathname='/';const r=await securityEdge.fetch(new Request(u,req),env,ctx);if(!r.ok||!/text\/html/i.test(r.headers.get('content-type')||''))return decorate(r,'audit');let text=await r.text();const editorial='<link rel="stylesheet" id="kosif-editorial-v41" data-kosif-editorial="v41" href="/kosif-editorial-v41.css?v=2026.08.20-v41-2">';const inkGoldV46='<link rel="stylesheet" id="kosif-ink-gold-v46" href="/kosif-ink-gold-v46.css?v=46">';const head='<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><link rel="stylesheet" href="/suite-shell.css"><link rel="stylesheet" id="kosif-kitab-theme" href="/kosif-kitab-theme.css?v=1.0.0-kitab"><script src="/kosif-kitab-theme.js"></script><script src="/v37-privacy-guard.js"></script><script src="/v37-audit-safety.js" defer></script><script src="/suite-shell.js" defer></script><link rel="stylesheet" href="/v38-ultimate.css?v=38"><link rel="stylesheet" href="/v38-user-polish.css?v=38.1.1-canva"><link rel="preload" as="image" href="/assets/kosif-studio-hero-v40.webp" fetchpriority="high"><link rel="stylesheet" id="kosif-studio-v40" href="/kosif-studio-v40.css?v=2026.08.20-v40">'+editorial+inkGoldV46+'<script src="/v38-ultimate.js?v=38" defer></script><script src="/v38-io.js?v=38" defer></script><script src="/v38-reports.js?v=40" defer></script><script src="/v38-accounting.js?v=38" defer></script><script src="/v38-evidence-graph.js?v=38" defer></script><script src="/v38-council-v3.js?v=40" defer></script><script src="/v38-source-fabric.js?v=38" defer></script><script src="/system-brain-v1.js?v=3" defer></script><script src="/v38-books.js?v=38" defer></script><script src="/v38-live.js?v=38.1.2" defer></script><script src="/v38-lab.js?v=38" defer></script><script src="/v38-user-polish.js?v=38.1.0" defer></script>';if(!text.includes('/v37-privacy-guard.js'))text=text.replace(/<\/head>/i,head+'</head>');else if(!text.includes('/kosif-editorial-v41.css'))text=text.replace(/<\/head>/i,editorial+'</head>');else if(!text.includes('/system-brain-v1.js'))text=text.replace(/<\/head>/i,'<script src="/system-brain-v1.js?v=3" defer></script></head>');const h=new Headers(r.headers);h.delete('content-length');h.set('content-type','text/html; charset=utf-8');h.set('cache-control','no-cache, no-store, must-revalidate');h.set('content-security-policy-report-only',"default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");h.set('x-kosif-suite-module','audit');h.set('x-kosif-suite',SUITE.version);h.set('x-kosif-build',SUITE.buildId);return new Response(text,{status:r.status,statusText:r.statusText,headers:h})}
async function libraryShell(req,env){const r=await staticAsset(req,env,'/libraries/index.html');if(!r)return new Response('Kosif libraries unavailable',{status:503,headers:{'cache-control':'no-store'}});return decorate(r,'libraries')}
async function salesShell(req,env){const r=await staticAsset(req,env,'/sales/index.html');if(!r)return new Response('Kosif Sales workspace unavailable',{status:503,headers:{'cache-control':'no-store'}});return decorate(r,'sales')}
async function privacyGate(req,env,u){const company=/^\/api\/kosif\/(?:companies(?:\/|$)|company\/private\/)/.test(u.pathname);const sourceRefresh=u.pathname==='/api/kosif/sources/refresh';if(!company&&!sourceRefresh)return null;const owner=await ownerSession(req,env);if(!owner)return json({error:'OWNER_AUTH_REQUIRED',locked:true,message:'بيانات العملاء وتحديث المصادر محمية بجلسة المالك في Kosif.'},401);if(sourceRefresh&&(u.searchParams.has('custom')||[...u.searchParams.keys()].some(k=>/^custom/i.test(k))))return json({error:'CUSTOM_SOURCE_BLOCKED',message:'المصادر المخصصة غير الموثقة معطلة. أضف المصدر إلى قائمة السماح في الكود بعد مراجعته.'},400);if(u.pathname==='/api/kosif/companies'&&req.method==='POST'&&req.headers.get('x-kosif-intent')!=='user-create')return json({error:'EXPLICIT_USER_ACTION_REQUIRED',message:'تم منع النشر التلقائي الصامت لبيانات الشركة.'},409);return null}
export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url),p=u.pathname;
    if(p==='/__suite')return json({ok:true,...SUITE});
    if(p==='/__version')return json({...SUITE,legacyRelease:'v41.0-compatible'});
    if(p==='/__health')return json({ok:true,name:'Kosif',...SUITE,security:{companyData:'owner-only',customSourceFetch:'allowlist-only',ai:'owner+verified-provider',realtimeKey:'server-secret-or-owner-session-transient'}});
    if(req.method==='GET'&&(p==='/'||p==='/hub'||p==='/hub/'))return hub(req,env);
    if(p==='/audit')return redirect(req,'/audit/');
    if(req.method==='GET'&&(p==='/audit/'||p==='/audit/index.html'))return auditShell(req,env,ctx);
    if(p==='/libraries')return redirect(req,'/libraries/');
    if(req.method==='GET'&&(p==='/libraries/'||p==='/libraries/index.html'))return libraryShell(req,env);
    if(p.startsWith('/libraries/')){const r=await staticAsset(req,env,p);if(r)return decorate(r,'libraries')}
    if(p==='/wealth')return redirect(req,'/wealth/reader.html');
    if(req.method==='GET'&&p.startsWith('/wealth/books/'))return decorate(await wealthBookData(req,env,u),'wealth-library');
    if(p.startsWith('/wealth/')){const r=await proxyWealth(req,env);if(r)return decorate(r,'wealth')}
    if(p==='/sales')return redirect(req,'/sales/');
    if(req.method==='GET'&&(p==='/sales/'||p==='/sales/index.html'))return salesShell(req,env);
    if(p==='/modules'||p==='/modules/')return redirect(req,'/sales/modules/');
    if(p.startsWith('/modules/')){const target='/sales'+p;const r=await staticAsset(req,env,target.endsWith('/')?target+'index.html':target);if(r)return decorate(r,'sales');return new Response('Not found',{status:404})}
    const blocked=await privacyGate(req,env,u);if(blocked)return blocked;
    if(p.startsWith('/api/kosif/v38/')){
      const owner=await ownerSession(req,env);
      const brain=await handleSystemBrainV2(req,env,u,owner);if(brain)return sameOriginApi(brain,req);
      const rr=await handleRealtimeSession(req,env,u,owner);if(rr)return sameOriginApi(rr,req);
      const r38=await handleV38(req,env,u,owner);if(r38)return sameOriginApi(r38,req);
    }
    const r=await securityEdge.fetch(req,env,ctx);
    return p.startsWith('/api/')?sameOriginApi(r,req):decorate(r,p.startsWith('/sales/')?'sales':'kosif');
  }
};