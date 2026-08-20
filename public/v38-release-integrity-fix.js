(()=>{'use strict';
const OLD_TEXT='يوجد اختلاف في مكونات الإصدار. اضغط لتحميل Kosif الحالي بالكامل.';
let verified=false,observer=null,timer=0;
const setText=(el,value)=>{if(el&&el.textContent!==String(value))el.textContent=String(value)};
function removeLegacyBanner(){
  if(!verified)return;
  const b=document.getElementById('kosif-release-banner');
  if(b&&String(b.textContent||'').trim()===OLD_TEXT)b.remove();
  const card=document.getElementById('kosif-build-card');
  const info=window.KosifBuildInfo;
  if(card&&info){
    setText(card.querySelector('#kosif-build-version'),info.version||'Kosif');
    setText(card.querySelector('[data-k-build]'),info.buildId||'—');
    setText(card.querySelector('[data-k-release-state]'),'متطابق ✓');
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
    const studio=x?.productName==='Kosif'&&x?.version==='v40.0.0-root'&&x?.buildId==='2026.08.20-v40-vibrant-professional-pwa'&&x?.experienceVersion==='v40.0.0'&&x?.installable===true;
    const sameBuild=!loaded||String(x?.buildId||'')===loaded;
    const embeddedCore=!loaded||loaded==='2026.08.19-v38-trusted-audit-os';
    verified=!!((isV38&&sameBuild)||(studio&&embeddedCore));
    if(verified){
      window.KosifBuildInfo=x;
      if(document.documentElement.dataset.kosifReleaseIntegrity!=='ok')document.documentElement.dataset.kosifReleaseIntegrity='ok';
      removeLegacyBanner();
    }
    return verified;
  }catch(_){return false}
}
function releaseBoot(){
  const boot=document.getElementById('kosif-boot');
  if(!boot||boot.classList.contains('error')||boot.classList.contains('done'))return;
  document.body?.classList.add('kosif-ready');
  boot.classList.add('done');
  setTimeout(()=>boot.remove(),650);
}
function start(){
  if(observer)return;
  observer=new MutationObserver(removeLegacyBanner);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  verify();
  timer=setInterval(()=>verify().then(removeLegacyBanner),1500);
  setTimeout(()=>{if(timer){clearInterval(timer);timer=0}},12000);
  setTimeout(releaseBoot,2500);
  window.addEventListener('pageshow',()=>{verify().then(removeLegacyBanner);setTimeout(releaseBoot,800)},{passive:true});
  window.addEventListener('online',()=>verify().then(removeLegacyBanner),{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
