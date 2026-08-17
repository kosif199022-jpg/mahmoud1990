import appWorker from './worker.js';

const BUILD_INFO={
  version:'v36.4',
  buildId:'2026.08.18-v36.4-mobile-release-integrity',
  release:'Mobile Modal Integrity, Reader Auto-scroll Guard & Cache Generation',
  schemaVersion:14,
  appCache:'kosif-native-v36-4-app',
  standardsCache:'kosif-native-v36-4-standards',
  sourceRepo:'kosif199022-jpg/mahmoud1990',
  sourceCommit:'main',
  mobileNav:['الرئيسية','الميزان','الجولات','المطالبات','المزيد'],
  fontScale:{min:90,max:200},
  aiGate:'owner-password+verified-key',
  aiProviders:['gemini','openai','anthropic','zai'],
  integrity:{securityEdge:'fail-closed',modalScrollLock:'ios-safe',readerAutoScrollGuard:true,cacheGeneration:'v36.4'}
};
const OWNER_COOKIE='kosif_ai_session';
const LIBRARY_COOKIE='kosif_library_device';
const LIBRARY_COOKIE_TTL=365*24*60*60;
const EXPORT_PREFIX='/6ff6b51050ba881059c63e74/';
const LIBRARY_ACCESS_PREFIX='kosif:library:access:';
const LIBRARY_TRUST_PREFIX='kosif:library:audit-trusted:';
const LEGACY_SHARED_PATHS=new Set([
  '/api/state',
  '/api/notes',
  '/api/files',
  '/api/office/files',
  '/api/office/upload',
  '/api/companies',
  '/api/source-refresh'
]);

