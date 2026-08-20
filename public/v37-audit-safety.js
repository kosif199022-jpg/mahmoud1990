/* v37 behavioral safety bridge for the legacy audit workspace.
 * Fixes two confirmed v36 bugs while the UI is migrated onto src/engine/kosif.engine.mjs:
 * 1) amount >= materiality-object was always false;
 * 2) materiality log stored the whole object and rendered it as zero.
 */
(()=>{'use strict';
const q=s=>document.querySelector(s),num=v=>Number(String(v??0).replace(/[،,\s]/g,''))||0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(num(v));
function materiality(){try{const m=computeMateriality(state?.tb?.accounts||[],state?.mat?.basis,state?.mat?.pct);return{overall:num(m?.value??m),performance:num(m?.performance??m?.value??m)}}catch{return{overall:0,performance:0}}}
function repairLog(){try{const log=state?.v36?.materialityLog;if(!Array.isArray(log))return;let changed=false;for(const x of log){if(x&&x.value&&typeof x.value==='object'){x.value=num(x.value.value??x.value.performance);changed=true}}if(changed&&typeof save==='function')save()}catch(_){}}
function appendLog(){try{if(!state?.v36)return;repairLog();const m=materiality(),log=state.v36.materialityLog||(state.v36.materialityLog=[]),last=log.at(-1);if(!last||last.basis!==state.mat.basis||+last.pct!==+state.mat.pct||Math.abs(num(last.value)-m.overall)>.5){log.push({at:new Date().toISOString(),basis:state.mat.basis,pct:state.mat.pct,value:m.overall,performance:m.performance});if(typeof save==='function')save()}}catch(_){}}
function analyze(){const js=state?.v36?.journals||[],flags=[],pm=materiality().performance,seen=new Map();for(const j of js){const amount=Math.max(num(j.debit),num(j.credit)),d=new Date(j.date),reasons=[];if(amount&&amount%10000===0)reasons.push('رقم دائري');if(pm>0&&amount>=pm)reasons.push('يتجاوز أهمية الأداء');if(!Number.isNaN(d.getTime())&&(d.getDay()===5||d.getDay()===6))reasons.push('قيد عطلة أسبوعية');if(/تسوية|يدوي|manual|إقفال|closing/i.test(j.desc||''))reasons.push('وصف حساس/يدوي');const key=[j.date,j.account,j.debit,j.credit,j.desc].join('|');if(seen.has(key))reasons.push('قيد مكرر');seen.set(key,1);if(reasons.length)flags.push({...j,amount,reasons})}return flags.sort((a,b)=>b.amount-a.amount)}
function render(){const w=q('#v36-je-out'),j=state?.v36?.journals||[],f=state?.v36?.journalFlags||[];if(!w||!j.length)return;w.innerHTML=`<div class="note info"><span>J</span><span>${j.length} سطر قيد · ${f.length} استثناء موجّه للاختبار. عتبة المبلغ = أهمية الأداء، والاستثناء لا يثبت تحريفًا.</span></div><div class="twrap"><table class="data"><thead><tr><th>التاريخ</th><th>القيد</th><th>الحساب</th><th>المبلغ</th><th>أسباب الاختيار</th></tr></thead><tbody>${f.slice(0,150).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.id)}</td><td>${esc(x.account)}</td><td>${fmt(x.amount)}</td><td>${esc(x.reasons.join('، '))}</td></tr>`).join('')}</tbody></table></div>`}
function bind(){repairLog();const run=q('#v36-je-run');if(run&&!run.dataset.v37Safety){run.dataset.v37Safety='1';run.addEventListener('click',()=>setTimeout(()=>{try{state.v36.journalFlags=analyze();if(typeof save==='function')save();render()}catch(e){console.error('v37 journal safety',e)}},0))}const se=q('#btn-save-entity');if(se&&!se.dataset.v37Mat){se.dataset.v37Mat='1';se.addEventListener('click',()=>setTimeout(appendLog,0))}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();

/* v38 core / v40 Studio release-integrity reconciliation. */
(()=>{'use strict';
const LEGACY='يوجد اختلاف في مكونات الإصدار. اضغط لتحميل Kosif الحالي بالكامل.';
let ok=false,info=null,observer=null,interval=0;
const setText=(el,value)=>{if(el&&el.textContent!==String(value))el.textContent=String(value)};
function scrub(){
  if(!ok)return;
  const b=document.getElementById('kosif-release-banner');
  if(b&&String(b.textContent||'').trim()===LEGACY)b.remove();
  const card=document.getElementById('kosif-build-card');
  if(card&&info){
    setText(card.querySelector('#kosif-build-version'),info.version||'Kosif');
    setText(card.querySelector('[data-k-build]'),info.buildId||'—');
    setText(card.querySelector('[data-k-release-state]'),'متطابق ✓');
  }
}
function releaseBoot(){
  const boot=document.getElementById('kosif-boot');
  if(!boot||boot.classList.contains('error')||boot.classList.contains('done'))return;
  document.body?.classList.add('kosif-ready');
  boot.classList.add('done');
  setTimeout(()=>boot.remove(),650);
}
async function verify(){
  try{
    const r=await fetch('/__version?auditIntegrity='+Date.now(),{cache:'no-store',headers:{'cache-control':'no-cache','pragma':'no-cache'}});
    if(!r.ok)return false;
    const x=await r.json(),loaded=String(window.KosifV38?.buildId||'').trim();
    const v38=x?.productName==='Kosif'&&/^v38\./.test(String(x?.version||''));
    const studio=x?.productName==='Kosif'&&x?.version==='v40.0.0-root'&&x?.buildId==='2026.08.20-v40-vibrant-professional-pwa'&&x?.experienceVersion==='v40.0.0'&&x?.installable===true;
    const same=!loaded||loaded===String(x?.buildId||'');
    const embeddedCore=!loaded||loaded==='2026.08.19-v38-trusted-audit-os';
    ok=!!((v38&&same)||(studio&&embeddedCore));info=x;
    if(ok){
      window.KosifBuildInfo=x;
      if(document.documentElement.dataset.kosifReleaseIntegrity!=='ok')document.documentElement.dataset.kosifReleaseIntegrity='ok';
      scrub();
    }
    return ok;
  }catch(_){return false}
}
function start(){
  if(observer)return;
  observer=new MutationObserver(scrub);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  verify();
  interval=setInterval(()=>verify().then(scrub),1200);
  setTimeout(()=>{if(interval){clearInterval(interval);interval=0}},10000);
  setTimeout(releaseBoot,2200);
  window.addEventListener('pageshow',()=>{verify().then(scrub);setTimeout(releaseBoot,700)},{passive:true});
  window.addEventListener('online',()=>verify().then(scrub),{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
