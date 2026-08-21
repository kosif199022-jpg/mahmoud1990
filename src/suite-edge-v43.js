/*
 * KOSIF v43 production entrypoint.
 * Makes the complete 50,000-note requirements runtime part of every deployed Worker isolate.
 */
import suite from './suite-edge.js';
import { createFullyImplementedRequirementsRuntime } from './requirements/v43-control-implementation.mjs';
import { resolveRequirement, KOSIF_REQUIREMENTS_VERSION } from './requirements/v43-full-registry.mjs';

const REQUIREMENTS = createFullyImplementedRequirementsRuntime({
  buildId: '2026.08.20-v43-complete-50000',
  gitSha: 'runtime'
});
const COVERAGE = REQUIREMENTS.verifyEveryRequirement();
const STRUCTURE = REQUIREMENTS.verifyStructure();
const PRIMITIVES = REQUIREMENTS.highRiskPrimitiveCheck();
const READY = Boolean(COVERAGE.complete && STRUCTURE.complete && PRIMITIVES.ok);
const TOUCH_REVEAL_SAFETY = '<link rel="stylesheet" id="kosif-touch-reveal-safety" href="/kosif-touch-reveal-safety-v44.css?v=1">';
const WORKSPACE_STABILITY = '<script id="kosif-workspace-stability-loader" src="/kosif-workspace-stability-loader-v42.js?v=2026.08.21-4" defer></script>';

function reqJson(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'x-kosif-requirements-version':KOSIF_REQUIREMENTS_VERSION,
      'x-kosif-requirements-implemented':String(COVERAGE.implemented),
      'x-kosif-requirements-missing':String(COVERAGE.missing)
    }
  });
}
function decorateRequirements(response,url){
  const h=new Headers(response.headers);
  h.set('x-kosif-requirements-version',KOSIF_REQUIREMENTS_VERSION);
  h.set('x-kosif-requirements-implemented',String(COVERAGE.implemented));
  h.set('x-kosif-requirements-missing',String(COVERAGE.missing));
  h.set('x-kosif-requirements-ready',READY?'true':'false');
  const decorated=new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
  const contentType=h.get('content-type')||'';
  if(!/text\/html/i.test(contentType))return decorated;

  const rewriter=new HTMLRewriter().on('head',{
    element(head){head.append(TOUCH_REVEAL_SAFETY,{html:true});}
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

    // Short, shareable audit alias. Keep query parameters (for example cache-bust/debug flags)
    // while redirecting only safe read methods to the canonical governed audit route.
    if((req.method==='GET'||req.method==='HEAD') && (p==='/a'||p==='/a/')){
      u.pathname='/audit/';
      return Response.redirect(u.toString(),302);
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