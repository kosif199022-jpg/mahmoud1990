/* Kosif v36.3.1 — historical requirements integration bridge
 * Enhances the existing v36.3 shell. It never creates a second More/command/font system.
 */
(()=>{'use strict';
const VERSION='36.3.1',DOC_KEY='kosif_session_doc_meta_v36_3_1',PAGE_ID=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random();
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function stateRef(){try{return typeof state!=='undefined'?state:null}catch{return null}}
function company(){try{return window.KosifContinuity?.companyName?.()||stateRef()?.entity?.name||'الارتباط الحالي'}catch{return'الارتباط الحالي'}}
function toast2(t,k='ok'){try{if(typeof toast==='function')return toast(t,k)}catch(_){}console.log('[Kosif]',t)}

/* Evidence availability is page-instance scoped. File metadata may survive reload; file bytes never do. */
function loadDocMeta(){try{return JSON.parse(localStorage.getItem(DOC_KEY)||'null')}catch{return null}}
function rememberFiles(files){const docs=[...(files||[])].filter(Boolean).map(f=>({name:String(f.name||'مستند'),type:String(f.type||''),size:Number(f.size)||0,lastModified:Number(f.lastModified)||0}));if(!docs.length)return null;const rec={pageId:PAGE_ID,savedAt:new Date().toISOString(),company:company(),docs};localStorage.setItem(DOC_KEY,JSON.stringify(rec));hideDocWarning();return rec}
function docsUnavailable(){const m=loadDocMeta();return !!(m?.docs?.length&&m.pageId!==PAGE_ID)}
function continuityWarningText(){const m=loadDocMeta();if(!m?.docs?.length)return'';return '[استمرارية الأدلة] توجد أسماء مستندات من جلسة سابقة، لكن بايتات الملفات نفسها غير متاحة بعد إعادة تحميل الصفحة. المستندات: '+m.docs.map(x=>x.name).join('، ')+'. لا تدّعِ رؤية محتواها الآن، ولا تبنِ استنتاجًا جديدًا عليها حتى يعيد المستخدم اختيارها أو رفعها.'}
function showDocWarning(){if(!docsUnavailable()||$('#kosif-evidence-reload-warning'))return;const m=loadDocMeta(),x=document.createElement('div');x.id='kosif-evidence-reload-warning';x.innerHTML=`<div><b>⚠️ الأدلة السابقة تحتاج إعادة اختيار</b><span>${esc((m?.docs||[]).map(x=>x.name).slice(0,5).join(' · '))}${(m?.docs||[]).length>5?' …':''}</span></div><button type="button">فهمت</button>`;x.querySelector('button').onclick=()=>x.remove();document.body.appendChild(x)}
function hideDocWarning(){$('#kosif-evidence-reload-warning')?.remove()}

function pbcStats(s){const src=s?.v36?.pbc||s?.pbc||{};const arr=Array.isArray(src)?src:Object.values(src||{}),out={};for(const x of arr){const k=String(x?.status||'Missing');out[k]=(out[k]||0)+1}return out}
function structuredBrief(){const s=stateRef()||{},rounds=Array.isArray(s.rounds)?s.rounds:[],notes=Array.isArray(s?.v36?.notes)?s.v36.notes:[],accounts=Array.isArray(s?.tb?.accounts)?s.tb.accounts.length:0;return{schema:'kosif-audit-brief/v1',generatedAt:new Date().toISOString(),company:company(),entity:s.entity||{},trialBalanceAccounts:accounts,recentRounds:rounds.slice(-8).map(r=>({round:r.no??r.round??'',status:r.parsed?.status||r.status||'',findings:Array.isArray(r.parsed?.findings)?r.parsed.findings.length:0,requests:Array.isArray(r.parsed?.pbc_requests)?r.parsed.pbc_requests.length:0})),pbc:pbcStats(s),reviewerNotes:notes.slice(-12).map(x=>typeof x==='string'?x:(x?.text||x?.note||'')).filter(Boolean),reportIssued:!!s.report,documentsAvailableThisPage:!docsUnavailable(),documentMetadata:loadDocMeta()?.docs||[]}}
function briefMessage(){return '[ملف مراجعة مهيكل من Kosif — للاستمرارية وتقليل إعادة إرسال السجل الخام]\n'+JSON.stringify(structuredBrief())}
function userMessage(text){return{role:'user',parts:[{text}]}}
function compactContents(contents){if(!Array.isArray(contents))return contents;let out=contents;const compatible=contents.every(x=>x&&typeof x==='object'&&typeof x.role==='string');if(compatible&&contents.length>28)out=[...contents.slice(0,2),userMessage(briefMessage()),...contents.slice(-18)];if(compatible&&docsUnavailable())out=[...out,userMessage(continuityWarningText())];return out}
function wrapAI(){
 try{if(typeof window.callAI==='function'&&!window.callAI.__kosifHistoryBridge){const base=window.callAI;const fn=function(contents,opts){return base.call(this,compactContents(contents),opts)};fn.__kosifHistoryBridge=true;window.callAI=fn;try{callAI=fn}catch(_){}}}catch(_){}
 try{if(typeof window.callGemini==='function'&&!window.callGemini.__kosifHistoryBridge){const base=window.callGemini;const fn=function(contents,opts){return base.call(this,compactContents(contents),opts)};fn.__kosifHistoryBridge=true;window.callGemini=fn;try{callGemini=fn}catch(_){}}}catch(_){}
 try{if(typeof window.fileToParts==='function'&&!window.fileToParts.__kosifHistoryBridge){const base=window.fileToParts;const fn=async function(input,...rest){const arr=input instanceof FileList?[...input]:Array.isArray(input)?input.filter(x=>x instanceof File):(input instanceof File?[input]:[]);if(arr.length)rememberFiles(arr);return base.call(this,input,...rest)};fn.__kosifHistoryBridge=true;window.fileToParts=fn;try{fileToParts=fn}catch(_){}}}catch(_){}
}
function exportBrief(){const text='# Kosif — ملف مراجعة مهيكل\n\n```json\n'+JSON.stringify(structuredBrief(),null,2)+'\n```\n',a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));a.href=u;a.download='kosif-audit-brief-'+new Date().toISOString().slice(0,10)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);toast2('تم تصدير ملف المراجعة المهيكل')}

