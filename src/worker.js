import legacyWorker from './legacy-worker.js';

const E=new Set(['/','/index.html','/manifest.webmanifest','/sw.js','/icon.svg','/migrate-v35.js']);
const AI_COOKIE='kosif_ai_session';
const AI_SESSION_TTL=8*60*60;
const MAX_ATTEMPTS=5;
const AI_DEFAULTS={gemini:'gemini-3.6-flash',openai:'gpt-5.6',anthropic:'claude-sonnet-4-20250514'};

async function a(req,env){if(!env?.ASSETS)return null;try{const r=await env.ASSETS.fetch(req);return r.status===404?null:r}catch{return null}}
function tag(r){const h=new Headers(r.headers);h.set('x-kosif-release','native-v36-consolidated');h.set('x-content-type-options','nosniff');h.set('referrer-policy','strict-origin-when-cross-origin');return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
function j(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}})}
async function sha256(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function safeEq(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function cookies(req){const out={};for(const p of String(req.headers.get('cookie')||'').split(';')){const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}return out}
function token(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function normProvider(p){p=String(p||'gemini').toLowerCase();return p==='claude'?'anthropic':p}
function modelFor(provider,model){provider=normProvider(provider);return String(model||AI_DEFAULTS[provider]||'').trim()}
function sameOrigin(req){const o=req.headers.get('origin');return !o||o===new URL(req.url).origin}
function connectionView(data){const out={};for(const [p,x] of Object.entries(data?.connections||{})){if(x?.testedAt)out[p]={model:x.model,testedAt:x.testedAt,displayName:x.displayName||null}}return out}

async function session(req,env){
  if(!env?.DATA)return null;
  const t=cookies(req)[AI_COOKIE];if(!t)return null;
  const key='kosif:ai:session:'+await sha256(t),s=await env.DATA.get(key,'json');
  if(!s||!s.expiresAt||s.expiresAt<Date.now()){if(s)await env.DATA.delete(key).catch(()=>{});return null}
  s.connections=s.connections&&typeof s.connections==='object'?s.connections:{};
  return{token:t,key,data:s};
}
async function persistSession(s,env){
  const ttl=Math.max(60,Math.floor((Number(s.data.expiresAt)-Date.now())/1000));
  await env.DATA.put(s.key,JSON.stringify(s.data),{expirationTtl:ttl});
}
async function authStatus(req,env){const s=await session(req,env);return j({unlocked:!!s,expiresAt:s?.data?.expiresAt||null,email:'melkosif57@gmail.com',connections:s?connectionView(s.data):{}})}
async function authLogin(req,env){
  if(!sameOrigin(req))return j({error:'Origin غير مسموح'},403);
  if(!env?.DATA||!env?.AI_GATE_HASH)return j({error:'AI gate is not configured. Access remains locked.'},503);
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown';
  const rlKey='kosif:ai:login:'+await sha256(ip),now=Date.now();let rl=await env.DATA.get(rlKey,'json')||{count:0};
  if(rl.blockedUntil&&rl.blockedUntil>now)return j({error:'تم إيقاف المحاولات مؤقتًا. حاول بعد عدة دقائق.'},429);
  let body={};try{body=await req.json()}catch{return j({error:'طلب غير صالح'},400)}
  const password=String(body.password||'');if(!password||password.length>200)return j({error:'الباسورد مطلوب'},400);
  const got=await sha256(password),expected=String(env.AI_GATE_HASH||'');
  if(!safeEq(got,expected)){
    const count=(rl.count||0)+1,blockedUntil=count>=MAX_ATTEMPTS?now+15*60*1000:null;
    await env.DATA.put(rlKey,JSON.stringify({count:blockedUntil?0:count,blockedUntil}),{expirationTtl:15*60});
    return j({error:blockedUntil?'محاولات كثيرة. تم القفل 15 دقيقة.':'الباسورد غير صحيح.'},blockedUntil?429:401);
  }
  await env.DATA.delete(rlKey).catch(()=>{});
  const t=token(),hash=await sha256(t),expiresAt=now+AI_SESSION_TTL*1000;
  await env.DATA.put('kosif:ai:session:'+hash,JSON.stringify({createdAt:now,expiresAt,connections:{}}),{expirationTtl:AI_SESSION_TTL});
  return j({ok:true,unlocked:true,expiresAt,connections:{}},200,{'set-cookie':`${AI_COOKIE}=${encodeURIComponent(t)}; Path=/; Max-Age=${AI_SESSION_TTL}; HttpOnly; Secure; SameSite=Strict`});
}
async function authLogout(req,env){if(!sameOrigin(req))return j({error:'Origin غير مسموح'},403);const s=await session(req,env);if(s)await env.DATA.delete(s.key).catch(()=>{});return j({ok:true,unlocked:false},200,{'set-cookie':`${AI_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`})}

async function providerProbe(provider,model,key){
  provider=normProvider(provider);model=modelFor(provider,model);
  let r,d,url;
  if(provider==='openai'){
    url='https://api.openai.com/v1/models/'+encodeURIComponent(model);
    r=await fetch(url,{method:'GET',headers:{authorization:'Bearer '+key,'accept':'application/json'}});
  }else if(provider==='anthropic'){
    url='https://api.anthropic.com/v1/models/'+encodeURIComponent(model);
    r=await fetch(url,{method:'GET',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','accept':'application/json'}});
  }else{
    provider='gemini';url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model);
    r=await fetch(url,{method:'GET',headers:{'x-goog-api-key':key,'accept':'application/json'}});
  }
  try{d=await r.json()}catch{d={}}
  if(!r.ok){const msg=d?.error?.message||d?.message||('Provider HTTP '+r.status);return{ok:false,status:r.status,error:String(msg),provider,model}}
  return{ok:true,status:r.status,provider,model,displayName:String(d?.displayName||d?.display_name||d?.id||d?.name||model).replace(/^models\//,'')};
}
async function aiTest(req,env,s){
  if(!sameOrigin(req))return j({error:'Origin غير مسموح'},403);
  let b={};try{b=await req.json()}catch{return j({error:'طلب غير صالح'},400)}
  const provider=normProvider(b.provider),model=modelFor(provider,b.model),key=String(b.key||'').trim();
  if(!['gemini','openai','anthropic'].includes(provider))return j({error:'مزود AI غير مدعوم'},400);
  if(key.length<8||key.length>1000)return j({error:'أدخل مفتاح API صالحًا لاختباره.'},400);
  let probe;try{probe=await providerProbe(provider,model,key)}catch(e){return j({ok:false,connected:false,provider,model,error:'تعذر الوصول إلى المزود: '+String(e?.message||e)},502)}
  if(!probe.ok)return j({ok:false,connected:false,...probe},probe.status===401||probe.status===403?401:400);
  const testedAt=new Date().toISOString(),keyHash=await sha256(key);
  s.data.connections=s.data.connections||{};
  s.data.connections[provider]={model,keyHash,testedAt,displayName:probe.displayName};
  await persistSession(s,env);
  return j({ok:true,connected:true,provider,model,testedAt,displayName:probe.displayName});
}
async function validateTestedMainAI(req,s){
  let b={};try{b=await req.clone().json()}catch{return{ok:false,response:j({error:'طلب AI غير صالح'},400)}}
  const provider=normProvider(b.provider),model=modelFor(provider,b.model),key=String(b.key||'').trim(),c=s.data.connections?.[provider];
  if(!key||!c)return{ok:false,response:j({error:'AI_CONNECTION_NOT_TESTED',connected:false,message:'اختبر مفتاح المزود بنجاح أولًا.'},428)};
  const kh=await sha256(key);
  if(!safeEq(kh,c.keyHash)||String(c.model)!==model)return{ok:false,response:j({error:'AI_CONNECTION_NOT_TESTED',connected:false,message:'تم تغيير المفتاح أو النموذج. أعد اختبار الاتصال.'},428)};
  return{ok:true};
}
function aiPath(p){return /^\/api\/(?:kosif\/)?(?:ai|gemini|openai|anthropic|claude|council)(?:\/|$)/i.test(p)}

export default{async fetch(req,env,ctx){
  const u=new URL(req.url);
  if(u.pathname==='/__health')return Response.json({ok:true,name:'Kosif Native',version:'v36',release:'Consolidated',architecture:'worker-first-static-assets',aiGate:'owner-password+tested-provider'});
  if(u.pathname==='/api/kosif/auth/status'&&req.method==='GET')return authStatus(req,env);
  if(u.pathname==='/api/kosif/auth/login'&&req.method==='POST')return authLogin(req,env);
  if(u.pathname==='/api/kosif/auth/logout'&&req.method==='POST')return authLogout(req,env);

  if(u.pathname==='/api/kosif/ai/test'&&req.method==='POST'){
    const s=await session(req,env);if(!s)return j({error:'AI_LOCKED',locked:true,message:'أدخل باسورد المالك لفتح قدرات الذكاء الاصطناعي.'},401);
    return aiTest(req,env,s);
  }
  if(aiPath(u.pathname)){
    if(!sameOrigin(req))return j({error:'Origin غير مسموح'},403);
    const s=await session(req,env);if(!s)return j({error:'AI_LOCKED',locked:true,message:'أدخل باسورد المالك لفتح قدرات الذكاء الاصطناعي.'},401);
    if(u.pathname==='/api/kosif/ai'&&req.method==='POST'){
      const v=await validateTestedMainAI(req,s);if(!v.ok)return v.response;
    }
  }

  if(u.pathname==='/standards')return Response.redirect(new URL('/standards/',u),308);
  if(req.method==='GET'&&(E.has(u.pathname)||u.pathname.startsWith('/standards/'))){const r=await a(req,env);if(r)return tag(r);if(E.has(u.pathname))return tag(await legacyWorker.fetch(req,env,ctx));return new Response('Not found',{status:404})}
  if(u.pathname.startsWith('/api/')||req.method!=='GET')return legacyWorker.fetch(req,env,ctx);
  const r=await a(req,env);return r?tag(r):legacyWorker.fetch(req,env,ctx)
}};
