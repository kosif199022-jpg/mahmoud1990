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
 * v36-continuity is intentionally retained as a legacy UI/runtime layer, but its
 * historical EXPECTED=v36.4 check must not flag a healthy v38 suite as a mixed
 * deployment. We never hide a real mismatch: the old banner is removed only
 * after the authoritative no-store /__version endpoint proves that the complete
 * v38 root identity is live.
 */
const CURRENT={version:'v38.0.0-root',buildId:'2026.08.19-v38-trusted-audit-os'};
let identity=null,checking=null;
const falseWarning='يوجد اختلاف في مكونات الإصدار. اضغط لتحميل Kosif الحالي بالكامل.';

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
function current(info){return !!(info&&info.productName==='Kosif'&&info.version===CURRENT.version&&info.buildId===CURRENT.buildId)}
function scrub(){
  if(!current(identity))return;
  const b=document.getElementById('kosif-release-banner');
  if(b&&String(b.textContent||'').trim()===falseWarning)b.remove();
  const card=document.getElementById('kosif-build-card');
  if(card){
    const v=card.querySelector('#kosif-build-version');
    const id=card.querySelector('[data-k-build]');
    const state=card.querySelector('[data-k-release-state]');
    if(v)v.textContent=identity.version;
    if(id)id.textContent=identity.buildId;
    if(state)state.textContent='متطابق ✓';
  }
  document.documentElement.dataset.kosifBuild=identity.version;
}
async function verify(){
  if(checking)return checking;
  checking=(async()=>{
    try{
      const r=await fetch('/__version?integrity='+Date.now(),{cache:'no-store',headers:{'cache-control':'no-cache'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      identity=await r.json();
      window.KosifBuildInfo=identity;
      scrub();
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
  window.addEventListener('pageshow',verify,{passive:true});
  window.addEventListener('online',verify,{passive:true});
}
window.KosifReleaseIntegrityV38={expected:{...CURRENT},verify,current:()=>current(identity),info:()=>identity};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
