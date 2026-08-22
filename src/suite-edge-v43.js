/*
 * KOSIF v43 production entrypoint.
 * Makes the complete 50,000-note requirements runtime part of every deployed Worker isolate.
 */
import suite from './suite-edge.js';
import { createFullyImplementedRequirementsRuntime } from './requirements/v43-control-implementation.mjs';
import { resolveRequirement, KOSIF_REQUIREMENTS_VERSION } from './requirements/v43-full-registry.mjs';
import { enterpriseReadiness, KOSIF_ENTERPRISE_CONTRACT_VERSION } from './enterprise-readiness-v45.mjs';

const REQUIREMENTS = createFullyImplementedRequirementsRuntime({
  buildId: '2026.08.20-v43-complete-50000',
  gitSha: 'runtime'
});
const COVERAGE = REQUIREMENTS.verifyEveryRequirement();
const STRUCTURE = REQUIREMENTS.verifyStructure();
const PRIMITIVES = REQUIREMENTS.highRiskPrimitiveCheck();
const READY = Boolean(COVERAGE.complete && STRUCTURE.complete && PRIMITIVES.ok);
const TOUCH_REVEAL_SAFETY = '<link rel="stylesheet" id="kosif-touch-reveal-safety" href="/kosif-touch-reveal-safety-v44.css?v=2">';
const VISUAL_SYSTEM_V45 = '<link rel="stylesheet" id="kosif-visual-system-v45" href="/kosif-visual-system-v45.css?v=2026.08.21-2">';
const VISUAL_SYSTEM_V45_GUARD = '<script id="kosif-visual-system-v45-guard" src="/kosif-visual-system-v45.js?v=2026.08.21-1" defer></script>';
const WORKSPACE_STABILITY = '<script id="kosif-workspace-stability-loader" src="/kosif-workspace-stability-loader-v42.js?v=2026.08.21-5" defer></script>';
const UX_RECORDER = '<script id="kosif-ux-session-recorder" src="/responsive-preview-plugin.js?v=2026.08.22-v50-manual" defer></script>';
const RECORDER_OWNER_COOKIE = 'kosif_ai_session';
const RECORDER_PREFIX = 'kosif:uxrec:pending:';
const recorderEncoder = new TextEncoder();

function reqJson(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'x-kosif-requirements-version':KOSIF_REQUIREMENTS_VERSION,
      'x-kosif-requirements-implemented':String(COVERAGE.implemented),
      'x-kosif-requirements-missing':String(COVERAGE.missing),
      'x-kosif-enterprise-contract':KOSIF_ENTERPRISE_CONTRACT_VERSION
    }
  });
}

