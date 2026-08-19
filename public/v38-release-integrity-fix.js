(()=>{'use strict';
const OLD_TEXT='يوجد اختلاف في مكونات الإصدار. اضغط لتحميل Kosif الحالي بالكامل.';
let verified=false,observer=null,timer=0;
function removeLegacyBanner(){
  if(!verified)return;
  const b=document.getElementById('kosif-release-banner');
  if(b&&String(b.textContent||'').trim()===OLD_TEXT)b.remove();
  const card=document.getElementById('kosif-build-card');
  const info=window.KosifBuildInfo;
  if(card&&info){
    const v=card.querySelector('#kosif-build-version');
    const id=card.querySelector('[data-k-build]');
    const state=card.querySelector('[data-k-release-state]');
    if(v)v.textContent=info.version||'Kosif';
    if(id)id.textContent=info.buildId||'—';
    if(state)state.textContent='متطابق ✓';
  }
}
function browserBuild(){return String(window.KosifV38?.buildId||'').trim()}
async function verify(){
  try{
    const r=await fetch('/__version?v38fix='+Date.now(),{cache:'no-store',headers:{'cache-control':'no-cache','pragma':'no-cache'}});
    if(!r.ok)return false;
    const x=await r.json();
    const loaded=browserBuild();
    const isV38=String(x?.version||'').startsWith('v38.')&&x?.productName==='Kosif';
    const sameBuild=!loaded||String(x?.buildId||'')===loaded;
    verified=!!(isV38&&sameBuild);
    if(verified){window.KosifBuildInfo=x;document.documentElement.dataset.kosifReleaseIntegrity='ok';removeLegacyBanner()}
    return verified;
  }catch(_){return false}
}
function start(){
  if(observer)return;
  observer=new MutationObserver(removeLegacyBanner);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  verify();
  timer=setInterval(()=>{verify().then(removeLegacyBanner)},1500);
  setTimeout(()=>{if(timer){clearInterval(timer);timer=0}},15000);
  window.addEventListener('pageshow',()=>verify().then(removeLegacyBanner),{passive:true});
  window.addEventListener('online',()=>verify().then(removeLegacyBanner),{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
