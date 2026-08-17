/* Kosif v36.3 — build identity, state continuity and accessibility runtime */
(()=>{'use strict';
const EXPECTED='v36.3',BUILD='2026.08.17-v36.3-master-requirements';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let versionInfo=null,lastFocus=null;
/* mountWatcher() observes `main` for childList and its callback writes into elements
 * inside `main`. Assigning textContent replaces the element's child text node, which is
 * itself a childList mutation, so every pass re-triggered the observer and the watcher
 * re-rendered at frame rate forever — measured at ~21,000 DOM mutations per second, in a
 * completely idle tab, permanently. Writing only on an actual change makes each pass a
 * no-op once the DOM has settled, so the loop terminates after one frame. */
function setText(el,v){if(!el)return false;const n=String(v==null?'':v);if(el.textContent===n)return false;el.textContent=n;return true}
function setAttr(el,k,v){if(!el)return false;const n=String(v);if(el.getAttribute(k)===n)return false;el.setAttribute(k,n);return true}
function setProp(el,k,v){if(!el)return false;const n=String(v);if(String(el[k])===n)return false;el[k]=n;return true}
function announce(t){const x=$('#kosif-live-region');if(x)x.textContent=String(t||'')}  /* announcements must re-fire even when identical, so this one is deliberately not guarded */
function shell(){
 if(!$('#kosif-skip'))document.body.insertAdjacentHTML('afterbegin','<a id="kosif-skip" href="#kosif-main-anchor">تخطي إلى المحتوى</a><div id="kosif-live-region" aria-live="polite" aria-atomic="true"></div>');
 const main=$('main');if(main&&!$('#kosif-main-anchor')){main.id=main.id||'kosif-main-anchor';main.tabIndex=-1}
 ['#kosif-more','#kosif-company-sheet','#kosif-ai-sheet','#kosif-command-sheet','#kosif-font-sheet','#kosif-ai-gate'].forEach(sel=>{const el=$(sel);if(!el)return;setAttr(el,'role','dialog');setAttr(el,'aria-modal','true');setAttr(el,'aria-hidden',el.classList.contains('show')?'false':'true')});
}
function dialogOpen(el){if(!el)return;lastFocus=document.activeElement;el.setAttribute('aria-hidden','false');document.body.dataset.kosifDialogOpen='1';setTimeout(()=>el.querySelector('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')?.focus(),30)}
function dialogClose(el){if(!el)return;el.classList.remove('show');el.setAttribute('aria-hidden','true');delete document.body.dataset.kosifDialogOpen;try{lastFocus?.focus?.()}catch(_){}lastFocus=null}
function dialogGuards(){
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const el=['#kosif-ai-gate','#kosif-font-sheet','#kosif-command-sheet','#kosif-ai-sheet','#kosif-company-sheet','#kosif-more'].map($).find(x=>x?.classList.contains('show'));if(el){e.preventDefault();dialogClose(el)}},true);
 document.addEventListener('click',e=>{const b=e.target.closest('#kosif-more-btn,#kosif-ai-status,#kosif-font-open,#kosif-command,#kosif-ai-open');if(!b)return;setTimeout(()=>{const el=['#kosif-more','#kosif-ai-sheet','#kosif-font-sheet','#kosif-command-sheet'].map($).find(x=>x?.classList.contains('show'));if(el)dialogOpen(el)},0)},true);
}
function ensureFont200(){const r=$('#kf-range');if(r){setProp(r,'max','200');setProp(r,'min','90');setProp(r,'step','5')}setText($('#kosif-font-sheet .kf-help'),'تكبير آمن للقراءة من 90% إلى 200% مع ثبات الأيقونات والتنقل.');setText($('#kosif-more #kosif-font-open small'),'90% إلى 200% بدون كسر التخطيط')}
function selectedAI(){let p=$('#kai-provider')?.value||'gemini',m=$('#kai-model')?.value||'';p=p==='claude'?'anthropic':p;return{provider:p,model:String(m||'').trim()}}
function syncAI(){
 const pill=$('#kosif-ai-status');if(!pill)return;const unlocked=document.documentElement.dataset.kosifAiUnlocked==='1';const {provider,model}=selectedAI(),verified=window.KosifAIGate?.verified?.()||{},v=verified[provider],connected=!!(unlocked&&v&&(!model||String(v.model||'')===model));
 pill.dataset.state=connected?'connected':unlocked?'unverified':'locked';pill.classList.toggle('on',connected);pill.classList.toggle('off',!connected);pill.classList.toggle('pending',unlocked&&!connected);setText(pill.querySelector('.kosif-ai-text'),connected?'AI متصل · '+(provider==='openai'?'OpenAI':provider==='anthropic'?'Claude':'Gemini'):unlocked?'AI مفتوح · يحتاج اختبار':'🔐 AI مقفول');
 const rm=$('#rounds-model');if(rm&&!connected)setText(rm,unlocked?'AI مفتوح · غير مختبر':'AI مقفول');
}
function aiGuards(){window.addEventListener('kosif-ai-gate-change',()=>setTimeout(syncAI,0));document.addEventListener('input',e=>{if(e.target.matches?.('#kai-provider,#kai-model,#kai-key,#c-model-gemini,#c-model-openai,#c-model-anthropic'))setTimeout(syncAI,0)},true);document.addEventListener('change',e=>{if(e.target.matches?.('#kai-provider,#kai-model'))setTimeout(syncAI,0)},true);setTimeout(syncAI,250)}
function companyName(){const x=$('#pill-entity');const t=(x?.textContent||'').replace(/\s+/g,' ').trim();if(t&&!/اختر|غير محدد|لم تُحد/i.test(t)){localStorage.setItem('kosif_active_company_label_v36_3',t);return t}return localStorage.getItem('kosif_active_company_label_v36_3')||''}
function syncCompany(){const n=companyName();document.documentElement.dataset.kosifCompanyState=n||'none';$$('[data-kosif-active-company]').forEach(x=>{if(x!==document.documentElement)setText(x,n||'لم تُحدد شركة')});return n}
function companyGuard(){const pill=$('#pill-entity');if(pill)new MutationObserver(()=>syncCompany()).observe(pill,{childList:true,subtree:true,characterData:true});syncCompany();if(typeof window.go==='function'&&!window.go.__k363){const old=window.go;const wrapped=function(...a){const r=old.apply(this,a);queueMicrotask(()=>{syncCompany();syncAI();window.dispatchEvent(new CustomEvent('kosif-view-change',{detail:{view:a[0]}}))});return r};wrapped.__k363=true;window.go=wrapped}}
function buildCard(){const host=$('#view-about');if(!host||$('#kosif-build-card'))return;host.insertAdjacentHTML('afterbegin',`<div class="card" id="kosif-build-card"><div class="card-h"><h2>هوية إصدار Kosif</h2><span class="spacer"></span><span class="badge info" id="kosif-build-version">${EXPECTED}</span></div><div class="grid g3"><div class="kpi"><div class="l">Build ID</div><div class="v" style="font-size:1rem"><code data-k-build>جاري التحقق…</code></div></div><div class="kpi"><div class="l">الشركة النشطة</div><div class="v" style="font-size:1rem" data-kosif-active-company>—</div></div><div class="kpi"><div class="l">حالة الإصدار</div><div class="v" style="font-size:1rem" data-k-release-state>جارٍ التحقق</div></div></div><div class="note info" style="margin-top:12px"><span>i</span><span>هذه البطاقة تقارن واجهة المتصفح مع Worker والكاش. إذا ظهر اختلاف، يعرض Kosif تنبيه تحديث بدل تشغيل خليط إصدارات بصمت.</span></div></div>`);syncCompany();renderVersion()}
function renderVersion(){if(!versionInfo)return;const b=$('[data-k-build]'),s=$('[data-k-release-state]'),v=$('#kosif-build-version');setText(b,versionInfo.buildId||versionInfo.version||'—');setText(v,versionInfo.version||EXPECTED);setText(s,versionInfo.version===EXPECTED?'متطابق ✓':'غير متطابق');}
function banner(msg){let x=$('#kosif-release-banner');if(!x){x=document.createElement('button');x.id='kosif-release-banner';x.type='button';x.title='اضغط لإعادة تحميل النسخة الحالية';x.onclick=()=>location.reload();document.body.appendChild(x)}x.textContent=msg}
async function checkVersion(){try{const r=await fetch('/__version?cb='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);versionInfo=await r.json();window.KosifBuildInfo=versionInfo;document.documentElement.dataset.kosifBuild=versionInfo.version||'unknown';renderVersion();if(versionInfo.version!==EXPECTED||versionInfo.buildId!==BUILD)banner('يوجد اختلاف في مكونات الإصدار. اضغط لتحميل Kosif الحالي بالكامل.');else $('#kosif-release-banner')?.remove();return versionInfo}catch(e){banner('تعذر التحقق من هوية الإصدار. اضغط لإعادة المحاولة.');return null}}
function serviceWorkerContinuity(){if(!('serviceWorker'in navigator))return;if(['localhost','127.0.0.1','::1'].includes(location.hostname))return;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('kosif_sw_reload_v36_3'))return;sessionStorage.setItem('kosif_sw_reload_v36_3','1');location.reload()});navigator.serviceWorker.getRegistration().then(r=>r?.update?.()).catch(()=>{})}
function mountWatcher(){const main=$('main');if(!main)return;let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;shell();ensureFont200();buildCard();syncCompany();syncAI()})}).observe(main,{childList:true,subtree:true})}
function init(){shell();dialogGuards();aiGuards();companyGuard();ensureFont200();buildCard();mountWatcher();serviceWorkerContinuity();checkVersion();window.addEventListener('online',()=>{announce('عاد الاتصال');checkVersion()});window.addEventListener('offline',()=>announce('لا يوجد اتصال. سيستخدم Kosif الموارد المتاحة دون تخزين API.'))}
window.KosifContinuity={version:'36.3',buildId:BUILD,checkVersion,syncAI,syncCompany,companyName};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
