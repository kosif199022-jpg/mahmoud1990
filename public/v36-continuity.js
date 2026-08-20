/* Kosif v36.4 — build identity, state continuity, iOS-safe dialogs and accessibility runtime */
(()=>{'use strict';
const EXPECTED='v36.4',BUILD='2026.08.18-v36.4-mobile-release-integrity';
const STUDIO_VERSION='v41.0.0-root',STUDIO_BUILD='2026.08.20-v41-editorial-cinematic-canva';
const PHASE_B_CSS='/v36-mobile-phase-b.css?v=36.4-phase-b-2-scroll';
const ANALYTICS_3D_SRC='/v36-analytics-3d.js?v=36.4-phase-c-1';
const CANVA_PREMIUM_CSS='/kosif-studio-v40.css?v=2026.08.20-v40';
const EDITORIAL_CSS='/kosif-editorial-v41.css?v=2026.08.20-v41';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DIALOG_SELECTORS=['#kosif-more','#kosif-company-sheet','#kosif-ai-sheet','#kosif-command-sheet','#kosif-font-sheet','#kosif-ai-gate','#ks40-launch-overlay','#modal-bg','#drawer'];
const PROGRESS_STALE_MS=20000;
let versionInfo=null,lastFocus=null,lockY=0,bodySnapshot=null,rootScrollBehavior='',progressTimer=0,progressObserver=null,progressFingerprint='',viewportRaf=0,analytics3DPromise=null,premiumObserver=null;
function announce(t){const x=$('#kosif-live-region');if(x)x.textContent=String(t||'')}
function isOpenDialog(el){
 if(!el)return false;
 if(el.id==='ks40-launch-overlay')return !el.hidden;
 if(el.id==='drawer')return el.classList.contains('open');
 return el.classList.contains('show');
}
function openDialogs(){return DIALOG_SELECTORS.map($).filter(isOpenDialog)}
function loadPhaseBStyles(){if($('#kosif-mobile-phase-b-css'))return;const l=document.createElement('link');l.id='kosif-mobile-phase-b-css';l.rel='stylesheet';l.href=PHASE_B_CSS;document.head.appendChild(l)}
function loadCanvaPremiumStyles(){
 if($('#kosif-canva-premium-runtime'))return;
 const st=document.createElement('style');st.id='kosif-canva-premium-runtime';st.textContent=`@import url("${CANVA_PREMIUM_CSS}");@import url("${EDITORIAL_CSS}");`;
 (document.body||document.documentElement).appendChild(st);
 document.documentElement.dataset.kosifVisual='kosif-studio-v40';
 const metas=[...document.querySelectorAll('meta[name="theme-color"]')];
 if(metas.length)metas.forEach(m=>m.setAttribute('content',/dark/.test(m.media||'')?'#081B19':'#102825'));else{const m=document.createElement('meta');m.name='theme-color';m.content='#102825';document.head.appendChild(m)}
 try{const saved=String(localStorage.getItem('kosif_theme')||'').toLowerCase();if(saved==='dark'||saved==='light'||saved==='sepia')document.documentElement.dataset.theme=saved;else{localStorage.setItem('kosif_theme','light');document.documentElement.dataset.theme='light'}}catch(_){if(!document.documentElement.dataset.theme)document.documentElement.dataset.theme='light'}
}
function loadAnalytics3D(){if(window.KosifAnalytics3D){window.KosifAnalytics3D.mount?.();return Promise.resolve(window.KosifAnalytics3D)}if(analytics3DPromise)return analytics3DPromise;analytics3DPromise=new Promise((resolve,reject)=>{const old=$('#kosif-analytics-3d-script');if(old){old.addEventListener('load',()=>resolve(window.KosifAnalytics3D),{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.id='kosif-analytics-3d-script';s.src=ANALYTICS_3D_SRC;s.defer=true;s.dataset.kosifModule='analytics3d';s.onload=()=>{window.KosifAnalytics3D?.mount?.();resolve(window.KosifAnalytics3D)};s.onerror=e=>{analytics3DPromise=null;reject(e)};document.head.appendChild(s)});return analytics3DPromise}
function analytics3DGuard(){const trigger=()=>{const run=()=>loadAnalytics3D().catch(()=>{});if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:900});else setTimeout(run,30)};window.addEventListener('kosif-view-change',e=>{if(e.detail?.view==='analytics')trigger()});const initial=()=>{if($('#view-analytics.show'))trigger()};if(document.readyState==='complete')setTimeout(initial,0);else window.addEventListener('load',initial,{once:true})}
function lockBody(preferredY){
 if(bodySnapshot)return;
 lockY=Math.max(0,Number.isFinite(preferredY)?preferredY:(window.scrollY||document.documentElement.scrollTop||0));
 const b=document.body,r=document.documentElement;
 bodySnapshot={position:b.style.position,top:b.style.top,left:b.style.left,right:b.style.right,width:b.style.width,overflow:b.style.overflow,touchAction:b.style.touchAction};
 rootScrollBehavior=r.style.scrollBehavior;r.style.scrollBehavior='auto';
 b.dataset.kosifDialogOpen='1';b.style.position='fixed';b.style.top=`-${lockY}px`;b.style.left='0';b.style.right='0';b.style.width='100%';b.style.overflow='hidden';
 window.dispatchEvent(new CustomEvent('kosif-dialog-lock',{detail:{locked:true,scrollY:lockY}}));
}
function unlockBody(){
 if(!bodySnapshot)return;
 const b=document.body,r=document.documentElement,y=lockY,s=bodySnapshot;bodySnapshot=null;
 b.style.position=s.position;b.style.top=s.top;b.style.left=s.left;b.style.right=s.right;b.style.width=s.width;b.style.overflow=s.overflow;b.style.touchAction=s.touchAction;delete b.dataset.kosifDialogOpen;
 window.scrollTo(0,y);requestAnimationFrame(()=>{r.style.scrollBehavior=rootScrollBehavior;rootScrollBehavior=''});
 window.dispatchEvent(new CustomEvent('kosif-dialog-lock',{detail:{locked:false,scrollY:y}}));
}
function syncDialogLock(preferredY){
 const open=openDialogs();
 DIALOG_SELECTORS.map($).filter(Boolean).forEach(el=>el.setAttribute('aria-hidden',isOpenDialog(el)?'false':'true'));
 if(open.length)lockBody(preferredY);else unlockBody();
 return open;
}
function watchDialog(el){if(!el||el.dataset.kosifDialogWatch==='1')return;el.dataset.kosifDialogWatch='1';new MutationObserver(syncDialogLock).observe(el,{attributes:true,attributeFilter:['class','hidden']})}
function focusable(el){return [...el.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null&&!x.hidden)}
function focusFirst(el){const x=focusable(el)[0];if(!x)return;try{x.focus({preventScroll:true})}catch(_){x.focus()}setTimeout(()=>{try{x.scrollIntoView({block:'nearest',inline:'nearest'})}catch(_){}},80)}
function trapTab(e,el){if(e.key!=='Tab'||!el)return;const xs=focusable(el);if(!xs.length){e.preventDefault();return}const first=xs[0],last=xs.at(-1),a=document.activeElement;if(e.shiftKey&&a===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}}
function withinDialog(el,target){return !!(el&&target&&(el.contains(target)||(el.id==='drawer'&&target.closest?.('#drawer-bg'))))}
function shell(){
 if(!$('#kosif-skip'))document.body.insertAdjacentHTML('afterbegin','<a id="kosif-skip" href="#kosif-main-anchor">تخطي إلى المحتوى</a><div id="kosif-live-region" aria-live="polite" aria-atomic="true"></div>');
 const main=$('main');if(main&&!$('#kosif-main-anchor')){main.id=main.id||'kosif-main-anchor';main.tabIndex=-1}
 DIALOG_SELECTORS.forEach(sel=>{const el=$(sel);if(!el)return;const ownsDialog=[...el.children].some(child=>child.matches?.('[role="dialog"]'));if(!el.matches('[role="dialog"]')&&!ownsDialog){el.setAttribute('role','dialog');el.setAttribute('aria-modal','true')}el.setAttribute('aria-hidden',isOpenDialog(el)?'false':'true');watchDialog(el)});
 syncDialogLock();
}
function dialogOpen(el){if(!el)return;lastFocus=document.activeElement;el.setAttribute('aria-hidden','false');lockBody();setTimeout(()=>focusFirst(el),30)}
function dialogClose(el){if(!el)return;el.classList.remove('show');el.setAttribute('aria-hidden','true');setTimeout(()=>{syncDialogLock();try{lastFocus?.focus?.({preventScroll:true})}catch(_){try{lastFocus?.focus?.()}catch(__){}}lastFocus=null},0)}
function syncVisualViewport(){
 if(viewportRaf)return;viewportRaf=requestAnimationFrame(()=>{viewportRaf=0;const r=document.documentElement,v=window.visualViewport;const h=Math.max(320,Math.round(v?.height||window.innerHeight||r.clientHeight||720));const top=Math.max(0,Math.round(v?.offsetTop||0));const layout=Math.max(window.innerHeight||0,r.clientHeight||0);const bottom=Math.max(0,Math.round(layout-h-top));r.style.setProperty('--k-vv-height',`${h}px`);r.style.setProperty('--k-vv-top',`${top}px`);r.style.setProperty('--k-vv-bottom',`${bottom}px`);const keyboard=!!(v&&layout>0&&layout-h>120);r.dataset.kosifKeyboard=keyboard?'open':'closed';window.dispatchEvent(new CustomEvent('kosif-visual-viewport',{detail:{height:h,offsetTop:top,offsetBottom:bottom,keyboard}}))})
}
function visualViewportGuard(){const v=window.visualViewport;syncVisualViewport();if(v){v.addEventListener('resize',syncVisualViewport,{passive:true});v.addEventListener('scroll',syncVisualViewport,{passive:true})}window.addEventListener('resize',syncVisualViewport,{passive:true});window.addEventListener('orientationchange',()=>setTimeout(syncVisualViewport,120),{passive:true});window.addEventListener('pageshow',syncVisualViewport,{passive:true})}
function dialogGuards(){
 document.addEventListener('keydown',e=>{const el=openDialogs().at(-1);if(!el)return;if(e.key==='Escape'){e.preventDefault();dialogClose(el);return}trapTab(e,el)},true);
 document.addEventListener('click',e=>{const b=e.target.closest('#kosif-more-btn,#kosif-ai-status,#kosif-font-open,#kosif-command,#kosif-ai-open,#pill-entity');if(!b)return;setTimeout(()=>{const el=openDialogs().at(-1);if(el)dialogOpen(el)},0)},true);
 document.addEventListener('pointerdown',e=>{const el=openDialogs().at(-1);if(!el||withinDialog(el,e.target))return;e.preventDefault();e.stopPropagation()},true);
 document.addEventListener('touchmove',e=>{const el=openDialogs().at(-1);if(!el||withinDialog(el,e.target))return;e.preventDefault();e.stopPropagation()},{capture:true,passive:false});
 document.addEventListener('focusin',e=>{const el=openDialogs().at(-1);if(!el||!el.contains(e.target)||!e.target.matches?.('input,select,textarea,[contenteditable="true"]'))return;setTimeout(()=>{syncVisualViewport();try{e.target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})}catch(_){}},120)},true);
 window.addEventListener('pagehide',()=>{if(bodySnapshot)unlockBody();clearProgressTimer()});
}
function ensureFont200(){const r=$('#kf-range');if(r){r.max='200';r.min='90';r.step='5'}const help=$('#kosif-font-sheet .kf-help');if(help)help.textContent='تكبير آمن للقراءة من 90% إلى 200% مع ثبات الأيقونات والتنقل.';const a=$('#kosif-more #kosif-font-open small');if(a)a.textContent='90% إلى 200% بدون كسر التخطيط'}
function selectedAI(){let p=$('#kai-provider')?.value||'gemini',m=$('#kai-model')?.value||'';p=p==='claude'?'anthropic':p;return{provider:p,model:String(m||'').trim()}}
function syncAI(){
 const pill=$('#kosif-ai-status');if(!pill)return;const unlocked=document.documentElement.dataset.kosifAiUnlocked==='1';const {provider,model}=selectedAI(),verified=window.KosifAIGate?.verified?.()||{},v=verified[provider],connected=!!(unlocked&&v&&(!model||String(v.model||'')===model));
 pill.dataset.state=connected?'connected':unlocked?'unverified':'locked';pill.classList.toggle('on',connected);pill.classList.toggle('off',!connected);pill.classList.toggle('pending',unlocked&&!connected);const t=pill.querySelector('.kosif-ai-text');if(t)t.textContent=connected?'AI متصل · '+(provider==='openai'?'OpenAI':provider==='anthropic'?'Claude':provider==='zai'?'Z.ai':'Gemini'):unlocked?'AI مفتوح · يحتاج اختبار':'🔐 AI مقفول';
 const rm=$('#rounds-model');if(rm&&!connected)rm.textContent=unlocked?'AI مفتوح · غير مختبر':'AI مقفول';
}
function aiGuards(){window.addEventListener('kosif-ai-gate-change',()=>setTimeout(syncAI,0));document.addEventListener('input',e=>{if(e.target.matches?.('#kai-provider,#kai-model,#kai-key,#c-model-gemini,#c-model-openai,#c-model-anthropic,#c-model-zai'))setTimeout(syncAI,0)},true);document.addEventListener('change',e=>{if(e.target.matches?.('#kai-provider,#kai-model'))setTimeout(syncAI,0)},true);setTimeout(syncAI,250)}
function companyName(){const x=$('#pill-entity');const t=(x?.textContent||'').replace(/\s+/g,' ').trim();if(t&&!/اختر|غير محدد|لم تُحد/i.test(t)){localStorage.setItem('kosif_active_company_label_v36_4',t);return t}return localStorage.getItem('kosif_active_company_label_v36_4')||localStorage.getItem('kosif_active_company_label_v36_3')||''}
function syncCompany(){const n=companyName();document.documentElement.dataset.kosifCompanyState=n||'none';$$('[data-kosif-active-company]').forEach(x=>{if(x!==document.documentElement)x.textContent=n||'لم تُحدد شركة'});return n}
function companyGuard(){const pill=$('#pill-entity');if(pill)new MutationObserver(()=>syncCompany()).observe(pill,{childList:true,subtree:true,characterData:true});syncCompany();if(typeof window.go==='function'&&!window.go.__k364){const old=window.go;const wrapped=function(...a){const r=old.apply(this,a);queueMicrotask(()=>{syncCompany();syncAI();premiumMount();window.dispatchEvent(new CustomEvent('kosif-view-change',{detail:{view:a[0]}}))});return r};wrapped.__k364=true;window.go=wrapped}}
function buildCard(){const host=$('#view-about');if(!host||$('#kosif-build-card'))return;host.insertAdjacentHTML('afterbegin',`<div class="card" id="kosif-build-card"><div class="card-h"><h2>هوية إصدار Kosif</h2><span class="spacer"></span><span class="badge info" id="kosif-build-version">${EXPECTED}</span></div><div class="grid g3"><div class="kpi"><div class="l">Build ID</div><div class="v" style="font-size:1rem"><code data-k-build>جاري التحقق…</code></div></div><div class="kpi"><div class="l">الشركة النشطة</div><div class="v" style="font-size:1rem" data-kosif-active-company>—</div></div><div class="kpi"><div class="l">حالة الإصدار</div><div class="v" style="font-size:1rem" data-k-release-state>جارٍ التحقق</div></div></div><div class="note info" style="margin-top:12px"><span>i</span><span>هذه البطاقة تقارن واجهة المتصفح مع Worker والكاش. إذا ظهر اختلاف، يعرض Kosif تنبيه تحديث بدل تشغيل خليط إصدارات بصمت.</span></div></div>`);syncCompany();renderVersion()}
function releaseMatches(x){const legacy=x?.version===EXPECTED&&x?.buildId===BUILD;const studio=x?.productName==='Kosif'&&x?.version===STUDIO_VERSION&&x?.buildId===STUDIO_BUILD&&x?.experienceVersion==='v41.0.0'&&x?.installable===true;return legacy||studio}
function renderVersion(){if(!versionInfo)return;const b=$('[data-k-build]'),s=$('[data-k-release-state]'),v=$('#kosif-build-version');if(b)b.textContent=versionInfo.buildId||versionInfo.version||'—';if(v)v.textContent=versionInfo.version||EXPECTED;if(s)s.textContent=releaseMatches(versionInfo)?'متطابق ✓':'غير متطابق'}
function banner(msg){let x=$('#kosif-release-banner');if(!x){x=document.createElement('button');x.id='kosif-release-banner';x.type='button';x.title='اضغط لإعادة تحميل النسخة الحالية';x.onclick=()=>location.reload();document.body.appendChild(x)}x.textContent=msg}
async function checkVersion(){try{const r=await fetch('/__version?cb='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);versionInfo=await r.json();window.KosifBuildInfo=versionInfo;document.documentElement.dataset.kosifBuild=versionInfo.version||'unknown';renderVersion();if(!releaseMatches(versionInfo))banner('يوجد اختلاف في مكونات الإصدار. اضغط لتحميل Kosif الحالي بالكامل.');else $('#kosif-release-banner')?.remove();return versionInfo}catch(e){banner('تعذر التحقق من هوية الإصدار. اضغط لإعادة المحاولة.');return null}}
function serviceWorkerContinuity(){if(!('serviceWorker'in navigator))return;if(['localhost','127.0.0.1','::1'].includes(location.hostname))return;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('kosif_sw_reload_v41_1_scroll'))return;sessionStorage.setItem('kosif_sw_reload_v41_1_scroll','1');location.reload()});navigator.serviceWorker.getRegistration().then(r=>r?.update?.()).catch(()=>{})}
function premiumYear(){
 const period=String($('#s-period')?.value||'');const m=period.match(/20\d{2}/);return m?.[0]||'2025';
}
function premiumTopbar(){
 const host=$('.top-status');if(!host)return;
 let year=$('#kosif-premium-year');if(!year){year=document.createElement('span');year.id='kosif-premium-year';year.className='pill';year.innerHTML='<span aria-hidden="true">▣</span><span data-kc-year></span>';host.appendChild(year)}
 const y=year.querySelector('[data-kc-year]');if(y)y.textContent='السنة المالية '+premiumYear();
 const brand=$('.brand-name');if(brand&&brand.textContent.trim()!=='KOSIF')brand.textContent='KOSIF';
}
function premiumWelcome(){
 const host=$('#view-overview'),hero=host?.querySelector('.card.hero');if(!host||!hero||$('#kosif-premium-welcome'))return;
 hero.insertAdjacentHTML('beforebegin','<section id="kosif-premium-welcome" aria-label="تجربة Kosif البصرية الجديدة"><div class="kcw-mark" aria-hidden="true"></div><div class="kcw-copy"><p class="kcw-kicker">KOSIF · مساحة المراجع الذكية</p><h2>مراجعة أوضح.<br><span>قرار مهني أقوى.</span></h2><p class="kcw-desc">حوّل ملف الارتباط إلى مسار هادئ وقابل للتتبع: أرقام حتمية، أدلة منظمة، وتقارير محكومة—مع إبقاء الرأي والاعتماد النهائي بيد المراجع البشري.</p><div class="kcw-proof" aria-label="ضمانات التجربة"><span>أرقام حتمية</span><span>أدلة قابلة للتتبع</span><span>اعتماد بشري</span></div><div class="kcw-actions"><button type="button" class="kcw-action primary" data-kc-go="rounds">ابدأ جولة مراجعة</button><button type="button" class="kcw-action secondary" data-kc-go="v38-reports">افتح التقارير المحكومة</button></div><small class="kcw-release">KOSIF Editorial · v41</small></div></section>');
}
function premiumActions(){
 const host=$('#view-overview'),hero=host?.querySelector('.card.hero'),pathCard=host?.querySelector('#steps')?.closest('.card');if(pathCard)pathCard.id='kosif-overview-path-card';if(!host||!hero||$('#kosif-premium-actions'))return;
 hero.insertAdjacentHTML('afterend','<section id="kosif-premium-actions" aria-label="إجراءات سريعة"><div class="kpa-title">إجراءات سريعة</div><div class="kpa-grid"><button type="button" data-kc-go="rounds"><span class="kpa-ic">↻</span><b>الجولات</b><small>المتابعة والإدارة</small></button><button type="button" data-kc-go="pbc"><span class="kpa-ic">▤</span><b>المطالبات</b><small>الأدلة والمستندات</small></button><button type="button" data-kc-go="tb"><span class="kpa-ic">⚖</span><b>الميزان</b><small>التحقق والتحليل</small></button><button type="button" data-kc-go="outputs"><span class="kpa-ic">▥</span><b>التقارير</b><small>المخرجات والتحليل</small></button></div></section>');
}
function premiumHeroCTA(){
 const hero=$('#view-overview>.card.hero'),kpis=$('#view-overview #kpis');if(!hero||!kpis||$('#kosif-premium-rounds-cta'))return;
 const wrap=document.createElement('div');wrap.id='kosif-premium-rounds-cta';wrap.style.cssText='position:relative;z-index:2;margin-top:14px;display:grid;gap:7px';wrap.innerHTML='<button type="button" class="btn gold" data-kc-go="rounds" style="width:100%;font-size:15px">الانتقال إلى الجولات ←</button><div style="text-align:center;color:#8fa2ba;font-size:11.5px">ملف الارتباط جاهز للمتابعة بعد اكتمال متطلبات الميزان</div>';kpis.after(wrap);
}
function premiumNavigation(){
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-kc-go]');if(!b)return;const v=b.dataset.kcGo;try{if(typeof window.go==='function')window.go(v);else document.querySelector('[data-go="'+v+'"]')?.click()}catch(_){}},true);
}
function premiumMount(){
 loadCanvaPremiumStyles();premiumTopbar();premiumWelcome();premiumActions();premiumHeroCTA();
 document.documentElement.dataset.kosifVisual='kosif-studio-v40';
}
function premiumWatch(){
 if(premiumObserver||!document.body)return;
 premiumObserver=new MutationObserver(()=>requestAnimationFrame(premiumMount));premiumObserver.observe(document.body,{childList:true,subtree:true});
}
function clearProgressTimer(){if(progressTimer){clearTimeout(progressTimer);progressTimer=0}}
function progressVisible(el){return !!(el&&el.classList.contains('show'))}
function progressState(el){if(!el)return'';return [el.querySelector('.kp-ring b')?.textContent||'',el.querySelector('.kp-stage')?.textContent||'',el.querySelector('.kp-note')?.textContent||''].join('|')}
function releaseStaleProgress(el){if(!progressVisible(el))return;el.classList.remove('show');el.setAttribute('aria-hidden','true');announce('تم إنهاء شاشة انتظار علقت بدون تقدم. يمكنك إعادة المحاولة.');try{window.toast?.('استغرقت العملية وقتًا أطول من المتوقع، تم إنهاء شاشة الانتظار. أعد المحاولة.','warn')}catch(_){}window.dispatchEvent(new CustomEvent('kosif-progress-safety-release',{detail:{reason:'stale',timeout:PROGRESS_STALE_MS}}))}
function armProgressSafety(){
 clearProgressTimer();const el=$('#kosif-progress');if(!progressVisible(el))return;progressFingerprint=progressState(el);
 progressTimer=setTimeout(()=>{progressTimer=0;const cur=$('#kosif-progress');if(!progressVisible(cur))return;const next=progressState(cur);if(next!==progressFingerprint){armProgressSafety();return}releaseStaleProgress(cur)},PROGRESS_STALE_MS);
}
function watchProgressSafety(){const el=$('#kosif-progress');if(!el||el.dataset.kosifProgressSafety==='1')return;el.dataset.kosifProgressSafety='1';progressObserver=new MutationObserver(()=>armProgressSafety());progressObserver.observe(el,{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true,characterData:true});armProgressSafety()}
function mountWatcher(){const main=$('main');if(!main)return;let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;shell();ensureFont200();buildCard();syncCompany();syncAI();premiumMount();watchProgressSafety()})}).observe(main,{childList:true,subtree:true})}
function init(){loadPhaseBStyles();loadCanvaPremiumStyles();shell();visualViewportGuard();dialogGuards();aiGuards();companyGuard();analytics3DGuard();ensureFont200();buildCard();premiumMount();premiumNavigation();premiumWatch();watchProgressSafety();mountWatcher();serviceWorkerContinuity();checkVersion();window.addEventListener('online',()=>{announce('عاد الاتصال');checkVersion()});window.addEventListener('offline',()=>announce('لا يوجد اتصال. سيستخدم Kosif الموارد المتاحة دون تخزين API.'))}
window.KosifContinuity={version:'36.4',patch:'v41.1-scroll-runtime',buildId:BUILD,checkVersion,syncAI,syncCompany,companyName,registerDialogs:shell,syncDialogLock,lockBody,unlockBody,watchProgressSafety,armProgressSafety,syncVisualViewport,loadAnalytics3D,premiumMount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
