(()=>{'use strict';
/* Preserve the one-time v35 storage migration. */
try{
  const done='kosif_v35_storage_migrated';
  if(localStorage.getItem(done)!=='1'){
    const old=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&/^tamhees_/i.test(k))old.push(k);
    }
    for(const k of old){
      const nk=k.replace(/^tamhees_/i,'kosif_');
      if(localStorage.getItem(nk)==null){
        const v=localStorage.getItem(k);
        if(v!=null)localStorage.setItem(nk,v);
      }
    }
    localStorage.setItem(done,'1');
  }
}catch(_){/* Storage may be unavailable in private/restricted mode. */}

/*
 * v38 release-integrity bridge.
 * v36-continuity remains a compatibility/runtime layer and still carries its
 * historical v36.4 identity. The root suite identity is authoritative once it
 * matches the v38 browser bootstrap actually loaded in this page.
 */
const FALLBACK={version:'v38.0.0-root',buildId:'2026.08.19-v38-trusted-audit-os'};
let identity=null,checking=null;

function installMobileSafeArea(){
  if(document.getElementById('kosif-v38-ios-bottom-safe'))return;
  const s=document.createElement('style');
  s.id='kosif-v38-ios-bottom-safe';
  s.textContent=`@media(max-width:720px){
    main{padding-bottom:calc(158px + env(safe-area-inset-bottom,0px))!important;scroll-padding-bottom:calc(158px + env(safe-area-inset-bottom,0px))!important}
    #kosif-bottom-nav{bottom:calc(8px + env(safe-area-inset-bottom,0px))!important}
    .toast-wrap,#kosif-v38-toasts{bottom:calc(104px + env(safe-area-inset-bottom,0px))!important}
  }
  html[data-kosif-keyboard="open"] main{padding-bottom:24px!important}`;
  document.head.appendChild(s);
}
function browserBuild(){return String(window.KosifV38?.buildId||'').trim()}
function current(info){
  if(!info||info.productName!=='Kosif')return false;
  const loaded=browserBuild();
  if(loaded)return String(info.buildId||'')===loaded;
  return info.version===FALLBACK.version&&info.buildId===FALLBACK.buildId;
}
function scrub(){
  if(!current(identity))return;
  /* Any legacy release banner is stale once the authoritative root identity
     matches the v38 bootstrap loaded in this very page. */
  document.getElementById('kosif-release-banner')?.remove();
  const card=document.getElementById('kosif-build-card');
  if(card){
    const v=card.querySelector('#kosif-build-version');
    const id=card.querySelector('[data-k-build]');
    const state=card.querySelector('[data-k-release-state]');
    if(v)v.textContent=identity.version||'Kosif';
    if(id)id.textContent=identity.buildId||'—';
    if(state)state.textContent='متطابق ✓';
  }
  document.documentElement.dataset.kosifBuild=identity.version||'current';
  document.documentElement.dataset.kosifReleaseIntegrity='ok';
}
async function verify(){
  if(checking)return checking;
  checking=(async()=>{
    try{
      const r=await fetch('/__version?integrity='+Date.now(),{cache:'no-store',headers:{'cache-control':'no-cache','pragma':'no-cache'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      identity=await r.json();
      window.KosifBuildInfo=identity;
      scrub();
      /* v38 modules are deferred and may finish just after this bridge. Recheck
         once the browser build id is definitely available. */
      if(!browserBuild())setTimeout(scrub,350);
      return identity;
    }catch(_){return null}
    finally{checking=null}
  })();
  return checking;
}
function watch(){
  installMobileSafeArea();
  const root=document.documentElement;
  new MutationObserver(()=>scrub()).observe(root,{childList:true,subtree:true,characterData:true});
  verify();
  setTimeout(()=>{verify().then(scrub)},700);
  window.addEventListener('pageshow',()=>verify().then(scrub),{passive:true});
  window.addEventListener('online',()=>verify().then(scrub),{passive:true});
}
window.KosifReleaseIntegrityV38={expected:{...FALLBACK},verify,current:()=>current(identity),info:()=>identity};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