function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-kosif-release':'native-v36-4-mobile-release-integrity','x-kosif-build-id':BUILD_INFO.buildId,...headers}})}
function cookies(req){const out={};for(const p of String(req.headers.get('cookie')||'').split(';')){const i=p.indexOf('=');if(i>0){try{out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}catch{out[p.slice(0,i).trim()]=p.slice(i+1).trim()}}}return out}
async function sha256(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function token(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function cookieHeader(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`}
async function ownerSession(req,env){
  if(!env?.DATA)return null;
  const t=cookies(req)[OWNER_COOKIE];if(!t)return null;
  const key='kosif:ai:session:'+await sha256(t);
  const rec=await env.DATA.get(key,'json');
  if(!rec?.expiresAt||Number(rec.expiresAt)<=Date.now()){if(rec)await env.DATA.delete(key).catch(()=>{});return null}
  return rec;
}
function isLegacySharedPath(path){return LEGACY_SHARED_PATHS.has(path)||path.startsWith('/files/')||path.startsWith('/office/files/')}
function needsOwner(req,u){if(u.pathname.startsWith(EXPORT_PREFIX))return true;if(isLegacySharedPath(u.pathname))return true;return false}
async function ownerGuard(req,env,u,owner){if(!needsOwner(req,u)||owner)return null;return json({error:'OWNER_AUTH_REQUIRED',locked:true,message:'هذا المسار يقرأ أو يعدّل تخزينًا مشتركًا قديمًا أو يصدّر مصدر التطبيق، ولذلك يتطلب جلسة المالك. الواجهة العامة وبيانات الشركات الحديثة تظل متاحة دون هذا القفل.'},401)}

function validLibraryToken(v){return /^[A-Za-z0-9_-]{40,80}$/.test(String(v||''))}
async function libraryDevice(req){const current=cookies(req)[LIBRARY_COOKIE];const fresh=!validLibraryToken(current),value=fresh?token():current;return{token:value,hash:await sha256(value),fresh}}
function accessPrefix(hash){return LIBRARY_ACCESS_PREFIX+hash+':'}
function accessKey(hash,id){return accessPrefix(hash)+id}
async function libraryAccessIds(env,hash){if(!env?.DATA||!hash)return new Set();const r=await env.DATA.list({prefix:accessPrefix(hash),limit:1000});return new Set((r.keys||[]).map(k=>String(k.name||'').slice(accessPrefix(hash).length)).filter(Boolean))}
async function hasLibraryAccess(env,hash,id,owner){if(owner)return true;if(!env?.DATA||!hash||!id)return false;return !!(await env.DATA.get(accessKey(hash,id)))}
async function grantLibraryAccess(env,hash,id){if(env?.DATA&&hash&&id)await env.DATA.put(accessKey(hash,id),'1',{expirationTtl:LIBRARY_COOKIE_TTL})}
async function trustedBook(env,id){return !!(env?.DATA&&id&&(await env.DATA.get(LIBRARY_TRUST_PREFIX+id))==='1')}
async function ownerTrustApi(req,env,u,owner){
  if(u.pathname!=='/api/kosif/library/trust')return null;
  if(!owner)return json({error:'OWNER_AUTH_REQUIRED',locked:true,message:'اعتماد كتاب كمصدر مهني يتطلب جلسة المالك.'},401);
  if(req.method==='GET'){const id=String(u.searchParams.get('id')||'').trim();if(!id)return json({error:'id_required'},400);return json({ok:true,id,trusted:await trustedBook(env,id)})}
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  let b={};try{b=await req.clone().json()}catch{return json({error:'bad_json'},400)}const id=String(b.id||'').trim();if(!/^[A-Za-z0-9._-]{1,160}$/.test(id))return json({error:'invalid_book_id'},400);
  const meta=await env.DATA.get('library:meta:'+id,'json');if(!meta)return json({error:'book_not_found'},404);
  const trusted=b.trusted!==false;if(trusted)await env.DATA.put(LIBRARY_TRUST_PREFIX+id,'1');else await env.DATA.delete(LIBRARY_TRUST_PREFIX+id);
  return json({ok:true,id,trusted});
}
async function replaceJsonResponse(r,body,extraHeaders={}){const h=new Headers(r.headers);h.delete('content-length');for(const [k,v] of Object.entries(extraHeaders))h.set(k,v);return new Response(JSON.stringify(body),{status:r.status,statusText:r.statusText,headers:h})}
async function libraryList(req,env,ctx,owner){
  const r=await appWorker.fetch(req,env,ctx);if(!r.ok)return r;let d={};try{d=await r.clone().json()}catch{return r}
  const books=Array.isArray(d.books)?d.books:[];
  if(owner){const out=[];for(const b of books)out.push({...b,auditTrusted:await trustedBook(env,b.id)});return replaceJsonResponse(r,{...d,books:out,scope:'owner'})}
  const device=await libraryDevice(req),ids=await libraryAccessIds(env,device.hash),out=[];for(const b of books)if(ids.has(String(b.id)))out.push({...b,auditTrusted:await trustedBook(env,b.id)});
  const headers=device.fresh?{'set-cookie':cookieHeader(LIBRARY_COOKIE,device.token,LIBRARY_COOKIE_TTL)}:{};return replaceJsonResponse(r,{...d,books:out,scope:'device'},headers)
}
async function libraryStart(req,env,ctx,owner){
  const device=await libraryDevice(req),ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'';
  if(env?.DATA&&ip){const rlKey='kosif:library:start-rate:'+await sha256(ip),now=Date.now(),old=await env.DATA.get(rlKey,'json')||{count:0,from:now};const from=Number(old.from)||now,count=now-from<3600000?Number(old.count)||0:0;if(count>=10)return json({error:'LIBRARY_UPLOAD_RATE_LIMIT',message:'تم بلوغ حد بدء رفع الكتب لهذه الساعة. أكمل الرفع الحالي أو حاول لاحقًا.'},429);await env.DATA.put(rlKey,JSON.stringify({count:count+1,from:now-from<3600000?from:now}),{expirationTtl:3600})}
  const r=await appWorker.fetch(req,env,ctx);if(!r.ok)return r;let d={};try{d=await r.clone().json()}catch{return r}const id=String(d.id||d.book?.id||'');if(id)await grantLibraryAccess(env,device.hash,id);
  const h=new Headers(r.headers);h.set('set-cookie',cookieHeader(LIBRARY_COOKIE,device.token,LIBRARY_COOKIE_TTL));h.set('x-kosif-library-scope','device');return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})
}
async function libraryRequestBookId(req,u){
  let m=u.pathname.match(/^\/api\/library\/chunk\/([^/]+)\/\d+$/);if(m)return decodeURIComponent(m[1]);
  m=u.pathname.match(/^\/library\/files\/([^/]+)$/);if(m)return decodeURIComponent(m[1]);
  if(['/api/library/intel/status','/api/library/pages','/api/library/search'].includes(u.pathname))return String(u.searchParams.get('id')||'');
  if((u.pathname==='/api/library/finish'||u.pathname==='/api/library/intel')&&['POST','PUT'].includes(req.method)){try{return String((await req.clone().json())?.id||'')}catch{return''}}
  return'';
}
function isStoredLibraryRoute(req,u){return /^\/api\/library\/chunk\//.test(u.pathname)||/^\/library\/files\//.test(u.pathname)||['/api/library/finish','/api/library/intel','/api/library/intel/status','/api/library/pages','/api/library/search'].includes(u.pathname)}
async function libraryPrivacy(req,env,ctx,u,owner){
  if(u.pathname==='/api/library'&&req.method==='GET')return libraryList(req,env,ctx,owner);
  if(u.pathname==='/api/library/start'&&req.method==='POST')return libraryStart(req,env,ctx,owner);
  if(!isStoredLibraryRoute(req,u))return null;
  const id=await libraryRequestBookId(req,u);if(!id)return json({error:'id_required'},400);
  if(owner)return appWorker.fetch(req,env,ctx);
  const device=await libraryDevice(req);if(!await hasLibraryAccess(env,device.hash,id,false))return new Response('Not found',{status:404,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
  const r=await appWorker.fetch(req,env,ctx);if(!device.fresh)return r;const h=new Headers(r.headers);h.set('set-cookie',cookieHeader(LIBRARY_COOKIE,device.token,LIBRARY_COOKIE_TTL));return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})
}
function isAIPath(path){return /^\/api\/(?:kosif\/)?(?:ai|gemini|openai|anthropic|claude|zai|z-ai|zhipu|glm|council)(?:\/|$)/i.test(path)}
function trustedLibraryData(data){return new Proxy(data,{get(target,prop,receiver){if(prop==='list')return async opts=>{const r=await target.list(opts);if(String(opts?.prefix||'')!=='library:meta:')return r;const keys=[];for(const k of r.keys||[]){const id=String(k.name||'').slice('library:meta:'.length);if(id&&await trustedBook({DATA:target},id))keys.push(k)}return{...r,keys}};const v=Reflect.get(target,prop,receiver);return typeof v==='function'?v.bind(target):v}})}
function aiEnv(env){if(!env?.DATA)return env;const data=trustedLibraryData(env.DATA);return new Proxy(env,{get(target,prop,receiver){if(prop==='DATA')return data;return Reflect.get(target,prop,receiver)}})}

export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    if(u.pathname==='/__version')return json(BUILD_INFO);
    if(u.pathname==='/__health')return json({ok:true,name:'Kosif Native',version:BUILD_INFO.version,release:BUILD_INFO.release,buildId:BUILD_INFO.buildId,architecture:'security-edge → native-worker',aiGate:BUILD_INFO.aiGate,aiProviders:BUILD_INFO.aiProviders,integrity:BUILD_INFO.integrity});
    const owner=await ownerSession(req,env),blocked=await ownerGuard(req,env,u,owner);if(blocked)return blocked;
    const trust=await ownerTrustApi(req,env,u,owner);if(trust)return trust;
    const lib=await libraryPrivacy(req,env,ctx,u,owner);if(lib)return lib;
    return appWorker.fetch(req,isAIPath(u.pathname)?aiEnv(env):env,ctx);
  }
};
