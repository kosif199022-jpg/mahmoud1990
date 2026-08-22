/* KOSIF screen capture companion v54.2 — integrated UX video recorder, opt-in and local-only. */
(()=>{
'use strict';
if(window.__KOSIF_REC_SCREEN_V54__)return;window.__KOSIF_REC_SCREEN_V54__=true;
if(location.pathname==='/wealth'||location.pathname.startsWith('/wealth/'))return;

const MAX_IMPORT=400*1024*1024;
const MAX_RECORDING=750*1024*1024;
const MIMES=[
  'video/mp4;codecs=h264,aac',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];
const MIC_KEY='kosif.screen-capture.microphone';
let displayStream=null,micStream=null,recordStream=null,audioCtx=null,rec=null,chunks=[],chunkBytes=0,started=0,stopReason='',blob=null,url='',meta=null,resolveStop=null,reportTimer=0,downloadAttempted=false,linkedUx=false;
const ios=/iPad|iPhone|iPod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const mac=/Macintosh|Mac OS X/i.test(navigator.userAgent||'')||navigator.platform==='MacIntel';
const supported=()=>Boolean(window.isSecureContext&&navigator.mediaDevices?.getDisplayMedia&&window.MediaRecorder);
const mime=()=>typeof MediaRecorder?.isTypeSupported==='function'?(MIMES.find(x=>{try{return MediaRecorder.isTypeSupported(x)}catch{return false}})||''):'';
const wantMic=()=>{try{return localStorage.getItem(MIC_KEY)==='1'}catch{return false}};
const filename=()=>`kosif-screen-${new Date(meta?.capturedAt||Date.now()).toISOString().replace(/[:.]/g,'-')}.${/mp4/i.test(meta?.mimeType||blob?.type||'')?'mp4':'webm'}`;

function emit(state,x={}){window.dispatchEvent(new CustomEvent('kosif-screen-capture',{detail:{state,directSupported:supported(),localOnly:true,linkedUx,...x}}))}
function style(){
  if(document.getElementById('ks-screen-style'))return;
  const s=document.createElement('style');s.id='ks-screen-style';s.textContent=`
#ks-screen{position:fixed;left:8px;bottom:calc(136px + env(safe-area-inset-bottom,0px));z-index:2147483645;display:flex;gap:6px;align-items:center;direction:rtl;font-family:inherit;pointer-events:none}
#ks-screen button{pointer-events:auto;width:44px;height:44px;border:0;border-radius:999px;background:#0f172a;color:white;font:800 18px/1 inherit;box-shadow:0 7px 22px #0004}
#ks-screen button[data-active="1"]{background:#991b1b;animation:ksRecPulse 1.5s ease-in-out infinite}
#ks-screen button[data-ready="1"]{outline:3px solid #10b98155}
#ks-screen-state{display:none;max-width:min(260px,66vw);padding:8px 11px;border-radius:999px;background:#0f172aee;color:white;font:700 10px/1.35 inherit;box-shadow:0 6px 20px #0003}
#ks-screen-state.show{display:block}
#ks-screen-panel{position:fixed!important;inset:0!important;z-index:2147483647!important;display:none;overflow:auto;overscroll-behavior:contain;padding:max(10px,env(safe-area-inset-top,0px)) 10px max(10px,env(safe-area-inset-bottom,0px));background:#020617e8;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);direction:rtl;font-family:inherit;isolation:isolate;pointer-events:auto!important}
#ks-screen-panel.show{display:flex!important}
#ks-screen-card{position:relative;z-index:1;width:min(760px,100%);margin:auto;padding:18px;border-radius:18px;background:white;color:#111827;box-shadow:0 28px 90px #0009;border:1px solid #ffffff55}
#ks-screen-card h2{margin:0 0 8px;font-size:20px;color:#0f172a}
#ks-screen-card p,#ks-screen-card li{line-height:1.7;color:#4b5563}
#ks-screen-card .privacy{padding:10px;border-radius:10px;background:#fff7ed;color:#9a3412;font-weight:700}
#ks-screen-card .ready{margin:0 0 12px;padding:12px;border-radius:12px;background:#ecfdf5;color:#065f46;font-weight:800;border:1px solid #a7f3d0}
#ks-screen-card .ready.warn{background:#fffbeb;color:#92400e;border-color:#fde68a}
#ks-screen-card video{display:none;width:100%;max-height:52vh;background:#020617;border-radius:12px;margin-top:10px}
#ks-screen-card video.show{display:block}
#ks-screen-card .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
#ks-screen-card button,#ks-screen-card label{min-height:44px;padding:0 13px;border:1px solid #d1d5db;border-radius:10px;background:white;color:#111827;font:700 13px/1 inherit;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
#ks-screen-card label.primary,#ks-screen-card button.primary{background:#111827;color:white;border-color:#111827}
#ks-screen-card button:disabled{opacity:.45;cursor:not-allowed}
#ks-screen-card .toggle{display:flex;align-items:center;gap:8px;margin:10px 0;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;font-weight:700;color:#334155}
#ks-screen-card .toggle input{width:18px;height:18px}
#ks-screen-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
#kosif-screen-report{margin:12px 0;padding:12px;border:1px solid #a7f3d0;border-radius:12px;background:#ecfdf5;color:#064e3b}
#kosif-screen-report video{display:block;width:100%;max-height:42vh;margin-top:8px;background:#020617;border-radius:10px}
#kosif-screen-report button{min-height:44px;margin:8px 8px 0 0}
@keyframes ksRecPulse{50%{box-shadow:0 0 0 8px #ef44442e,0 7px 22px #0004}}
`;document.head.appendChild(s)
}
function ui(){
  style();if(document.getElementById('ks-screen'))return;
  const d=document.createElement('div');d.id='ks-screen';d.innerHTML='<span id="ks-screen-state" role="status" aria-live="polite"></span><button id="ks-screen-btn" type="button" aria-label="تصوير الشاشة" title="تصوير الشاشة">▣</button>';
  document.body.appendChild(d);
  d.querySelector('button').onclick=()=>rec?.state==='recording'?stop('manual-stop'):supported()?start('standalone'):open()
}
function panel(){
  let p=document.getElementById('ks-screen-panel');if(p)return p;
  style();p=document.createElement('div');p.id='ks-screen-panel';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label','نتيجة تصوير شاشة KOSIF');
  p.innerHTML='<div id="ks-screen-card"><h2>تصوير شاشة KOSIF</h2><div id="ks-screen-ready"></div><p id="ks-screen-help"></p><label class="toggle"><input id="ks-screen-mic" type="checkbox"> تضمين الميكروفون مع صوت التبويب/النظام عندما يسمح المتصفح</label><ol id="ks-screen-steps"></ol><p class="privacy">الفيديو يُنشأ محليًا على جهازك. لا يُرفع تلقائيًا إلى Cloudflare أو GitHub أو أي نموذج ذكاء اصطناعي.</p><video id="ks-screen-preview" controls playsinline preload="metadata"></video><input id="ks-screen-file" type="file" accept="video/*"><div class="actions"><button id="ks-screen-start" class="primary" type="button">بدء تصوير المتصفح</button><label class="primary" for="ks-screen-file">اختيار تسجيل من الصور/الملفات</label><button id="ks-screen-save" type="button">حفظ الفيديو</button><button id="ks-screen-close" type="button">إغلاق</button></div></div>';
  document.body.appendChild(p);
  p.onclick=e=>{if(e.target===p)close()};p.querySelector('#ks-screen-close').onclick=close;p.querySelector('#ks-screen-save').onclick=()=>download('manual');p.querySelector('#ks-screen-start').onclick=()=>start('panel');p.querySelector('#ks-screen-file').onchange=e=>importVideo(e.target.files?.[0]);
  const mic=p.querySelector('#ks-screen-mic');mic.checked=wantMic();mic.onchange=()=>{try{localStorage.setItem(MIC_KEY,mic.checked?'1':'0')}catch{}};
  return p
}
function steps(){return ios?['افتح مركز التحكم واضغط «تسجيل الشاشة».','ارجع إلى Safari واستخدم KOSIF.','أوقف التسجيل ثم اختر الفيديو من الصور هنا.']:mac?['إذا لم يسمح Safari بالالتقاط المباشر استخدم Shift + Command + 5.','سجل نافذة Safari أو الشاشة أثناء الاختبار.','اختر ملف الفيديو هنا بعد الإيقاف.']:['اختر من نافذة المتصفح: تبويب أو نافذة أو شاشة كاملة.','فعّل مشاركة الصوت إن ظهر خيارها لتسجيل صوت التطبيق/التبويب.','نفّذ رحلة الاختبار ثم أوقف التسجيل من زر KOSIF أو من شريط المشاركة.']}
function renderPanel(){
  const p=panel(),h=p.querySelector('#ks-screen-help'),ol=p.querySelector('#ks-screen-steps'),v=p.querySelector('video'),save=p.querySelector('#ks-screen-save'),startBtn=p.querySelector('#ks-screen-start'),ready=p.querySelector('#ks-screen-ready');
  h.textContent=supported()?'عند البدء سيطلب المتصفح منك اختيار التبويب أو النافذة أو الشاشة. إذا شاركت الصوت فسيسجَّل صوت السطح المحدد أيضًا.':'التقاط الشاشة المباشر غير متاح في هذا المتصفح؛ استخدم تسجيل النظام ثم أرفق الفيديو.';
  ol.innerHTML='';steps().forEach(t=>{const li=document.createElement('li');li.textContent=t;ol.appendChild(li)});
  if(url){v.src=url;v.classList.add('show')}else{v.removeAttribute('src');v.classList.remove('show')}
  save.disabled=!blob;startBtn.style.display=supported()?'inline-flex':'none';
  if(meta){
    const seconds=meta.durationMs?Math.max(1,Math.round(meta.durationMs/1000)):0,mb=(meta.sizeBytes/1024/1024).toFixed(1);
    ready.className='ready';ready.textContent=`✓ التسجيل جاهز${seconds?` · ${seconds}ث`:''} · ${mb}MB${downloadAttempted?' · تم بدء التحميل تلقائيًا':''}`;
  }else if(rec?.state==='recording'){
    ready.className='ready warn';ready.textContent='● التسجيل جارٍ الآن — اضغط زر الإيقاف لإنهائه.';
  }else{ready.className='';ready.textContent=''}
}
function open(result=false){
  renderPanel();const p=panel();
  if(result){try{document.body.appendChild(p)}catch{} }
  p.classList.add('show');
  requestAnimationFrame(()=>{try{p.scrollTop=0;(p.querySelector(result&&blob?'#ks-screen-save':'#ks-screen-start')||p.querySelector('#ks-screen-close'))?.focus({preventScroll:true})}catch{}})
}
function close(){panel().classList.remove('show')}
function state(text=''){
  ui();const b=document.getElementById('ks-screen-btn'),s=document.getElementById('ks-screen-state'),active=rec?.state==='recording';
  b.dataset.active=active?'1':'0';b.dataset.ready=blob?'1':'0';b.textContent=active?'■':'▣';b.title=active?'إيقاف تصوير الشاشة':'تصوير الشاشة';b.setAttribute('aria-label',b.title);
  s.textContent=text||(active?'تصوير الشاشة جارٍ':blob?'الفيديو جاهز':'');s.classList.toggle('show',!!s.textContent);renderPanel()
}
function cleanupStreams(){
  for(const s of [recordStream,micStream,displayStream])try{s?.getTracks().forEach(t=>t.stop())}catch{}
  recordStream=null;micStream=null;displayStream=null;
  if(audioCtx){try{audioCtx.close()}catch{}audioCtx=null}
}
function settingsOf(track){try{const x=track?.getSettings?.()||{};return{displaySurface:x.displaySurface||'',width:Number(x.width||0),height:Number(x.height||0),frameRate:Number(x.frameRate||0)}}catch{return{}}}
function setBlob(b,x={}){
  if(url)try{URL.revokeObjectURL(url)}catch{};blob=b;url=b?URL.createObjectURL(b):'';downloadAttempted=false;
  meta=b?{schema:'kosif.screen-capture.v2',source:x.source||'display-media',capturedAt:x.capturedAt||new Date().toISOString(),durationMs:Number(x.durationMs||0),sizeBytes:b.size,mimeType:b.type||x.mimeType||'video/webm',localOnly:true,autoUploaded:false,containsScreenPixels:true,containsDisplayAudio:Boolean(x.containsDisplayAudio),containsMicrophone:Boolean(x.containsMicrophone),displaySurface:x.displaySurface||'',video:x.video||{},linkedUx:Boolean(x.linkedUx||linkedUx),autoDownloadAttempted:false}:null;
  state();enhance()
}
async function display(){
  const advanced={video:{frameRate:{ideal:30,max:60}},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},systemAudio:'include',surfaceSwitching:'include',selfBrowserSurface:'include'};
  try{return await navigator.mediaDevices.getDisplayMedia(advanced)}catch(e){
    if(e?.name!=='TypeError'&&e?.name!=='OverconstrainedError')throw e;
    try{return await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:30,max:60}},audio:true})}catch(e2){
      if(e2?.name!=='TypeError'&&e2?.name!=='OverconstrainedError')throw e2;
      return navigator.mediaDevices.getDisplayMedia({video:true,audio:false})
    }
  }
}
async function withAudio(ds){
  const video=ds.getVideoTracks(),displayAudio=ds.getAudioTracks();let microphone=[];
  if(wantMic()&&navigator.mediaDevices?.getUserMedia){
    try{micStream=await navigator.mediaDevices.getUserMedia({video:false,audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});microphone=micStream.getAudioTracks()}catch(e){emit('microphone-denied',{errorName:String(e?.name||'Error').slice(0,80)})}
  }
  if(!displayAudio.length&&!microphone.length)return{stream:new MediaStream(video),displayAudio:false,microphone:false};
  if(displayAudio.length&&!microphone.length)return{stream:new MediaStream([...video,...displayAudio]),displayAudio:true,microphone:false};
  if(!displayAudio.length&&microphone.length)return{stream:new MediaStream([...video,...microphone]),displayAudio:false,microphone:true};
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('AUDIO_CONTEXT_UNAVAILABLE');audioCtx=new C();const dest=audioCtx.createMediaStreamDestination();
    for(const track of [...displayAudio,...microphone]){const src=audioCtx.createMediaStreamSource(new MediaStream([track]));src.connect(dest)}
    return{stream:new MediaStream([...video,...dest.stream.getAudioTracks()]),displayAudio:true,microphone:true}
  }catch{return{stream:new MediaStream([...video,...displayAudio]),displayAudio:true,microphone:false}}
}
function makeRec(s){
  const m=mime();const opts=m?{mimeType:m,videoBitsPerSecond:6e6,audioBitsPerSecond:128000}:{videoBitsPerSecond:6e6,audioBitsPerSecond:128000};
  try{return new MediaRecorder(s,opts)}catch{try{return m?new MediaRecorder(s,{mimeType:m}):new MediaRecorder(s)}catch{return new MediaRecorder(s)}}
}
async function start(source='standalone'){
  if(rec?.state==='recording')return true;if(!supported()){open();return false}
  chunks=[];chunkBytes=0;stopReason='';linkedUx=source==='ux-v51'||source==='ux-recorder';
  try{
    displayStream=await display();const videoTrack=displayStream.getVideoTracks()[0];if(!videoTrack)throw new Error('SCREEN_VIDEO_TRACK_MISSING');
    const mixed=await withAudio(displayStream);recordStream=mixed.stream;rec=makeRec(recordStream);started=Date.now();
    const videoInfo=settingsOf(videoTrack);
    rec.ondataavailable=e=>{if(!e.data?.size)return;chunks.push(e.data);chunkBytes+=e.data.size;if(chunkBytes>=MAX_RECORDING&&rec?.state==='recording'){state('تم الوصول للحد الأقصى — جارٍ الإيقاف');void stop('size-limit')}};
    rec.onerror=e=>{state('خطأ في تصوير الشاشة');emit('error',{errorName:String(e.error?.name||'MediaRecorderError').slice(0,80)})};
    rec.onstop=()=>finish({containsDisplayAudio:mixed.displayAudio,containsMicrophone:mixed.microphone,videoInfo});
    videoTrack.addEventListener('ended',()=>{if(rec?.state==='recording')void stop('share-ended')},{once:true});
    rec.start(1000);state();emit('started',{source,mimeType:rec.mimeType||mime(),displayAudio:mixed.displayAudio,microphone:mixed.microphone,displaySurface:videoInfo.displaySurface||''});close();return true
  }catch(e){
    cleanupStreams();rec=null;const cancel=/NotAllowedError|AbortError/i.test(e?.name||'');state(cancel?'تم إلغاء تصوير الشاشة':'تعذر تصوير الشاشة');emit(cancel?'cancelled':'error',{errorName:String(e?.name||'Error').slice(0,80),source});if(!cancel)open();return false
  }
}
function stop(reason='manual-stop'){
  if(!rec||rec.state==='inactive')return Promise.resolve(meta);stopReason=reason;const p=new Promise(r=>resolveStop=r);
  try{if(rec.state==='paused')rec.resume();rec.requestData?.();rec.stop()}catch{}
  try{displayStream?.getTracks().forEach(t=>t.stop())}catch{}
  return p
}
function finish(info={}){
  const duration=started?Date.now()-started:0,type=rec?.mimeType||chunks.find(Boolean)?.type||mime()||'video/webm',b=chunks.length?new Blob(chunks,{type}):null,reason=stopReason||'recorder-stop',videoTrack=displayStream?.getVideoTracks?.()[0];
  const videoInfo={...settingsOf(videoTrack),...(info.videoInfo||{})};cleanupStreams();rec=null;chunks=[];chunkBytes=0;
  if(b?.size){
    setBlob(b,{source:'display-media',durationMs:duration,mimeType:type,containsDisplayAudio:info.containsDisplayAudio,containsMicrophone:info.containsMicrophone,displaySurface:videoInfo.displaySurface,video:videoInfo,linkedUx});
    emit('stopped',{reason,durationMs:duration,sizeBytes:b.size,mimeType:type,displayAudio:Boolean(info.containsDisplayAudio),microphone:Boolean(info.containsMicrophone)});
    // The result must always be visible above every in-app layer, even while the UX report is finalizing.
    open(true);state('الفيديو جاهز — بدأ التحميل تلقائيًا');
    setTimeout(()=>{downloadAttempted=download('auto');if(meta)meta.autoDownloadAttempted=downloadAttempted;renderPanel();patch();report()},0)
  }else{state('لم يُحفظ فيديو');emit('empty',{reason})}
  started=0;stopReason='';linkedUx=false;const r=resolveStop;resolveStop=null;if(r)r(meta)
}
function importVideo(f){
  if(!f)return;if(!/^video\//i.test(f.type||''))return state('اختر ملف فيديو');if(f.size>MAX_IMPORT)return state('الفيديو أكبر من 400MB');
  setBlob(f,{source:'native-upload',capturedAt:new Date(f.lastModified||Date.now()).toISOString(),mimeType:f.type,linkedUx});state('تم إرفاق تسجيل الشاشة');emit('imported',{sizeBytes:f.size,mimeType:f.type});open(true)
}
function download(mode='manual'){
  if(!blob||!url)return false;
  try{const a=document.createElement('a');a.href=url;a.download=filename();a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();a.remove();emit('download',{mode,fileName:filename(),sizeBytes:blob.size});return true}catch(e){emit('download-error',{mode,errorName:String(e?.name||'Error').slice(0,80)});return false}
}
function patch(){
  const box=document.getElementById('kosif-rec-code');if(!box?.value?.trim()||!meta)return false;
  try{const r=JSON.parse(box.value);if(!/^kosif\.chatgpt\.ux-replay\.v[23]$/.test(r.schema||''))return false;r.screenCapture={...meta,fileName:filename()};box.value=JSON.stringify(r,null,2);window.__KOSIF_LAST_UX_REPLAY__=r;return true}catch{return false}
}
function report(){
  const card=document.getElementById('kosif-rec-card');if(!card||!meta||!url)return false;let s=document.getElementById('kosif-screen-report');
  if(!s){s=document.createElement('section');s.id='kosif-screen-report';card.insertBefore(s,document.getElementById('kosif-rec-actions')||null)}
  const audio=[meta.containsDisplayAudio?'صوت التبويب/النظام':'',meta.containsMicrophone?'ميكروفون':''].filter(Boolean).join(' + ')||'بدون مسار صوت متاح';
  s.innerHTML=`<strong>✓ تسجيل الشاشة مرفق محليًا</strong><div>الفيديو يلتقط السطح الذي اخترته بصريًا (${audio}). تم طلب تنزيله تلقائيًا ويمكن حفظه مرة أخرى من الزر أدناه.</div><video controls playsinline preload="metadata"></video><button type="button">حفظ فيديو الشاشة</button>`;
  s.querySelector('video').src=url;s.querySelector('button').onclick=()=>download('report');return true
}
function enhance(){
  if(!meta)return;clearInterval(reportTimer);let n=0;reportTimer=setInterval(()=>{n++;let ready=false;try{const r=JSON.parse(document.getElementById('kosif-rec-code')?.value||'null');ready=r?.schema==='kosif.chatgpt.ux-replay.v3'||n>80}catch{}
    if(ready){patch();report();clearInterval(reportTimer);reportTimer=0}else if(n>100){clearInterval(reportTimer);reportTimer=0}},100)
}
function integrate(){
  // v51 emits start from the user's recorder-button click. Calling getDisplayMedia here keeps the browser permission flow explicit.
  window.addEventListener('kosif-rec-v51-start',()=>{if(rec?.state==='recording')return;if(supported())void start('ux-v51');else{state('تسجيل الفيديو غير مدعوم هنا — استخدم تسجيل النظام');emit('unsupported',{source:'ux-v51'})}},true);
  window.addEventListener('kosif-rec-v51-stop',()=>{if(rec?.state==='recording')void stop('ux-session-stop')},true);
  window.addEventListener('kosif-ux-replay-ready',async()=>{if(rec?.state==='recording')await stop('ux-session-finalize');enhance()},true)
}
function boot(){
  ui();panel();state();integrate();
  window.KosifScreenRecorder=Object.freeze({supported,start:()=>start('api'),stop:()=>stop('api-stop'),open,download:()=>download('api'),hasVideo:()=>!!blob,isRecording:()=>rec?.state==='recording',metadata:()=>meta?{...meta}:null})
}
window.addEventListener('pagehide',()=>{if(rec?.state==='recording')void stop('pagehide')},{capture:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();