async function recorderHash(value){
  const digest=await crypto.subtle.digest('SHA-256',recorderEncoder.encode(String(value||'')));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function recorderCookies(req){
  const out={};
  for(const part of String(req.headers.get('cookie')||'').split(';')){
    const i=part.indexOf('=');
    if(i<=0)continue;
    try{out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}catch{}
  }
  return out;
}
async function recorderOwnerSession(req,env){
  if(!env?.DATA)return null;
  const token=recorderCookies(req)[RECORDER_OWNER_COOKIE];
  if(!token)return null;
  const rec=await env.DATA.get('kosif:ai:session:'+await recorderHash(token),'json');
  return rec?.expiresAt&&Number(rec.expiresAt)>Date.now()?rec:null;
}
function safeRecorderString(value,max=300){
  return String(value??'')
    .replace(/(bearer\s+)[^\s]+/ig,'$1[redacted]')
    .replace(/(token|secret|password|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;]+/ig,'$1=[redacted]')
    .replace(/\b\d{8,}\b/g,'[number]')
    .slice(0,max);
}
function sanitizeRecorderValue(value,depth=0){
  if(depth>6)return null;
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='number')return Number.isFinite(value)?value:0;
  if(typeof value==='string')return safeRecorderString(value);
  if(Array.isArray(value))return value.slice(0,160).map(x=>sanitizeRecorderValue(x,depth+1));
  if(typeof value==='object'){
    const out={};
    for(const [key,val] of Object.entries(value).slice(0,80)){
      if(/value|text|html|content|token|secret|password|cookie|authorization|email|phone|clipboard|file(name|content)?/i.test(key))continue;
      out[safeRecorderString(key,80)]=sanitizeRecorderValue(val,depth+1);
    }
    return out;
  }
  return null;
}
function validRecorderSessionId(value){return /^[a-zA-Z0-9_-]{8,80}$/.test(String(value||''))}
async function handleRecorder(req,env,ctx,u){
  if(!u.pathname.startsWith('/api/kosif/recorder/'))return null;
  if(req.method!=='POST')return reqJson({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const owner=await recorderOwnerSession(req,env);
  if(!owner)return reqJson({ok:false,error:'OWNER_SESSION_REQUIRED'},403);
  if(!env?.DATA)return reqJson({ok:false,error:'RECORDER_STORAGE_UNAVAILABLE'},503);

  if(u.pathname==='/api/kosif/recorder/start'){
    return reqJson({ok:true,mode:'manual-owner',hidden:false,recordingStartsOnUserAction:true,storage:'cloudflare-kv-to-github-actions-artifact'},200);
  }
  if(u.pathname!=='/api/kosif/recorder/batch')return reqJson({ok:false,error:'RECORDER_ROUTE_NOT_FOUND'},404);

  const raw=await req.text();
  if(raw.length>120000)return reqJson({ok:false,error:'RECORDER_BATCH_TOO_LARGE'},413);
  let body;
  try{body=JSON.parse(raw)}catch{return reqJson({ok:false,error:'INVALID_RECORDER_JSON'},400)}
  if(!validRecorderSessionId(body?.sessionId))return reqJson({ok:false,error:'INVALID_SESSION_ID'},400);
  if(!Array.isArray(body?.events)||body.events.length<1||body.events.length>160)return reqJson({ok:false,error:'INVALID_EVENT_BATCH'},400);
  const seq=Math.max(0,Math.min(99999999,Number(body.sequence)||0));
  const day=new Date().toISOString().slice(0,10);
  const suffix=crypto.randomUUID().slice(0,8);
  const key=`${RECORDER_PREFIX}${day}:${body.sessionId}:${String(seq).padStart(8,'0')}:${suffix}`;
  const safe=sanitizeRecorderValue({
    schema:body?.schema==='kosif.uxrec.v2'?'kosif.uxrec.v2':'kosif.uxrec.v1',
    receivedAt:new Date().toISOString(),
    generatedAt:body.generatedAt,
    sessionId:body.sessionId,
    sequence:seq,
    reason:body.reason,
    page:body.page,
    events:body.events
  });
  const write=env.DATA.put(key,JSON.stringify(safe),{expirationTtl:60*60*24*14});
  if(ctx?.waitUntil)ctx.waitUntil(write);else await write;
  return reqJson({ok:true,accepted:safe.events?.length||0},202);
}

function decorateRequirements(response,url){
  const h=new Headers(response.headers);
  h.set('x-kosif-requirements-version',KOSIF_REQUIREMENTS_VERSION);
  h.set('x-kosif-requirements-implemented',String(COVERAGE.implemented));
  h.set('x-kosif-requirements-missing',String(COVERAGE.missing));
  h.set('x-kosif-requirements-ready',READY?'true':'false');
  h.set('x-kosif-enterprise-contract',KOSIF_ENTERPRISE_CONTRACT_VERSION);
  h.set('x-kosif-visual-system','v45');
  const decorated=new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
  const contentType=h.get('content-type')||'';
  if(!/text\/html/i.test(contentType))return decorated;

  // Keep the original Mafateeh reader shell intentionally isolated from suite theming.
  const preserveWealthReader=url.pathname==='/wealth'||url.pathname.startsWith('/wealth/');
  const rewriter=new HTMLRewriter();
  let inkGoldSeen=false;
  rewriter.on('#kosif-visual-system-v45',{element(el){el.remove();}});
  rewriter.on('#kosif-visual-system-v45-guard',{element(el){el.remove();}});
  rewriter.on('#kosif-ink-gold-v46',{element(el){if(inkGoldSeen)el.remove();else inkGoldSeen=true;}});
  if(!preserveWealthReader){
    rewriter.on('html',{
      element(html){html.setAttribute('data-kosif-visual-system','v45');}
    });
  }
  rewriter.on('head',{
    element(head){
      head.append(TOUCH_REVEAL_SAFETY,{html:true});
      if(!preserveWealthReader){
        head.append(VISUAL_SYSTEM_V45,{html:true});
        head.append(VISUAL_SYSTEM_V45_GUARD,{html:true});
        head.append(UX_RECORDER,{html:true});
      }
    }
  });
  // Audit workspace enhancements are layered after the existing shell instead of replacing
  // governed v41 presentation/runtime contracts. This keeps historical parity testable.
  if(url.pathname==='/audit'||url.pathname.startsWith('/audit/')){
    rewriter.on('body',{
      element(body){body.append(WORKSPACE_STABILITY,{html:true});}
    });
  }
  return rewriter.transform(decorated);
}
function isSensitiveMutation(req,url){
  return !['GET','HEAD','OPTIONS'].includes(req.method) &&
    (url.pathname.startsWith('/api/kosif/') || url.pathname.startsWith('/api/ai/'));
}
function requirementStatus(id){
  const record=resolveRequirement(id);
  return Object.freeze({
    ...record,
    runtimeImplemented:REQUIREMENTS.isRequirementImplemented(id),
    requirementsVersion:KOSIF_REQUIREMENTS_VERSION
  });
}

export default {
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    const p=u.pathname;

    // Short, shareable audit alias. Serve the governed audit shell internally instead of
    // issuing a browser redirect, so iOS/in-app browsers and stale navigation caches cannot
    // break the short URL. Query parameters are preserved and the visible URL remains /a.
    if((req.method==='GET'||req.method==='HEAD') && (p==='/a'||p==='/a/')){
      const auditUrl=new URL(u.toString());
      auditUrl.pathname='/audit/';
      const routedReq=new Request(auditUrl.toString(),req);
      const response=await suite.fetch(routedReq,env,ctx);
      const decorated=decorateRequirements(response,auditUrl);
      const headers=new Headers(decorated.headers);
      headers.set('x-kosif-short-alias','/a');
      headers.set('cache-control','no-store');
      return new Response(decorated.body,{status:decorated.status,statusText:decorated.statusText,headers});
    }

    if(p==='/__enterprise'){
      return reqJson(enterpriseReadiness(env));
    }

    if(p==='/__requirements'){
      return reqJson({
        ok:READY,
        version:KOSIF_REQUIREMENTS_VERSION,
        total:COVERAGE.total,
        implemented:COVERAGE.implemented,
        ignored:COVERAGE.ignored,
        deferred:COVERAGE.deferred,
        missing:COVERAGE.missing,
        subjects:STRUCTURE.actualSubjects,
        uniqueControlApplications:STRUCTURE.actualUniqueControlApplications,
        mechanisms:STRUCTURE.mechanismCount,
        primitives:PRIMITIVES.ok,
        complete:READY
      },READY?200:503);
    }

    const match=p.match(/^\/__requirements\/(\d{1,5})$/);
    if(match){
      const id=Number(match[1]);
      if(id<1||id>50000)return reqJson({ok:false,error:'REQUIREMENT_ID_OUT_OF_RANGE'},400);
      const status=requirementStatus(id);
      return reqJson({ok:status.runtimeImplemented,requirement:status},status.runtimeImplemented?200:503);
    }

    const recorderResponse=await handleRecorder(req,env,ctx,u);
    if(recorderResponse)return recorderResponse;

    // No sensitive mutation is allowed to execute if the 50,000-note runtime is incomplete.
    if(isSensitiveMutation(req,u) && !READY){
      return reqJson({
        ok:false,
        error:'REQUIREMENTS_BASELINE_INCOMPLETE',
        message:'تم منع العملية لأن بوابة متطلبات KOSIF الكاملة ليست في حالة 50,000/50,000.'
      },503);
    }

    const response=await suite.fetch(req,env,ctx);
    return decorateRequirements(response,u);
  }
};
