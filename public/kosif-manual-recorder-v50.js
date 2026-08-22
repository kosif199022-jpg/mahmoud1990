/* KOSIF temporary manual session recorder v50.
 * Starts only after the user presses "بدء تسجيل" and survives same-tab navigation.
 * Captures interaction/navigation/layout/error metadata, not secrets or typed values.
 */
(() => {
  'use strict';
  if (window.__KOSIF_MANUAL_RECORDER_V50__) return;
  window.__KOSIF_MANUAL_RECORDER_V50__ = true;

  const AUTH_ENDPOINT = '/api/kosif/recorder/start';
  const BATCH_ENDPOINT = '/api/kosif/recorder/batch';
  const STORAGE_KEY = 'kosif.manual-recorder.v50';
  const MAX_EVENTS = 2600;
  const MAX_BATCH = 100;
  const FLUSH_MS = 5000;
  const SPECIAL_KEYS = new Set(['Tab','Enter','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End','Backspace','Delete',' ']);

  let state = loadState();
  let cloudAuthorized = false;
  let cloudSequence = Number(state.sequence || 0);
  let cloudBuffer = [];
  let flushing = false;
  let lastPointerAt = 0;
  let lastScrollAt = 0;
  let flushTimer = 0;
  let clockTimer = 0;

  function blankState() {
    return { active:false, sessionId:'', startedAt:0, stoppedAt:0, events:[], sequence:0, startPage:null };
  }
  function loadState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return blankState();
      if (!Array.isArray(parsed.events)) parsed.events = [];
      return { ...blankState(), ...parsed, events: parsed.events.slice(-MAX_EVENTS) };
    } catch { return blankState(); }
  }
  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, sequence:cloudSequence, events:state.events.slice(-MAX_EVENTS) }));
    } catch {}
  }
  function resetState() {
    state = blankState();
    cloudSequence = 0;
    cloudBuffer = [];
    saveState();
  }
  function makeId() {
    return (crypto.randomUUID?.() || `ux-${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
  }
  function elapsed() { return state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0; }
  function safeToken(v) { return String(v || '').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80); }
  function safeText(v, max=120) {
    return String(v || '')
      .replace(/(bearer\s+)[^\s]+/ig,'$1[redacted]')
      .replace(/(token|secret|password|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;]+/ig,'$1=[redacted]')
      .replace(/\b\d{8,}\b/g,'[number]')
      .replace(/\s+/g,' ')
      .trim().slice(0,max);
  }
  function safePath(input) {
    try {
      const u = new URL(String(input || location.href), location.href);
      return u.origin === location.origin ? u.pathname : `${u.origin}${u.pathname}`;
    } catch { return ''; }
  }
  function currentView() {
    return document.body?.dataset.kosifCurrentView || document.querySelector('section[data-view].show')?.dataset.view || '';
  }
  function safeSelector(el) {
    if (!(el instanceof Element)) return '';
    if (el.id && !/password|secret|token|key|auth|cookie/i.test(el.id)) return `#${CSS.escape(el.id)}`;
    const parts=[];
    let node=el;
    for(let depth=0;node&&node.nodeType===1&&depth<4;depth+=1,node=node.parentElement){
      let part=node.tagName.toLowerCase();
      const view=node.getAttribute('data-view');
      const go=node.getAttribute('data-go')||node.getAttribute('data-kgo')||node.getAttribute('data-go2');
      if(view) part += `[data-view="${safeToken(view)}"]`;
      else if(go) part += `[data-go="${safeToken(go)}"]`;
      else {
        const cls=[...node.classList].filter(x=>!/active|show|focus|hover|selected|open|error|danger|warn/i.test(x)).slice(0,2);
        if(cls.length) part += cls.map(x=>`.${CSS.escape(x)}`).join('');
      }
      parts.unshift(part);
      if(view||node.matches('main,body')) break;
    }
    return parts.join(' > ').slice(0,260);
  }
  function accessibleName(el) {
    if (!(el instanceof Element)) return '';
    if (el.matches('input,textarea,select,[contenteditable="true"]')) return '';
    const named=el.closest('button,a,[role="button"],[role="link"],summary,label')||el;
    return safeText(named.getAttribute('aria-label')||named.getAttribute('title')||named.textContent||'',100);
  }
  function targetMeta(target) {
    const el=target instanceof Element?target:target?.parentElement;
    if(!el) return {};
    const rect=el.getBoundingClientRect();
    const type=el.getAttribute('type')||'';
    return {
      selector:safeSelector(el),
      tag:el.tagName.toLowerCase(),
      name:accessibleName(el),
      role:String(el.getAttribute('role')||'').slice(0,40),
      inputType:/^(button|checkbox|radio|range|file|submit|reset)$/i.test(type)?type.toLowerCase():'',
      rect:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)},
      view:currentView()
    };
  }
  function pageMeta() {
    return {
      path:location.pathname,
      view:currentView(),
      title:safeText(document.title,100),
      viewport:{width:innerWidth,height:innerHeight,dpr:Number(devicePixelRatio||1)},
      screen:{width:screen.width,height:screen.height},
      orientation:screen.orientation?.type||'',
      touchPoints:Number(navigator.maxTouchPoints||0),
      language:navigator.language||''
    };
  }
  function qaSnapshot() {
    const ids=new Map();
    document.querySelectorAll('[id]').forEach(el=>ids.set(el.id,(ids.get(el.id)||0)+1));
    const duplicateIds=[...ids.entries()].filter(([,n])=>n>1).slice(0,40).map(([id,count])=>({id,count}));
    const smallTargets=[];
    document.querySelectorAll('button,a,input[type="button"],input[type="submit"],[role="button"]').forEach(el=>{
      if(smallTargets.length>=60) return;
      const r=el.getBoundingClientRect();
      if(r.width>0&&r.height>0&&(r.width<44||r.height<44)) smallTargets.push({selector:safeSelector(el),name:accessibleName(el),width:Math.round(r.width),height:Math.round(r.height)});
    });
    return {
      scrollWidth:document.documentElement.scrollWidth,
      clientWidth:document.documentElement.clientWidth,
      horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2,
      duplicateIds,
      smallTouchTargets:smallTargets
    };
  }
  function add(type, detail={}) {
    if(!state.active) return;
    const event={t:elapsed(),type,...detail};
    state.events.push(event);
    cloudBuffer.push(event);
    if(state.events.length>MAX_EVENTS) state.events.splice(0,state.events.length-MAX_EVENTS);
    if(cloudBuffer.length>300) cloudBuffer.splice(0,cloudBuffer.length-300);
    saveState();
    updateHud();
    if(cloudAuthorized&&cloudBuffer.length>=MAX_BATCH) void flushCloud('size');
  }
  async function authorizeCloud() {
    try {
      const r=await fetch(AUTH_ENDPOINT,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({intent:'manual-recorder-v50'})});
      cloudAuthorized=r.ok;
    } catch { cloudAuthorized=false; }
  }
  function cloudPayload(events,reason){
    return {schema:'kosif.uxrec.v2',sessionId:state.sessionId,sequence:cloudSequence++,generatedAt:new Date().toISOString(),reason,page:pageMeta(),events};
  }
  async function flushCloud(reason='interval',beacon=false){
    if(!cloudAuthorized||flushing||!cloudBuffer.length||!state.sessionId) return;
    const events=cloudBuffer.splice(0,MAX_BATCH);
    const body=JSON.stringify(cloudPayload(events,reason));
    saveState();
    if(beacon&&navigator.sendBeacon){
      const ok=navigator.sendBeacon(BATCH_ENDPOINT,new Blob([body],{type:'application/json'}));
      if(!ok) cloudBuffer=events.concat(cloudBuffer).slice(0,300);
      return;
    }
    flushing=true;
    try{
      const r=await fetch(BATCH_ENDPOINT,{method:'POST',credentials:'same-origin',keepalive:true,headers:{'content-type':'application/json'},body});
      if(!r.ok) cloudBuffer=events.concat(cloudBuffer).slice(0,300);
    }catch{cloudBuffer=events.concat(cloudBuffer).slice(0,300)}finally{flushing=false}
  }
  function safeError(v){return {name:safeText(v?.name||v?.constructor?.name||'Error',60),message:safeText(v?.message||v||'',180)}}

  function recordClick(e){
    const before={path:location.pathname,view:currentView(),scrollY:Math.round(scrollY)};
    add('click',{x:Math.round(e.clientX),y:Math.round(e.clientY),pointer:e.pointerType||'mouse',button:Number(e.button||0),target:targetMeta(e.target),before});
    setTimeout(()=>{
      if(!state.active) return;
      add('click-result',{path:location.pathname,view:currentView(),scrollY:Math.round(scrollY),activeTarget:targetMeta(document.activeElement)});
    },280);
  }
  function recordPointer(e){const t=performance.now();if(t-lastPointerAt<240)return;lastPointerAt=t;add('pointer',{x:Math.round(e.clientX),y:Math.round(e.clientY),pointer:e.pointerType||'mouse',target:targetMeta(e.target)})}
  function recordScroll(){const t=performance.now();if(t-lastScrollAt<250)return;lastScrollAt=t;add('scroll',{x:Math.round(scrollX),y:Math.round(scrollY),maxY:Math.max(0,Math.round(document.documentElement.scrollHeight-innerHeight)),view:currentView()})}
  function recordKey(e){if(SPECIAL_KEYS.has(e.key))add('control-key',{control:e.key===' '?'Space':e.key,target:targetMeta(e.target)})}

  function patchHistory(){
    for(const method of ['pushState','replaceState']){
      const original=history[method];
      if(typeof original!=='function'||original.__kosifManualRec) continue;
      const wrapped=function(...args){const r=original.apply(this,args);queueMicrotask(()=>add('navigation',{method,path:location.pathname,view:currentView()}));return r};
      wrapped.__kosifManualRec=true;history[method]=wrapped;
    }
  }
  function patchFetch(){
    const original=window.fetch;
    if(typeof original!=='function'||original.__kosifManualRec) return;
    const wrapped=async function(input,init){
      const started=performance.now();
      let path='';let method='GET';
      try{path=safePath(typeof input==='string'?input:input?.url);method=safeText(init?.method||input?.method||'GET',12).toUpperCase()}catch{}
      try{
        const response=await original.apply(this,arguments);
        const ms=Math.round(performance.now()-started);
        if(state.active&&(response.status>=400||ms>=1800)) add('network',{method,path,status:response.status,durationMs:ms,ok:response.ok});
        return response;
      }catch(err){
        if(state.active) add('network-error',{method,path,durationMs:Math.round(performance.now()-started),error:safeError(err)});
        throw err;
      }
    };
    wrapped.__kosifManualRec=true;window.fetch=wrapped;
  }
  function bind(){
    document.addEventListener('click',recordClick,true);
    document.addEventListener('pointermove',recordPointer,{passive:true,capture:true});
    document.addEventListener('scroll',recordScroll,{passive:true,capture:true});
    document.addEventListener('focusin',e=>add('focus',{target:targetMeta(e.target)}),true);
    document.addEventListener('focusout',e=>add('blur',{target:targetMeta(e.target)}),true);
    document.addEventListener('change',e=>add('change',{target:targetMeta(e.target)}),true);
    document.addEventListener('keydown',recordKey,true);
    window.addEventListener('resize',()=>add('resize',{viewport:{width:innerWidth,height:innerHeight,dpr:Number(devicePixelRatio||1)}}),{passive:true});
    window.addEventListener('orientationchange',()=>add('orientation',{orientation:screen.orientation?.type||'',viewport:{width:innerWidth,height:innerHeight}}),{passive:true});
    window.addEventListener('popstate',()=>add('navigation',{method:'popstate',path:location.pathname,view:currentView()}));
    window.addEventListener('hashchange',()=>add('navigation',{method:'hashchange',path:location.pathname,view:currentView()}));
    window.addEventListener('kosif-view-change',e=>add('view-change',{view:safeText(e.detail?.view||currentView(),80)}));
    window.addEventListener('error',e=>add('error',{error:safeError(e.error||e.message)}));
    window.addEventListener('unhandledrejection',e=>add('unhandled-rejection',{error:safeError(e.reason)}));
    document.addEventListener('visibilitychange',()=>add('visibility',{state:document.visibilityState}));
    window.addEventListener('pagehide',()=>{if(state.active){add('page-exit',{page:pageMeta()});saveState();void flushCloud('pagehide',true)}},{capture:true});
    patchHistory();patchFetch();
  }

  function summarize(){
    const counts={};const views=[];const clicks=[];const errors=[];const network=[];let maxScroll=0;
    for(const ev of state.events){
      counts[ev.type]=(counts[ev.type]||0)+1;
      const view=ev.view||ev.target?.view;
      if(view&&views[views.length-1]!==view) views.push(view);
      if(ev.type==='click') clicks.push({t:ev.t,name:ev.target?.name||'',selector:ev.target?.selector||'',view:ev.target?.view||'',rect:ev.target?.rect||null,before:ev.before||null});
      if(ev.type==='scroll') maxScroll=Math.max(maxScroll,Number(ev.y||0));
      if(ev.type==='error'||ev.type==='unhandled-rejection') errors.push({t:ev.t,type:ev.type,error:ev.error});
      if(ev.type==='network'||ev.type==='network-error') network.push(ev);
    }
    return {durationMs:Math.max(0,(state.stoppedAt||Date.now())-state.startedAt),eventCount:state.events.length,counts,views,clicks:clicks.slice(-220),maxScrollY:maxScroll,errors:errors.slice(-60),network:network.slice(-80)};
  }
  function buildCode(){
    return JSON.stringify({
      schema:'kosif.chatgpt.ux-replay.v2',
      instruction:'حلل هذا التسجيل كرحلة استخدام فعلية داخل KOSIF. أعد بناء الخطوات زمنيا، قارن كل click مع click-result التالي له، وحدد النقرات التي لم تغيّر الشاشة أو الحالة كما يبدو متوقعا، مشاكل اللمس والتمرير والتنقل، أخطاء JavaScript، طلبات الشبكة الفاشلة أو البطيئة، مشاكل الـQA في البداية والنهاية، ثم أعطني إصلاحات مرتبة حسب الأولوية مع selectors المتأثرة. لا تستنتج أي نصوص حقول أو بيانات حساسة غير موجودة.',
      privacy:{typedValuesCaptured:false,passwordsCaptured:false,clipboardCaptured:false,fileContentsCaptured:false,cookiesOrTokensCaptured:false},
      session:{id:state.sessionId,startedAt:new Date(state.startedAt).toISOString(),stoppedAt:new Date(state.stoppedAt||Date.now()).toISOString(),startPage:state.startPage,endPage:pageMeta()},
      summary:summarize(),
      qa:{start:state.startQa||null,end:qaSnapshot()},
      events:state.events
    },null,2);
  }

  function ensureStyle(){
    if(document.getElementById('kosif-manual-recorder-style'))return;
    const s=document.createElement('style');s.id='kosif-manual-recorder-style';s.textContent=`
#kosif-rec-ctl{position:fixed;left:12px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:7px;direction:rtl;font-family:inherit}
#kosif-rec-btn{min-width:108px;min-height:48px;border:0;border-radius:999px;padding:0 15px;background:#111827;color:#fff;font:700 14px/1 inherit;box-shadow:0 8px 26px rgba(0,0,0,.25);cursor:pointer}
#kosif-rec-btn[data-active="1"]{background:#991b1b}
#kosif-rec-live{display:none;align-items:center;gap:6px;min-height:38px;padding:0 10px;border-radius:999px;background:rgba(17,24,39,.94);color:#fff;font:600 12px/1 inherit;white-space:nowrap}
#kosif-rec-live.show{display:flex}#kosif-rec-dot{width:8px;height:8px;border-radius:50%;background:#ef4444}
#kosif-rec-report{position:fixed;inset:0;z-index:2147483200;display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;background:rgba(3,7,18,.76);direction:rtl;font-family:inherit}
#kosif-rec-report.show{display:flex}#kosif-rec-card{width:min(960px,100%);margin:auto;background:#fff;color:#111827;border-radius:18px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.38)}
#kosif-rec-card h2{margin:0 0 7px;font-size:20px}#kosif-rec-card p{margin:0 0 12px;color:#4b5563;line-height:1.6}
#kosif-rec-code{box-sizing:border-box;width:100%;min-height:390px;padding:12px;border:1px solid #d1d5db;border-radius:12px;background:#f9fafb;color:#111827;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;direction:ltr;text-align:left;resize:vertical}
#kosif-rec-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#kosif-rec-actions button{min-height:44px;padding:0 14px;border:1px solid #d1d5db;border-radius:10px;background:#fff;color:#111827;font:700 14px/1 inherit;cursor:pointer}#kosif-rec-actions .primary{background:#111827;color:#fff;border-color:#111827}
@media(max-width:520px){#kosif-rec-ctl{left:8px;bottom:10px}#kosif-rec-btn{min-height:46px;min-width:100px;padding:0 12px}#kosif-rec-report{padding:8px}#kosif-rec-card{padding:13px;border-radius:14px}#kosif-rec-code{min-height:310px}}
`;
    document.head.appendChild(s);
  }
  function ensureUi(){
    ensureStyle();
    if(!document.getElementById('kosif-rec-ctl')){
      const ctl=document.createElement('div');ctl.id='kosif-rec-ctl';ctl.innerHTML='<span id="kosif-rec-live"><span id="kosif-rec-dot"></span><span id="kosif-rec-time">00:00</span><span id="kosif-rec-count">0 حدث</span></span><button id="kosif-rec-btn" type="button">بدء تسجيل</button>';document.body.appendChild(ctl);
      document.getElementById('kosif-rec-btn').addEventListener('click',()=>state.active?stopRecording():startRecording());
    }
    if(!document.getElementById('kosif-rec-report')){
      const r=document.createElement('div');r.id='kosif-rec-report';r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');r.innerHTML='<div id="kosif-rec-card"><h2>كود جلسة KOSIF المسجلة</h2><p>انسخ الكود كاملًا وأرسله لي هنا. سأقدر منه أرتب حركاتك، النقرات، التمرير، الشاشات، أخطاء JavaScript ومشاكل الشبكة والواجهة. لا يحتوي على كلمات المرور أو ما كتبته داخل الحقول.</p><textarea id="kosif-rec-code" readonly spellcheck="false"></textarea><div id="kosif-rec-actions"><button class="primary" id="kosif-rec-copy" type="button">نسخ الكود</button><button id="kosif-rec-download" type="button">حفظ JSON</button><button id="kosif-rec-again" type="button">تسجيل جديد</button><button id="kosif-rec-close" type="button">إغلاق</button></div></div>';document.body.appendChild(r);
      document.getElementById('kosif-rec-copy').addEventListener('click',async()=>{const box=document.getElementById('kosif-rec-code');try{await navigator.clipboard.writeText(box.value);document.getElementById('kosif-rec-copy').textContent='تم النسخ'}catch{box.focus();box.select()}});
      document.getElementById('kosif-rec-download').addEventListener('click',()=>{const text=document.getElementById('kosif-rec-code').value;const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`kosif-ux-replay-${state.sessionId||Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
      document.getElementById('kosif-rec-again').addEventListener('click',()=>{r.classList.remove('show');resetState();updateHud();startRecording()});
      document.getElementById('kosif-rec-close').addEventListener('click',()=>r.classList.remove('show'));
    }
  }
  function updateHud(){
    const btn=document.getElementById('kosif-rec-btn'),live=document.getElementById('kosif-rec-live'),time=document.getElementById('kosif-rec-time'),count=document.getElementById('kosif-rec-count');if(!btn||!live)return;
    btn.dataset.active=state.active?'1':'0';btn.textContent=state.active?'إيقاف التسجيل':'بدء تسجيل';live.classList.toggle('show',state.active);
    const total=Math.floor(elapsed()/1000);if(time)time.textContent=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;if(count)count.textContent=`${state.events.length} حدث`;
  }
  function beginTimers(){clearInterval(flushTimer);clearInterval(clockTimer);flushTimer=setInterval(()=>void flushCloud('interval'),FLUSH_MS);clockTimer=setInterval(updateHud,1000)}
  function startRecording(){
    if(state.active)return;
    resetState();state.active=true;state.sessionId=makeId();state.startedAt=Date.now();state.startPage=pageMeta();state.startQa=qaSnapshot();saveState();add('session-start',{page:pageMeta(),qa:state.startQa});beginTimers();updateHud();
  }
  async function stopRecording(){
    if(!state.active)return;
    add('session-end',{reason:'manual-stop',page:pageMeta(),qa:qaSnapshot()});state.active=false;state.stoppedAt=Date.now();saveState();clearInterval(flushTimer);clearInterval(clockTimer);await flushCloud('manual-stop');
    const code=buildCode();document.getElementById('kosif-rec-code').value=code;document.getElementById('kosif-rec-report').classList.add('show');updateHud();window.__KOSIF_LAST_UX_REPLAY__=JSON.parse(code);window.dispatchEvent(new CustomEvent('kosif-ux-replay-ready',{detail:{sessionId:state.sessionId,eventCount:state.events.length}}));
  }
  function resumeIfNeeded(){if(state.active){cloudSequence=Number(state.sequence||cloudSequence||0);add('page-enter',{page:pageMeta(),qa:qaSnapshot()});beginTimers()}updateHud()}

  function boot(){bind();ensureUi();void authorizeCloud();resumeIfNeeded()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
