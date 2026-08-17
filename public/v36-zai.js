/* Kosif v36.3 — Z.ai / GLM provider bridge */
(()=>{'use strict';
if(window.KosifZAI)return;
const LS='kosif_ai_settings_v1',DEFAULT_MODEL='glm-5.1';
const $=s=>document.querySelector(s);
function readSettings(){try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch{return{}}}
function provider(){return String(readSettings().provider||'').toLowerCase()}
function isZai(v){return ['zai','z.ai','z-ai','z_ai','zhipu','glm'].includes(String(v||'').trim().toLowerCase())}
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
  if(!isZai(provider()))return;
  const t=$('#kosif-ai-status .kosif-ai-text');if(t&&/Gemini/.test(t.textContent||''))t.textContent=t.textContent.replace(/Gemini/g,'Z.ai');
  const r=$('#rounds-model');if(r&&/Gemini/.test(r.textContent||''))r.textContent=r.textContent.replace(/Gemini/g,'Z.ai');
  const stage=$('#kosif-progress .kp-note');if(stage&&/Gemini/.test(stage.textContent||''))stage.textContent=stage.textContent.replace(/Gemini/g,'Z.ai');
}
function patch(){addOption();syncNote();patchLabels()}
function bindFormObserver(){
  const form=$('#kosif-ai-form');if(!form)return false;
  if(form.dataset.zaiObserved==='1')return true;
  form.dataset.zaiObserved='1';
  new MutationObserver(()=>queueMicrotask(patch)).observe(form,{childList:true,subtree:true});
  return true;
}
document.addEventListener('change',e=>{
  if(e.target?.id!=='kai-provider')return;
  if(isZai(e.target.value)){
    const m=$('#kai-model');if(m)m.value=DEFAULT_MODEL;
  }
  syncNote();setTimeout(patchLabels,0);
},false);
document.addEventListener('click',e=>{
  if(e.target.closest?.('#kosif-ai-open,#kosif-ai-status'))setTimeout(()=>{bindFormObserver();patch()},30);
},true);
window.addEventListener('kosif-ai-gate-change',()=>setTimeout(patchLabels,0));
window.addEventListener('storage',e=>{if(e.key===LS)setTimeout(patch,0)});
let tries=0,t=setInterval(()=>{patch();if(bindFormObserver()||++tries>80)clearInterval(t)},250);
window.KosifZAI={version:'1.0.0',provider:'zai',defaultModel:DEFAULT_MODEL,endpointMode:'general-api',refresh:patch,isZaiProvider:isZai};
document.documentElement.dataset.kosifZai='ready';
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch,{once:true});else patch();
})();
