/* KOSIF UX Recorder v51 server routes.
 * Owner-session only. Stores checkpoints in Cloudflare KV and, when a server-side
 * GitHub token is configured, writes batches/screenshots/final replay immediately to GitHub.
 */

const OWNER_COOKIE='kosif_ai_session';
const PREFIX='kosif:uxrec:pending:';
const STATUS_PREFIX='kosif:uxrec:status:';
const enc=new TextEncoder();

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
async function sha256(value){
  const d=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function cookies(req){
  const out={};
  for(const part of String(req.headers.get('cookie')||'').split(';')){
    const i=part.indexOf('=');if(i<=0)continue;
    try{out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}catch{}
  }
  return out;
}
async function ownerSession(req,env){
  if(!env?.DATA)return null;
  const token=cookies(req)[OWNER_COOKIE];if(!token)return null;
  const rec=await env.DATA.get('kosif:ai:session:'+await sha256(token),'json');
  return rec?.expiresAt&&Number(rec.expiresAt)>Date.now()?rec:null;
}
function safeString(v,max=300){
  return String(v??'')
    .replace(/(bearer\s+)[^\s]+/ig,'$1[redacted]')
    .replace(/(token|secret|password|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;]+/ig,'$1=[redacted]')
    .replace(/\b\d{8,}\b/g,'[number]').slice(0,max);
}
function sanitize(v,depth=0){
  if(depth>7)return null;
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='number')return Number.isFinite(v)?v:0;
  if(typeof v==='string')return safeString(v,500);
  if(Array.isArray(v))return v.slice(0,400).map(x=>sanitize(x,depth+1));
  if(typeof v==='object'){
    const out={};
    for(const [k,val] of Object.entries(v).slice(0,160)){
      if(/^(value|text|html|content|token|secret|password|cookie|authorization|email|phone|clipboard|file(name|content)?)$/i.test(k))continue;
      out[safeString(k,90)]=sanitize(val,depth+1);
    }
    return out;
  }
  return null;
}
function validSession(v){return /^[a-zA-Z0-9_-]{8,80}$/.test(String(v||''))}
function validShot(v){return /^[a-zA-Z0-9_-]{4,100}$/.test(String(v||''))}
function githubConfig(env){
  const token=env?.GITHUB_RECORDING_TOKEN||env?.GITHUB_TOKEN||env?.GH_TOKEN||env?.GITHUB_PAT||'';
  const repo=String(env?.GITHUB_RECORDING_REPO||'kosif199022-jpg/mahmoud1990');
  const branch=String(env?.GITHUB_RECORDING_BRANCH||'main');
  const okRepo=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo);
  return {configured:Boolean(token&&okRepo),token,repo:okRepo?repo:'kosif199022-jpg/mahmoud1990',branch:/^[A-Za-z0-9._\/-]{1,120}$/.test(branch)?branch:'main'};
}
function utf8Base64(text){
  const bytes=enc.encode(String(text));let bin='';const size=0x8000;
  for(let i=0;i<bytes.length;i+=size)bin+=String.fromCharCode(...bytes.subarray(i,i+size));
  return btoa(bin);
}
function rawUrl(repo,branch,path){
  return `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch).replace(/%2F/g,'/')}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
function githubFailureCode(result){
  if(result?.ok)return null;
  if(result?.configured===false)return 'GITHUB_TOKEN_NOT_CONFIGURED';
  if(result?.status===401)return 'GITHUB_TOKEN_INVALID';
  if(result?.status===403)return 'GITHUB_PERMISSION_DENIED';
  if(result?.status===404)return 'GITHUB_REPO_OR_BRANCH_NOT_FOUND';
  if(result?.status===409)return 'GITHUB_CONFLICT';
  if(result?.status===422)return 'GITHUB_WRITE_REJECTED';
  return 'GITHUB_WRITE_FAILED';
}
async function githubCreate(env,path,base64,message){
  const cfg=githubConfig(env);
  if(!cfg.configured)return {ok:false,configured:false,code:'GITHUB_TOKEN_NOT_CONFIGURED'};
  const url=`https://api.github.com/repos/${cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  try{
    const r=await fetch(url,{method:'PUT',headers:{Authorization:`Bearer ${cfg.token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'kosif-ux-recorder-v51','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({message,content:base64,branch:cfg.branch})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const result={ok:false,configured:true,status:r.status,error:safeString(data?.message||'GitHub write failed',160)};
      return {...result,code:githubFailureCode(result)};
    }
    return {ok:true,configured:true,code:null,path,repo:cfg.repo,branch:cfg.branch,commitSha:data?.commit?.sha||'',htmlUrl:data?.content?.html_url||'',rawUrl:rawUrl(cfg.repo,cfg.branch,path)};
  }catch(err){
    return {ok:false,configured:true,code:'GITHUB_NETWORK_ERROR',error:safeString(err?.message||err,160)};
  }
}
function liveDir(sessionId){return `ux-recordings/live/${new Date().toISOString().slice(0,10)}/${sessionId}`}
async function storeKv(env,key,value,ttl=60*60*24*14){
  if(!env?.DATA)return false;await env.DATA.put(key,value,{expirationTtl:ttl});return true;
}
async function parseJson(req,maxBytes){
  const raw=await req.text();if(raw.length>maxBytes)throw Object.assign(new Error('PAYLOAD_TOO_LARGE'),{status:413});
  if(!raw.trim())return {};
  try{return JSON.parse(raw)}catch{throw Object.assign(new Error('INVALID_JSON'),{status:400})}
}
async function readStatus(env,sessionId){
  if(!env?.DATA||!validSession(sessionId))return null;
  return await env.DATA.get(STATUS_PREFIX+sessionId,'json');
}
async function patchStatus(env,sessionId,patch){
  if(!env?.DATA||!validSession(sessionId))return null;
  const prev=await readStatus(env,sessionId)||{};
  const next=sanitize({...prev,...patch,sessionId,updatedAt:new Date().toISOString()});
  await env.DATA.put(STATUS_PREFIX+sessionId,JSON.stringify(next),{expirationTtl:60*60*24*30});
  return next;
}

export async function handleUxRecorderV51(req,env,ctx,u){
  if(!u.pathname.startsWith('/api/kosif/recorder/v51/'))return null;
  if(req.method!=='POST')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const owner=await ownerSession(req,env);if(!owner)return json({ok:false,error:'OWNER_SESSION_REQUIRED'},403);
  if(!env?.DATA)return json({ok:false,error:'RECORDER_STORAGE_UNAVAILABLE'},503);

  const action=u.pathname.slice('/api/kosif/recorder/v51/'.length);
  const gh=githubConfig(env);

  if(action==='start'){
    let body={};try{body=await parseJson(req,12000)}catch(err){return json({ok:false,error:err.message},err.status||400)}
    const sessionId=validSession(body?.sessionId)?String(body.sessionId):'';
    if(sessionId){
      await patchStatus(env,sessionId,{stage:'started',startedAt:new Date().toISOString(),cloudflare:true,githubConfigured:gh.configured,githubRepo:gh.configured?gh.repo:null,githubBranch:gh.configured?gh.branch:null});
    }
    return json({ok:true,mode:'manual-owner-v51',recordingStartsOnUserAction:true,visualSnapshots:true,screenCapturePermissionRequired:true,storage:'cloudflare-kv',sessionId:sessionId||null,githubImmediate:gh.configured,githubRepo:gh.configured?gh.repo:null,githubBranch:gh.configured?gh.branch:null,githubCode:gh.configured?null:'GITHUB_TOKEN_NOT_CONFIGURED'},200);
  }

  if(action==='status'){
    let body;try{body=await parseJson(req,12000)}catch(err){return json({ok:false,error:err.message},err.status||400)}
    if(!validSession(body?.sessionId))return json({ok:false,error:'INVALID_SESSION_ID'},400);
    const status=await readStatus(env,String(body.sessionId));
    return json({ok:true,sessionId:String(body.sessionId),cloudflare:true,githubConfigured:gh.configured,githubRepo:gh.configured?gh.repo:null,githubBranch:gh.configured?gh.branch:null,status:status||null},200);
  }

  if(action==='batch'){
    let body;try{body=await parseJson(req,180000)}catch(err){return json({ok:false,error:err.message},err.status||400)}
    if(!validSession(body?.sessionId))return json({ok:false,error:'INVALID_SESSION_ID'},400);
    if(!Array.isArray(body?.events)||body.events.length<1||body.events.length>120)return json({ok:false,error:'INVALID_EVENT_BATCH'},400);
    const seq=Math.max(0,Math.min(99999999,Number(body.sequence)||0));const suffix=crypto.randomUUID().slice(0,8);const day=new Date().toISOString().slice(0,10);
    const safe=sanitize({schema:'kosif.uxrec.v3',receivedAt:new Date().toISOString(),generatedAt:body.generatedAt,sessionId:body.sessionId,sequence:seq,reason:body.reason,page:body.page,events:body.events});
    const key=`${PREFIX}${day}:${body.sessionId}:${String(seq).padStart(8,'0')}:${suffix}`;const text=JSON.stringify(safe);
    await storeKv(env,key,text);
    const path=`${liveDir(body.sessionId)}/batches/${String(seq).padStart(8,'0')}-${suffix}.json`;
    const github=await githubCreate(env,path,utf8Base64(JSON.stringify(safe,null,2)),`uxrec: checkpoint ${body.sessionId} #${seq}`);
    await patchStatus(env,String(body.sessionId),{stage:'recording',lastCheckpointAt:new Date().toISOString(),lastBatchSequence:seq,cloudflare:true,githubConfigured:gh.configured,githubLast:github,githubSaved:Boolean(github.ok)});
    return json({ok:true,accepted:safe.events?.length||0,storage:'cloudflare-kv',github,githubCode:githubFailureCode(github)},202);
  }

  if(action==='screenshot'){
    let body;try{body=await parseJson(req,1600000)}catch(err){return json({ok:false,error:err.message},err.status||400)}
    if(!validSession(body?.sessionId)||!validShot(body?.shotId))return json({ok:false,error:'INVALID_SCREENSHOT_ID'},400);
    const match=String(body?.dataUrl||'').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
    if(!match)return json({ok:false,error:'INVALID_SCREENSHOT_DATA'},400);
    const ext=match[1].toLowerCase()==='jpeg'?'jpg':match[1].toLowerCase();const b64=match[2];
    if(b64.length>1300000)return json({ok:false,error:'SCREENSHOT_TOO_LARGE'},413);
    const meta=sanitize({schema:'kosif.uxrec.screenshot.v1',receivedAt:new Date().toISOString(),sessionId:body.sessionId,shotId:body.shotId,reason:body.reason,kind:body.kind,width:body.width,height:body.height,path:body.path,view:body.view,generatedAt:body.generatedAt});
    const day=new Date().toISOString().slice(0,10);const key=`${PREFIX}${day}:${body.sessionId}:shot:${body.shotId}`;
    await storeKv(env,key,JSON.stringify({...meta,dataUrl:`data:image/${ext==='jpg'?'jpeg':ext};base64,${b64}`}),60*60*24*7);
    const path=`${liveDir(body.sessionId)}/screens/${body.shotId}.${ext}`;
    const github=await githubCreate(env,path,b64,`uxrec: screenshot ${body.sessionId} ${body.shotId}`);
    await patchStatus(env,String(body.sessionId),{stage:'recording',lastScreenshotAt:new Date().toISOString(),lastScreenshotId:String(body.shotId),cloudflare:true,githubConfigured:gh.configured,githubLast:github,githubSaved:Boolean(github.ok)});
    return json({ok:true,storage:'cloudflare-kv',shotId:body.shotId,github,githubCode:githubFailureCode(github)},202);
  }

  if(action==='final'){
    let body;try{body=await parseJson(req,900000)}catch(err){return json({ok:false,error:err.message},err.status||400)}
    if(!validSession(body?.sessionId)||!body?.replay||typeof body.replay!=='object')return json({ok:false,error:'INVALID_FINAL_REPLAY'},400);
    const safe=sanitize({...body.replay,schema:'kosif.chatgpt.ux-replay.v3',serverReceivedAt:new Date().toISOString()});
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');const day=new Date().toISOString().slice(0,10);
    const key=`${PREFIX}${day}:${body.sessionId}:final:${stamp}`;const text=JSON.stringify(safe);
    await storeKv(env,key,text,60*60*24*30);
    const path=`${liveDir(body.sessionId)}/replay-${stamp}.json`;
    const github=await githubCreate(env,path,utf8Base64(JSON.stringify(safe,null,2)),`uxrec: final replay ${body.sessionId}`);
    const status=await patchStatus(env,String(body.sessionId),{stage:'finished',finishedAt:new Date().toISOString(),finalCloudflareSaved:true,finalGithubSaved:Boolean(github.ok),githubConfigured:gh.configured,githubLast:github,githubCode:githubFailureCode(github),githubPath:github?.path||null,githubHtmlUrl:github?.htmlUrl||null});
    return json({ok:true,storage:'cloudflare-kv',cloudflareSaved:true,github,githubCode:githubFailureCode(github),status,sessionId:body.sessionId},201);
  }

  return json({ok:false,error:'RECORDER_ROUTE_NOT_FOUND'},404);
}
