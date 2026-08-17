/* Kosif v36.3 — Z.ai / GLM provider bridge + verified test workflow */
(()=>{'use strict';
if(window.KosifZAI)return;
const LS='kosif_ai_settings_v1',DEFAULT_MODEL='glm-5.1';
const $=s=>document.querySelector(s);
function readSettings(){try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch{return{}}}
function provider(){return String(readSettings().provider||'').toLowerCase()}
function isZai(v){return ['zai','z.ai','z-ai','z_ai','zhipu','glm'].includes(String(v||'').trim().toLowerCase())}
function normalizeProvider(v){v=String(v||'').trim().toLowerCase();if(v==='claude')return'anthropic';if(isZai(v))return'zai';return v}
function loadCouncilV2(){
  if(window.KosifCouncilV2||document.querySelector('script[data-kosif-council-v2="1"]'))return;
  const s=document.createElement('script');s.src='/v36-council-v2.js?v=36.3-council2';s.defer=true;s.dataset.kosifCouncilV2='1';document.head.appendChild(s);
}
function addOption(){
  const select=$('#kai-provider');if(!select)return false;
  if(!select.querySelector('option[value="zai"]')){
    const o=document.createElement('option');o.value='zai';o.textContent='Z.ai / GLM';select.appendChild(o);
  }
  const s=readSettings();
  if(isZai(s.provider)){
    select.value='zai';
    const m=$('#kai-model');if(m&&(!m.value||/^(gemini-|gpt-|claude-)/i.test(m.value)))m.value=s.model&&/^glm-/i.test(s.model)?s.model:DEFAULT_MODEL;
  }
  addNote();return true;
}
function addNote(){
  const form=$('#kosif-ai-form');if(!form||$('#kosif-zai-note'))return;
  const note=document.createElement('div');note.id='kosif-zai-note';note.className='note info';note.style.display='none';
  note.innerHTML='<span>⚡</span><span><b>Z.ai / GLM</b> يعمل عبر بوابة Kosif المحمية بنفس اختبار المفتاح. النموذج الافتراضي GLM-5.1، والمفتاح يظل في ذاكرة الجلسة فقط.</span>';
  form.appendChild(note);syncNote();
}
function syncNote(){const n=$('#kosif-zai-note'),s=$('#kai-provider');if(n)n.style.display=s&&isZai(s.value)?'flex':'none'}
function patchLabels(){
  if(!isZai(provider())&&!isZai($('#kai-provider')?.value))return;
  const t=$('#kosif-ai-status .kosif-ai-text');if(t&&/Gemini/.test(t.textContent||''))t.textContent=t.textContent.replace(/Gemini/g,'Z.ai');
  const r=$('#rounds-model');if(r&&/Gemini/.test(r.textContent||''))r.textContent=r.textContent.replace(/Gemini/g,'Z.ai');
  const stage=$('#kosif-progress .kp-note');if(stage&&/Gemini/.test(stage.textContent||''))stage.textContent=stage.textContent.replace(/Gemini/g,'Z.ai');
}
function patch(){addOption();syncNote();patchLabels();bindLabelObservers();loadCouncilV2()}
function bindFormObserver(){
  const form=$('#kosif-ai-form');if(!form)return false;
  if(form.dataset.zaiObserved==='1')return true;
  form.dataset.zaiObserved='1';
  new MutationObserver(()=>queueMicrotask(patch)).observe(form,{childList:true,subtree:true});
  return true;
}
function bindLabelObservers(){
  let bound=false;
  for(const el of [$('#kosif-ai-status'),$('#rounds-model')]){
    if(!el||el.dataset.zaiLabelObserved==='1')continue;
    el.dataset.zaiLabelObserved='1';bound=true;
    new MutationObserver(()=>queueMicrotask(patchLabels)).observe(el,{childList:true,subtree:true,characterData:true});
  }
  return bound;
}
async function testMainProvider(btn){
  if(!window.KosifAIGate?.isUnlocked?.()){
    window.KosifAIGate?.open?.();return;
  }
  const p=normalizeProvider($('#kai-provider')?.value),model=String($('#kai-model')?.value||'').trim(),key=String($('#kai-key')?.value||'').trim();
  if(!p||!model||!key){if(window.toast)window.toast('أدخل المزود والنموذج ومفتاح API أولًا','warn');else alert('أدخل المزود والنموذج ومفتاح API أولًا');return}
  const original=btn.textContent;btn.disabled=true;btn.textContent='جاري الاختبار…';
  try{
    const r=await fetch('/api/kosif/ai/test',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({provider:p,model,key,agent:{jurisdiction:$('#kai-jur')?.value||'saudi',industry:$('#kai-industry')?.value||'عام'}})}),d=await r.json();
    if(!r.ok)throw Error(d.message||d.error||'فشل اختبار الاتصال');
    await window.KosifAIGate?.refresh?.();
    btn.textContent='متصل ✓';patchLabels();
    if(window.toast)window.toast('نجح اختبار '+(p==='zai'?'Z.ai':p)+' — اضغط حفظ لاستخدام المفتاح في الجلسة.','ok');else alert('نجح اختبار الاتصال. اضغط حفظ لاستخدام المفتاح في الجلسة.');
    setTimeout(()=>{if(btn.isConnected){btn.disabled=false;btn.textContent=original}},1400);
    return;
  }catch(e){
    if(window.toast)window.toast(e.message||'فشل اختبار الاتصال','danger');else alert(e.message||'فشل اختبار الاتصال');
  }
  btn.disabled=false;btn.textContent=original;
}
document.addEventListener('change',e=>{
  if(e.target?.id!=='kai-provider')return;
  if(isZai(e.target.value)){
    const m=$('#kai-model');if(m)m.value=DEFAULT_MODEL;
  }
  syncNote();setTimeout(patchLabels,0);
},false);
document.addEventListener('click',e=>{
  const test=e.target.closest?.('#kai-test');
  if(test){e.preventDefault();e.stopImmediatePropagation();testMainProvider(test);return}
  if(e.target.closest?.('#kosif-ai-open,#kosif-ai-status'))setTimeout(()=>{bindFormObserver();patch()},30);
},true);
window.addEventListener('kosif-ai-gate-change',()=>setTimeout(patchLabels,0));
window.addEventListener('storage',e=>{if(e.key===LS)setTimeout(patch,0)});
let tries=0,t=setInterval(()=>{patch();if((bindFormObserver()||bindLabelObservers())&&++tries>12)clearInterval(t);else if(++tries>80)clearInterval(t)},250);
window.KosifZAI={version:'1.3.0',provider:'zai',defaultModel:DEFAULT_MODEL,endpointMode:'general-api',refresh:patch,isZaiProvider:isZai,testProvider:testMainProvider,loadCouncilV2};
document.documentElement.dataset.kosifZai='ready';
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch,{once:true});else patch();
})();