/* Uses the existing single More sheet. */
function action(label,small,id,onclick){if($('#'+id))return;const grid=$('#kosif-more .kosif-sheet-grid');if(!grid)return;const b=document.createElement('button');b.id=id;b.type='button';b.className='kosif-action kosif-history-action';b.innerHTML=`${label}<small>${small}</small>`;b.onclick=onclick;grid.appendChild(b)}
function closeMore(){$('#kosif-more')?.classList.remove('show')}
function augmentMore(){
 const grid=$('#kosif-more .kosif-sheet-grid');if(!grid)return false;
 action('الشركات','اختيار الشركة النشطة وإدارة النسخ العامة والمشفرة','kosif-history-companies',()=>{closeMore();try{if(typeof openCompanies==='function')return openCompanies()}catch(_){}$('#kosif-company-sheet')?.classList.add('show')});
 action('جولة تعريفية صوتية','شرح مسار المراجعة خطوة بخطوة','kosif-history-tour',()=>{closeMore();startTour()});
 action('تصدير ملف المراجعة','ملخص مهيكل للجولات والمطالبات والملاحظات','kosif-history-brief',()=>{closeMore();exportBrief()});
 return true
}
function watchMore(){let n=0,t=setInterval(()=>{augmentMore();if(++n>80)clearInterval(t)},150);const root=$('#kosif-more');if(root)new MutationObserver(()=>augmentMore()).observe(root,{childList:true,subtree:true})}

/* Browser-safe command shortcuts. Ctrl/Cmd+K remains supported by the legacy handler when the host/browser passes it through. */
function openCommandsSafe(){try{if(typeof openCommands==='function')return openCommands()}catch(_){}$('#kosif-command')?.click()}
function shortcuts(){document.addEventListener('keydown',e=>{const k=String(e.key||'').toLowerCase();if((e.altKey&&k==='k')||((e.ctrlKey||e.metaKey)&&(k==='/'||e.code==='Slash'))){e.preventDefault();e.stopImmediatePropagation();openCommandsSafe()}},true)}

const TOUR=[['overview','الرئيسية','ابدأ من ملف الارتباط وتأكد من الشركة النشطة وحالة المهمة.'],['tb','ميزان المراجعة','استورد الميزان، ثم راجع الاتزان والمخاطر والمعايير المرتبطة بالحسابات.'],['rounds','الجولات','نفّذ جولات المراجعة، واطلب الأدلة الإضافية عند الحاجة، ولا تعتمد استنتاج الذكاء الاصطناعي دون مراجعة بشرية.'],['pbc','المطالبات','تابع المستندات المطلوبة وحالاتها من مفقود إلى مقبول أو يحتاج استيضاحًا.'],['analytics','التحليلات','استخدم الاختبارات الحتمية وتحليلات القيود والمبيعات والتكاليف كمؤشرات مراجعة قابلة لإعادة التنفيذ.'],['council','مجلس المراجعين','بعد اختبار اتصالات AI يمكن تشغيل مراجعين مستقلين وحفظ الاختلافات والإجماع.'],['outputs','المخرجات','راجع التسويات والميزان المعدّل والتقارير والمخرجات قبل الاعتماد النهائي.']];
let tourStop=false;
function tourCard(title,text){let x=$('#kosif-history-tour-card');if(!x){x=document.createElement('div');x.id='kosif-history-tour-card';x.innerHTML='<div><b></b><p></p></div><button type="button">إيقاف</button>';x.querySelector('button').onclick=()=>{tourStop=true;try{speechSynthesis.cancel()}catch(_){}x.classList.remove('show')};document.body.appendChild(x)}x.querySelector('b').textContent=title;x.querySelector('p').textContent=text;x.classList.add('show');return x}
async function startTour(){tourStop=false;for(const [route,title,text] of TOUR){if(tourStop)break;try{if(typeof go==='function')go(route)}catch(_){}await delay(300);tourCard(title,text);if('speechSynthesis'in window){await new Promise(resolve=>{try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ar-SA';u.rate=.95;u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)}catch(_){resolve()}})}else await delay(1800)}$('#kosif-history-tour-card')?.classList.remove('show')}

function init(){wrapAI();setTimeout(wrapAI,700);setTimeout(wrapAI,2200);watchMore();shortcuts();showDocWarning();document.addEventListener('change',e=>{const x=e.target;if(x?.matches?.('input[type=file]')&&x.files?.length)rememberFiles([...x.files])},true);window.addEventListener('kosif-view-change',()=>augmentMore())}
window.KosifHistoricalBridge={version:VERSION,structuredBrief,exportBrief,docsUnavailable,rememberFiles,compactContents,startTour,augmentMore};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
