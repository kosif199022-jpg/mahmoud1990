/* Kosif v36.3 — Historical UX Recovery & Evidence Continuity
 * Restores proven capabilities from earlier reviewed builds without reintroducing legacy UI.
 * Progressive enhancement only: canonical audit state and AI security remain owned by existing modules.
 */
(()=>{'use strict';
const RELEASE='v36.3';
const DOC_KEY='kosif_session_doc_meta_v2';
const FONT_KEY='kosif_font_scale_v3';
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function toast2(msg,type='ok'){try{if(typeof toast==='function')return toast(msg,type)}catch(_){}console.log('[Kosif]',msg)}
function view(id){try{if(typeof go==='function'){go(id);return true}}catch(_){}const b=q(`[data-go="${CSS.escape(id)}"]`);if(b){b.click();return true}return false}
function currentEntity(){try{return state?.entity?.name||'الارتباط الحالي'}catch(_){return'الارتباط الحالي'}}

/* ---------- Font scale: 90% → 200% ---------- */
function fontScale(){const n=Number(localStorage.getItem(FONT_KEY)||1);return Number.isFinite(n)?Math.min(2,Math.max(.9,n)):1}
function setFontScale(v){const n=Math.min(2,Math.max(.9,Number(v)||1));localStorage.setItem(FONT_KEY,String(n));document.documentElement.style.setProperty('--kosif-user-scale',String(n));document.documentElement.dataset.kosifFont=n>=1.5?'xl':n>=1.2?'lg':'normal';const out=q('#kosif-font-value');if(out)out.textContent=Math.round(n*100)+'%';return n}

/* ---------- Structured review brief and continuity guard ---------- */
function readDocMeta(){try{return JSON.parse(localStorage.getItem(DOC_KEY)||'null')}catch(_){return null}}
function writeDocMeta(files){const docs=(files||[]).map(f=>({name:f.name||'مستند',type:f.type||'',size:Number(f.size)||0,lastModified:Number(f.lastModified)||0}));const payload={savedAt:new Date().toISOString(),entity:currentEntity(),docs};localStorage.setItem(DOC_KEY,JSON.stringify(payload));sessionStorage.setItem('kosif_docs_available','1');document.documentElement.dataset.kosifDocsAvailable='1';hideDocWarning();return payload}
function docsUnavailable(){const m=readDocMeta();return !!(m?.docs?.length&&sessionStorage.getItem('kosif_docs_available')!=='1')}
function structuredBrief(){let s=null;try{s=state}catch(_){}const v=s?.v36||{};const rounds=Array.isArray(s?.rounds)?s.rounds:[];const notes=Array.isArray(v?.notes)?v.notes.slice(-12):[];const pbc=v?.pbc&&typeof v.pbc==='object'?Object.values(v.pbc):[];const pbcStats={};for(const x of pbc){const st=String(x?.status||'Missing');pbcStats[st]=(pbcStats[st]||0)+1}const last=rounds.slice(-6).map(r=>({round:r.no||r.round||'',status:r.parsed?.status||r.status||'',findings:(r.parsed?.findings||[]).length,requests:(r.parsed?.pbc_requests||r.parsed?.requests||[]).length}));const acc=(()=>{try{return (s?.tb?.accounts||[]).length}catch{return 0}})();return {generatedAt:new Date().toISOString(),entity:s?.entity||{},accounts:acc,rounds:last,pbc:pbcStats,reviewerNotes:notes.map(x=>typeof x==='string'?x:(x.text||x.note||'' )).filter(Boolean),reportIssued:!!s?.report,documentsAvailableThisLoad:!docsUnavailable()}}
function briefText(){const b=structuredBrief();return '[ملف مراجعة مهيكل من Kosif — للاستمرارية وتقليل إعادة إرسال السجل الخام]\n'+JSON.stringify(b)}
function continuityNote(){const m=readDocMeta();if(!m?.docs?.length)return'';return '[تنبيه استمرارية الأدلة] الصفحة أُعيد تحميلها، وملفات الجلسة السابقة ليست موجودة كبايتات في الذاكرة الحالية. الملفات المشار إليها سابقًا: '+m.docs.map(x=>x.name).join('، ')+'. لا تفترض أنك تستطيع رؤية محتواها الآن، ولا تبنِ استنتاجًا جديدًا عليها حتى يعيد المستخدم اختيارها أو رفعها.'}
function augmentHistory(rows){if(!Array.isArray(rows))return rows;let out=rows;const compatible=rows.every(x=>x&&typeof x==='object'&&typeof x.role==='string');if(compatible&&rows.length>28){out=[...rows.slice(0,2),{role:'user',parts:[{text:briefText()}]},...rows.slice(-18)]}if(docsUnavailable()&&compatible){out=[...out,{role:'user',parts:[{text:continuityNote()}]}]}return out}
function wrapContinuity(){
  if(typeof window.fileToParts==='function'&&!window.fileToParts.__kosifV363){const base=window.fileToParts;const wrapped=async function(input,...rest){try{const arr=input instanceof FileList?[...input]:Array.isArray(input)?input.filter(x=>x instanceof File):(input instanceof File?[input]:[]);if(arr.length)writeDocMeta(arr)}catch(_){}return base.call(this,input,...rest)};wrapped.__kosifV363=true;window.fileToParts=wrapped}
  if(typeof window.historyContents==='function'&&!window.historyContents.__kosifV363){const base=window.historyContents;const wrapped=function(...args){const r=base.apply(this,args);return r&&typeof r.then==='function'?r.then(augmentHistory):augmentHistory(r)};wrapped.__kosifV363=true;window.historyContents=wrapped}
}
function showDocWarning(){if(!docsUnavailable()||q('#kosif-doc-warning'))return;const x=document.createElement('div');x.id='kosif-doc-warning';x.className='kosif-continuity-warning';const m=readDocMeta();x.innerHTML=`<b>⚠️ مستندات الجولة السابقة تحتاج إعادة اختيار</b><span>${esc((m?.docs||[]).map(d=>d.name).slice(0,4).join(' · '))}${(m?.docs||[]).length>4?' …':''}</span><button type="button" id="kosif-doc-warning-close">فهمت</button>`;document.body.appendChild(x);q('#kosif-doc-warning-close').onclick=()=>x.remove()}
function hideDocWarning(){q('#kosif-doc-warning')?.remove()}

/* ---------- More sheet ---------- */
const MORE=[
 ['companies','🏢','الشركات'],['map','🗺️','الخريطة المعيارية'],['analytics','📊','التحليلات'],['pbc','📎','المطالبات'],['outputs','📄','التقارير والمخرجات'],['reviewer','📝','ملاحظات المراجع'],['standards','📚','مكتبة المعايير'],['books','📖','الكتب والمراجع'],['sources','🌐','المصادر الرسمية'],['search','⌘','البحث والأوامر'],['ai','🧠','AI Agent'],['council','👥','مجلس المراجعين'],['governance','🛡️','الحوكمة وAudit Trail'],['settings','⚙️','الإعدادات'],['appearance','◐','المظهر وحجم الخط'],['about','ⓘ','عن kosif']
];
function makeMore(){if(q('#kosif-more-sheet'))return q('#kosif-more-sheet');const d=document.createElement('div');d.id='kosif-more-sheet';d.className='kosif-overlay';d.innerHTML=`<div class="kosif-sheet" role="dialog" aria-modal="true" aria-labelledby="kosif-more-title"><div class="kosif-sheet-head"><div><b id="kosif-more-title">المزيد</b><small>${esc(currentEntity())}</small></div><button type="button" class="kosif-x" data-kosif-close>✕</button></div><div class="kosif-more-grid">${MORE.map(([id,ic,t])=>`<button type="button" data-kosif-action="${id}"><span>${ic}</span><b>${t}</b></button>`).join('')}</div><div class="kosif-sheet-foot"><button class="btn ghost sm" type="button" id="kosif-export-brief">تصدير ملف المراجعة المهيكل</button><button class="btn ghost sm" type="button" id="kosif-start-tour">▶ جولة تعريفية صوتية</button></div></div>`;document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-kosif-close]'))closeMore();const b=e.target.closest('[data-kosif-action]');if(b){e.preventDefault();runAction(b.dataset.kosifAction)}});q('#kosif-export-brief').onclick=exportBrief;q('#kosif-start-tour').onclick=()=>{closeMore();startTour()};return d}
function openMore(){const d=makeMore();d.classList.add('show');document.documentElement.classList.add('kosif-overlay-open');d.querySelector('button')?.focus()}
function closeMore(){q('#kosif-more-sheet')?.classList.remove('show');document.documentElement.classList.remove('kosif-overlay-open')}
function runAction(id){if(id==='search'){closeMore();return openPalette()}if(id==='standards'){closeMore();location.href='/standards/';return}if(id==='books'){closeMore();location.href='/library/smart';return}if(id==='ai'){closeMore();try{if(typeof openAI==='function')return openAI()}catch(_){}return view('council')}if(id==='appearance'){closeMore();return openAppearance()}if(id==='companies'){closeMore();if(!view('settings'))toast2('افتح إعدادات الشركات من الإعدادات','warn');return}closeMore();view(id)}

/* ---------- Command palette ---------- */
function paletteItems(){const seen=new Set(),out=[];for(const b of qa('[data-go]')){const id=b.dataset.go,t=(b.textContent||'').trim().replace(/\s+/g,' ');if(!id||!t||seen.has(id))continue;seen.add(id);out.push({id,title:t,run:()=>view(id)})}for(const [id,ic,t] of MORE){if(['search','appearance'].includes(id))continue;if(!seen.has(id))out.push({id,title:ic+' '+t,run:()=>runAction(id)})}return out}
function makePalette(){if(q('#kosif-command-palette'))return q('#kosif-command-palette');const d=document.createElement('div');d.id='kosif-command-palette';d.className='kosif-overlay';d.innerHTML=`<div class="kosif-palette" role="dialog" aria-modal="true" aria-label="البحث والأوامر"><div class="kosif-palette-input"><span>⌕</span><input id="kosif-command-input" autocomplete="off" placeholder="اكتب قسمًا أو أمرًا…"><button type="button" class="kosif-x" data-kosif-close>✕</button></div><div id="kosif-command-results"></div><div class="kosif-palette-hint">Alt + K أو Ctrl / ⌘ + / للفتح · Ctrl / ⌘ + K يعمل عندما يسمح المتصفح · Esc للإغلاق</div></div>`;document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-kosif-close]'))closePalette()});q('#kosif-command-input').addEventListener('input',renderPalette);q('#kosif-command-input').addEventListener('keydown',e=>{if(e.key==='Enter')q('#kosif-command-results button')?.click()});return d}
function renderPalette(){const term=(q('#kosif-command-input')?.value||'').trim().toLowerCase(),items=paletteItems().filter(x=>!term||x.title.toLowerCase().includes(term));const w=q('#kosif-command-results');if(!w)return;w.innerHTML=items.slice(0,24).map((x,i)=>`<button type="button" data-i="${i}"><span>${esc(x.title)}</span><small>${esc(x.id)}</small></button>`).join('')||'<div class="kosif-palette-empty">لا توجد نتيجة</div>';[...w.querySelectorAll('button')].forEach((b,i)=>b.onclick=()=>{items[i]?.run();closePalette()})}
function openPalette(){const d=makePalette();d.classList.add('show');renderPalette();setTimeout(()=>q('#kosif-command-input')?.focus(),30)}
function closePalette(){q('#kosif-command-palette')?.classList.remove('show')}

/* ---------- Appearance ---------- */
function makeAppearance(){if(q('#kosif-appearance-sheet'))return q('#kosif-appearance-sheet');const d=document.createElement('div');d.id='kosif-appearance-sheet';d.className='kosif-overlay';d.innerHTML=`<div class="kosif-sheet kosif-appearance" role="dialog" aria-modal="true" aria-label="المظهر"><div class="kosif-sheet-head"><div><b>المظهر والقراءة</b><small>تحكم يصل إلى 200% بدون تغيير بيانات التطبيق</small></div><button type="button" class="kosif-x" data-kosif-close>✕</button></div><label>حجم الخط <b id="kosif-font-value"></b></label><input id="kosif-font-range" type="range" min="90" max="200" step="5"><div class="kosif-font-presets">${[100,125,150,175,200].map(n=>`<button type="button" data-font="${n}">${n}%</button>`).join('')}</div><div class="kosif-sheet-foot"><button type="button" class="btn ghost sm" id="kosif-theme-toggle">تبديل الوضع الفاتح/الداكن</button><button type="button" class="btn ghost sm" id="kosif-refresh-app">تحديث ملفات التطبيق</button></div></div>`;document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-kosif-close]'))closeAppearance();const b=e.target.closest('[data-font]');if(b){q('#kosif-font-range').value=b.dataset.font;setFontScale(+b.dataset.font/100)}});const r=q('#kosif-font-range');r.value=Math.round(fontScale()*100);r.oninput=()=>setFontScale(+r.value/100);q('#kosif-theme-toggle').onclick=()=>{const btn=q('[data-theme-toggle],#theme-toggle,#btn-theme');if(btn)btn.click();else{const root=document.documentElement;root.dataset.theme=root.dataset.theme==='dark'?'light':'dark'}};q('#kosif-refresh-app').onclick=hardRefresh;setFontScale(fontScale());return d}
function openAppearance(){const d=makeAppearance();d.classList.add('show');setFontScale(fontScale())}
function closeAppearance(){q('#kosif-appearance-sheet')?.classList.remove('show')}

/* ---------- Guided voice tour ---------- */
const TOUR=[
 ['overview','الرئيسية','ابدأ من ملف الارتباط. هنا ترى الشركة الحالية، حالة المهمة، ومؤشرات المراجعة الرئيسية.'],
 ['tb','ميزان المراجعة','استورد ميزان المراجعة أو استخدم البيانات التجريبية. المحرك الحتمي يفحص الاتزان والحسابات والمخاطر قبل الذكاء الاصطناعي.'],
 ['rounds','الجولات','الجولات تجمع الأدلة وتفصل بين التحليل والمستندات والنتائج، مع بقاء الحكم النهائي للمراجع البشري.'],
 ['pbc','المطالبات','هنا تتابع المستندات المطلوبة وحالتها من مفقود إلى مقبول أو يحتاج استيضاحًا.'],
 ['analytics','التحليلات','التحليلات واختبارات القيود والمبيعات والتكاليف تعمل بصورة حتمية قابلة لإعادة التنفيذ.'],
 ['council','مجلس المراجعين','يمكن تشغيل أكثر من مزود مستقل بعد فتح إعدادات الذكاء الاصطناعي واختبار كل اتصال بنجاح.'],
 ['outputs','المخرجات','في النهاية تراجع التحريفات والميزان المعدل والتقرير وخطاب الإدارة والمخرجات قبل الاعتماد البشري.']
];
let tourStop=false;
async function startTour(){tourStop=false;for(const [id,title,text] of TOUR){if(tourStop)break;view(id);await sleep(380);showTourCard(title,text);if('speechSynthesis'in window){await new Promise(resolve=>{try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ar-SA';u.rate=.95;u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)}catch(_){resolve()}})}else await sleep(2400)}hideTourCard()}
function showTourCard(title,text){let x=q('#kosif-tour-card');if(!x){x=document.createElement('div');x.id='kosif-tour-card';x.innerHTML='<div><b></b><p></p></div><button type="button">إيقاف</button>';x.querySelector('button').onclick=()=>{tourStop=true;try{speechSynthesis.cancel()}catch(_){ }hideTourCard()};document.body.appendChild(x)}x.querySelector('b').textContent=title;x.querySelector('p').textContent=text;x.classList.add('show')}
function hideTourCard(){q('#kosif-tour-card')?.classList.remove('show')}

/* ---------- Build/version handshake ---------- */
async function checkVersion(){try{const r=await fetch('/__health?cb='+Date.now(),{cache:'no-store',headers:{'cache-control':'no-cache,no-store'}});if(!r.ok)return;const h=await r.json();document.documentElement.dataset.kosifServerVersion=h.version||'';if(h.version&&h.version!==RELEASE)showUpdate(h.version)}catch(_){}}
function showUpdate(serverVersion){if(q('#kosif-update-banner'))return;const x=document.createElement('div');x.id='kosif-update-banner';x.innerHTML=`<span>يتوفر إصدار أحدث من Kosif: <b>${esc(serverVersion)}</b></span><button type="button">تحديث الآن</button>`;document.body.appendChild(x);x.querySelector('button').onclick=hardRefresh}
async function hardRefresh(){try{const regs=await navigator.serviceWorker?.getRegistrations?.();for(const r of regs||[])try{await r.update()}catch(_){}const keys=await caches.keys();for(const k of keys)if(/^kosif-native-v/i.test(k))await caches.delete(k)}catch(_){}location.replace(location.pathname+'?v='+encodeURIComponent(RELEASE)+'&cb='+Date.now())}

/* ---------- Export structured brief ---------- */
function exportBrief(){const text='# Kosif — ملف مراجعة مهيكل\n\n```json\n'+JSON.stringify(structuredBrief(),null,2)+'\n```\n';const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));a.href=u;a.download='kosif-audit-brief-'+new Date().toISOString().slice(0,10)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);toast2('تم تصدير ملف المراجعة المهيكل')}

function bind(){
 setFontScale(fontScale());makeMore();makePalette();makeAppearance();wrapContinuity();setTimeout(wrapContinuity,1200);setTimeout(wrapContinuity,3500);showDocWarning();checkVersion();
 document.addEventListener('keydown',e=>{const k=String(e.key||'').toLowerCase(),open=(e.altKey&&k==='k')||((e.ctrlKey||e.metaKey)&&(k==='k'||k==='/'||e.code==='Slash'));if(open){e.preventDefault();e.stopPropagation();openPalette()}if(e.key==='Escape'){closePalette();closeMore();closeAppearance();tourStop=true;try{speechSynthesis.cancel()}catch(_){}}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-go="more"],#bn-more,[data-kosif-more]');if(b){e.preventDefault();e.stopImmediatePropagation();openMore()}},true);
 document.addEventListener('change',e=>{const el=e.target;if(el?.matches?.('input[type="file"]')&&el.files?.length)writeDocMeta([...el.files])},true);
 window.addEventListener('kosif-ai-gate-change',()=>wrapContinuity());
}
window.KosifHistoryContinuity={version:'36.3',openMore,openPalette,openAppearance,startTour,setFontScale,structuredBrief,exportBrief,hardRefresh,docsUnavailable};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
