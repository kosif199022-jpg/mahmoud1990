import legacyWorker from './legacy-worker.js';

const E=new Set(['/manifest.webmanifest','/sw.js','/icon.svg','/migrate-v35.js']);
const AI_COOKIE='kosif_ai_session';
const AI_SESSION_TTL=8*60*60;
const MAX_ATTEMPTS=5;
const BUILD_INFO={version:'v36.3',buildId:'2026.08.17-v36.3-master-requirements',release:'Requirements Consolidation & Continuity',schemaVersion:13,appCache:'kosif-native-v36-3-app',standardsCache:'kosif-native-v36-3-standards',sourceRepo:'kosif199022-jpg/mahmoud1990',mobileNav:['الرئيسية','الميزان','الجولات','المطالبات','المزيد'],fontScale:{min:90,max:200},aiGate:'owner-password+verified-key'};

async function a(req,env){if(!env?.ASSETS)return null;try{const u=new URL(req.url);let p=u.pathname;if(p==='/'||p.endsWith('/'))p=p+'index.html'.replace(/^\/index\.html$/,'index.html');if(u.pathname==='/')p='/index.html';if(p!==u.pathname){u.pathname=p;req=new Request(u,req)}const r=await env.ASSETS.fetch(req);return r.status===404?null:r}catch{return null}}
async function nativeShell(req,env){if(!env?.ASSETS)return new Response('Kosif shell unavailable',{status:503,headers:{'cache-control':'no-store'}});try{const r=await env.ASSETS.fetch(new Request(new URL('/index.html',req.url),{method:'GET',headers:req.headers}));return r.ok?tag(r):new Response('Kosif shell unavailable',{status:503,headers:{'cache-control':'no-store'}})}catch{return new Response('Kosif shell unavailable',{status:503,headers:{'cache-control':'no-store'}})}}
async function assetIndexDiagnostic(req,env){if(!env?.ASSETS)return j({ok:false,error:'ASSETS_MISSING'},503);try{const r=await env.ASSETS.fetch(new Request(new URL('/index.html',req.url),{method:'GET',headers:req.headers}));const text=await r.clone().text();return j({ok:r.ok,status:r.status,contentType:r.headers.get('content-type'),bytes:text.length,hasKosifBoot:text.includes('id=\"kosif-boot\"'),hasV36Continuity:text.includes('/v36-continuity.js?v=36.3'),hasLegacyWorkspace:text.includes('KOSIF_WORKSPACE_V36_2026_08_17')},r.ok?200:503)}catch{return j({ok:false,error:'ASSET_INDEX_UNAVAILABLE'},503)}}
function tag(r){const h=new Headers(r.headers);h.set('x-kosif-release','native-v36-3-master-requirements');h.set('x-content-type-options','nosniff');h.set('referrer-policy','strict-origin-when-cross-origin');return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
function j(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store',...headers}})}
async function sha256(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function safeEq(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function cookies(req){const out={};for(const p of String(req.headers.get('cookie')||'').split(';')){const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}return out}
function token(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function session(req,env){if(!env?.DATA)return null;const t=cookies(req)[AI_COOKIE];if(!t)return null;const key='kosif:ai:session:'+await sha256(t);const s=await env.DATA.get(key,'json');if(!s||!s.expiresAt||s.expiresAt<Date.now()){if(s)await env.DATA.delete(key).catch(()=>{});return null}return{token:t,key,data:s}}
async function saveSession(env,s){const ttl=Math.max(60,Math.ceil((Number(s.data.expiresAt)-Date.now())/1000));await env.DATA.put(s.key,JSON.stringify(s.data),{expirationTtl:ttl})}
function publicVerified(s){const out={};for(const [provider,x] of Object.entries(s?.data?.verified||{}))out[provider]={model:x.model,testedAt:x.testedAt};return out}
async function authStatus(req,env){const s=await session(req,env);return j({unlocked:!!s,expiresAt:s?.data?.expiresAt||null,ownerEmailMasked:'m••••••57@gmail.com',verified:publicVerified(s)})}
async function authLogin(req,env){
  const gateHash=String(env?.KOSIF_AI_GATE_HASH||env?.AI_GATE_HASH||'');
  if(!env?.DATA||!gateHash)return j({error:'AI gate is not configured. Access remains locked.'},503);
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown';
  const rlKey='kosif:ai:login:'+await sha256(ip);const now=Date.now();let rl=await env.DATA.get(rlKey,'json')||{count:0};
  if(rl.blockedUntil&&rl.blockedUntil>now)return j({error:'تم إيقاف المحاولات مؤقتًا. حاول بعد عدة دقائق.'},429);
  let body={};try{body=await req.json()}catch{return j({error:'طلب غير صالح'},400)}
  const password=String(body.password||'');if(!password||password.length>200)return j({error:'الباسورد مطلوب'},400);
  const got=await sha256(password),expected=gateHash;
  if(!safeEq(got,expected)){
    const count=(rl.count||0)+1,blockedUntil=count>=MAX_ATTEMPTS?now+15*60*1000:null;
    await env.DATA.put(rlKey,JSON.stringify({count:blockedUntil?0:count,blockedUntil}),{expirationTtl:15*60});
    return j({error:blockedUntil?'محاولات كثيرة. تم القفل 15 دقيقة.':'الباسورد غير صحيح.'},blockedUntil?429:401);
  }
  await env.DATA.delete(rlKey).catch(()=>{});
  const t=token(),hash=await sha256(t),expiresAt=now+AI_SESSION_TTL*1000;
  await env.DATA.put('kosif:ai:session:'+hash,JSON.stringify({createdAt:now,expiresAt,verified:{}}),{expirationTtl:AI_SESSION_TTL});
  return j({ok:true,unlocked:true,expiresAt,verified:{}},200,{'set-cookie':`${AI_COOKIE}=${encodeURIComponent(t)}; Path=/; Max-Age=${AI_SESSION_TTL}; HttpOnly; Secure; SameSite=Strict`});
}
async function authLogout(req,env){const s=await session(req,env);if(s)await env.DATA.delete(s.key).catch(()=>{});return j({ok:true,unlocked:false},200,{'set-cookie':`${AI_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`})}
function aiPath(p){return /^\/api\/(?:kosif\/)?(?:ai|gemini|openai|anthropic|claude|council)(?:\/|$)/i.test(p)}
function normalProvider(v){v=String(v||'').toLowerCase();return v==='claude'?'anthropic':v}
function providerFrom(path,b){const p=normalProvider(b?.provider);if(p)return p;if(/gemini/i.test(path))return'gemini';if(/openai/i.test(path))return'openai';if(/anthropic|claude/i.test(path))return'anthropic';return''}
async function keyFingerprint(provider,model,key){return sha256([normalProvider(provider),String(model||'').trim(),String(key||'').trim()].join('\n'))}
async function parseBody(req){try{return await req.clone().json()}catch{return null}}
async function testAI(req,env,ctx){
  const s=await session(req,env);if(!s)return j({error:'AI_LOCKED',locked:true,message:'أدخل باسورد المالك أولًا.'},401);
  const b=await parseBody(req);if(!b)return j({error:'طلب اختبار غير صالح'},400);
  const provider=providerFrom('/api/kosif/ai',b),model=String(b.model||'').trim(),key=String(b.key||'').trim();
  if(!provider||!model||!key)return j({error:'حدد المزود والنموذج ومفتاح API قبل الاختبار.'},400);
  const probeBody={provider,model,key,prompt:'اختبار اتصال Kosif. أجب بكلمة واحدة فقط: CONNECTED',json:false,maxTokens:64,agent:b.agent||{jurisdiction:'saudi',industry:'عام'}};
  const probe=new Request(new URL('/api/kosif/ai',req.url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(probeBody)});
  const upstream=await legacyWorker.fetch(probe,env,ctx);
  let data={};try{data=await upstream.clone().json()}catch{try{data={text:await upstream.clone().text()}}catch{}}
  if(!upstream.ok)return j({error:data?.error||data?.message||'فشل اختبار مزود AI',provider,model},upstream.status>=400&&upstream.status<500?400:502);
  const testedAt=new Date().toISOString(),fp=await keyFingerprint(provider,model,key);
  s.data.verified=s.data.verified||{};s.data.verified[provider]={fp,model,testedAt};await saveSession(env,s);
  return j({ok:true,connected:true,provider,model,testedAt,message:'تم اختبار الاتصال بنجاح.'});
}
async function requireVerifiedAI(req,env){
  const s=await session(req,env);if(!s)return{response:j({error:'AI_LOCKED',locked:true,message:'أدخل باسورد المالك لفتح قدرات الذكاء الاصطناعي.'},401)};
  if(req.method!=='POST')return{response:j({error:'AI_METHOD_NOT_ALLOWED'},405)};
  const b=await parseBody(req);if(!b)return{response:j({error:'AI_REQUEST_INVALID'},400)};
  const provider=providerFrom(new URL(req.url).pathname,b),model=String(b.model||'').trim(),key=String(b.key||'').trim();
  if(!provider||!model||!key)return{response:j({error:'AI_NOT_VERIFIED',message:'اختبر اتصال المفتاح أولًا.'},428)};
  const v=s.data?.verified?.[provider],fp=await keyFingerprint(provider,model,key);
  if(!v||!safeEq(v.fp,fp))return{response:j({error:'AI_NOT_VERIFIED',provider,model,message:'هذا المفتاح/النموذج لم يجتز اختبار الاتصال في جلسة المالك الحالية.'},428)};
  return{s,body:b,provider};
}

export default{async fetch(req,env,ctx){
  const u=new URL(req.url);
  if(u.pathname==='/__health')return Response.json({ok:true,name:'Kosif Native',version:BUILD_INFO.version,release:BUILD_INFO.release,buildId:BUILD_INFO.buildId,architecture:'worker-first-static-assets',aiGate:BUILD_INFO.aiGate});
  if(u.pathname==='/__version')return j(BUILD_INFO);
  if(u.pathname==='/__asset-index')return assetIndexDiagnostic(req,env);
  if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/index.html'))return nativeShell(req,env);
  if(u.pathname==='/api/kosif/auth/status'&&req.method==='GET')return authStatus(req,env);
  if(u.pathname==='/api/kosif/auth/login'&&req.method==='POST')return authLogin(req,env);
  if(u.pathname==='/api/kosif/auth/logout'&&req.method==='POST')return authLogout(req,env);
  if(u.pathname==='/api/kosif/ai/test'&&req.method==='POST')return testAI(req,env,ctx);
  if(aiPath(u.pathname)){const gate=await requireVerifiedAI(req,env);if(gate.response)return gate.response;return legacyWorker.fetch(req,env,ctx)}
  if(u.pathname==='/standards')return Response.redirect(new URL('/standards/',u),308);
  if(req.method==='GET'&&(E.has(u.pathname)||u.pathname.startsWith('/standards/'))){const r=await a(req,env);if(r)return tag(r);if(E.has(u.pathname))return tag(await legacyWorker.fetch(req,env,ctx));return new Response('Not found',{status:404})}
  if(u.pathname.startsWith('/api/')||req.method!=='GET')return legacyWorker.fetch(req,env,ctx);
  const r=await a(req,env);return r?tag(r):legacyWorker.fetch(req,env,ctx)
}};
