import appWorker from './worker.js';

const OWNER_COOKIE='kosif_ai_session';
const EXPORT_PREFIX='/6ff6b51050ba881059c63e74/';
const LEGACY_SHARED_PATHS=new Set([
  '/api/state',
  '/api/notes',
  '/api/files',
  '/api/office/files',
  '/api/office/upload',
  '/api/companies',
  '/api/source-refresh'
]);

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function cookies(req){const out={};for(const p of String(req.headers.get('cookie')||'').split(';')){const i=p.indexOf('=');if(i>0){try{out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}catch{out[p.slice(0,i).trim()]=p.slice(i+1).trim()}}}return out}
async function sha256(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function ownerSession(req,env){
  if(!env?.DATA)return null;
  const token=cookies(req)[OWNER_COOKIE];if(!token)return null;
  const key='kosif:ai:session:'+await sha256(token);
  const rec=await env.DATA.get(key,'json');
  if(!rec?.expiresAt||Number(rec.expiresAt)<=Date.now()){if(rec)await env.DATA.delete(key).catch(()=>{});return null}
  return rec;
}
function isLegacySharedPath(path){return LEGACY_SHARED_PATHS.has(path)||path.startsWith('/files/')||path.startsWith('/office/files/')}
function needsOwner(req,u){
  if(u.pathname.startsWith(EXPORT_PREFIX))return true;
  if(isLegacySharedPath(u.pathname))return true;
  return false;
}
async function ownerGuard(req,env,u){
  if(!needsOwner(req,u))return null;
  const s=await ownerSession(req,env);if(s)return null;
  return json({error:'OWNER_AUTH_REQUIRED',locked:true,message:'هذا المسار يقرأ أو يعدّل تخزينًا مشتركًا قديمًا أو يصدّر مصدر التطبيق، ولذلك يتطلب جلسة المالك. الواجهة العامة وبيانات الشركات الحديثة تظل متاحة دون هذا القفل.'},401);
}

export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url),blocked=await ownerGuard(req,env,u);
    if(blocked)return blocked;
    return appWorker.fetch(req,env,ctx);
  }
};
