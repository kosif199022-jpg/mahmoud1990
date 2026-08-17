/* Kosif v36.3 — voice guide: where to start, work/problem summary, spoken navigation */
(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let lastText='',rec=null,listening=false;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stateRef(){try{return typeof state!=='undefined'?state:null}catch{return null}}
function company(){const s=stateRef();return String(s?.entity?.name||$('#pill-entity')?.textContent||'').replace(/\s+/g,' ').trim()}
function accounts(){return stateRef()?.tb?.accounts||[]}
function rounds(){return stateRef()?.rounds||[]}
function notes(){return stateRef()?.v36?.notes||[]}
function pbc(){const v=stateRef()?.v36?.pbc||{};return Object.values(v)}
function findings(){return rounds().flatMap(r=>r?.parsed?.findings||[])}
function report(){return stateRef()?.report||null}
function engagement(){try{return window.KosifEngagementGovernance?.evaluate?.()||null}catch{return null}}
function aiState(){const p=$('#kosif-ai-status');return p?.dataset?.state||(/متصل/.test(p?.textContent||'')?'connected':'locked')}
function openPbcCount(){return pbc().filter(x=>!['Accepted','Received'].includes(String(x?.status||''))).length}
function highRiskCount(){return findings().filter(x=>/جوهري|مرتفع|high|critical/i.test(String(x?.severity||''))).length}
function nextStep(){
 const n=company(),e=engagement(),a=accounts(),pb=openPbcCount(),rs=rounds(),rp=report();
 if(!n||/لم تُحد|اختر/.test(n))return{view:'settings',title:'ابدأ ببيانات المنشأة',text:'ابدأ من الإعدادات وحدد المنشأة والفترة والإطار المحاسبي وطبيعة الكيان قبل أي تحليل.'};
 if(e&&!e.ready)return{view:$('#view-governance')?'governance':'settings',title:'استكمل جاهزية الارتباط',text:`قبل بدء الاختبارات، استكمل جاهزية الارتباط. يوجد ${e.gaps.length} بند غير مكتمل، وأولها: ${e.gaps.slice(0,3).join('، ')}.`};
 if(!a.length)return{view:'tb',title:'حمّل ميزان المراجعة',text:'الخطوة التالية هي استيراد ميزان المراجعة، مراجعة الأعمدة ثم اعتماد الميزان قبل الجولات.'};
 if(pb>0)return{view:'pbc',title:'استكمل المستندات المطلوبة',text:`يوجد ${pb} طلب مستند أو دليل ما زال يحتاج متابعة. افتح المطالبات وحدد ما استلم وما يحتاج استيضاح.`};
 if(!rs.length)return{view:'rounds',title:'ابدأ الجولة الأولى',text:'الميزان جاهز ولا توجد جولات بعد. ابدأ الجولة الأولى بعد التأكد من الأهمية النسبية ومخاطر الارتباط.'};
 if(!rp)return{view:'rounds',title:'استكمل جولات المراجعة',text:`تم تنفيذ ${rs.length} جولة، لكن التقرير النهائي غير موجود بعد. راجع النتائج والمستندات الناقصة ثم أكمل الجولة التالية.`};
 return{view:'outputs',title:'راجع المخرجات واعتمد القرار البشري',text:'التقرير موجود. راجع النتائج وقيود التسوية والمخرجات ثم نفّذ الاعتماد أو الرفض البشري قبل إغلاق العمل.'};
}
function summary(){const e=engagement(),a=accounts(),rs=rounds(),f=findings(),pb=openPbcCount(),n=notes(),rp=report(),hi=highRiskCount();return `ملخص Kosif${company()?` لمنشأة ${company()}`:''}: الميزان يحتوي على ${a.length} حساب. تم تنفيذ ${rs.length} جولة مراجعة. توجد ${f.length} ملاحظة أو نتيجة، منها ${hi} عالية الخطورة. طلبات الأدلة المفتوحة ${pb}. ملاحظات المراجع البشري ${n.length}. جاهزية الارتباط ${e?e.score+' بالمئة':'غير محسوبة'}. ${rp?'التقرير متاح للمراجعة البشرية.':'لم يصدر التقرير النهائي بعد.'}`}
function problems(){const e=engagement(),f=findings(),pb=openPbcCount(),hi=highRiskCount(),parts=[];if(e&&!e.ready)parts.push(`جاهزية الارتباط ناقصة في ${e.gaps.length} بند`);if(pb)parts.push(`${pb} طلب مستند أو دليل مفتوح`);if(hi)parts.push(`${hi} نتيجة عالية الخطورة`);if(f.length&&!hi)parts.push(`${f.length} نتيجة تحتاج مراجعة`);if(aiState()!=='connected')parts.push('الذكاء الاصطناعي غير متصل اتصالًا مختبرًا حاليًا');return parts.length?'المشاكل أو نقاط المتابعة الحالية: '+parts.join('، ')+'.':'لا تظهر نقاط متابعة مفتوحة من الحالة الحالية. راجع الحكم المهني قبل الإغلاق.'}
function speak(text){text=String(text||'').trim();if(!text)return;lastText=text;if(!('speechSynthesis'in window)){status('القراءة الصوتية غير مدعومة في هذا المتصفح');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ar-SA';u.rate=.96;const vs=speechSynthesis.getVoices?.()||[];u.voice=vs.find(v=>/^ar(-|_)/i.test(v.lang)&&/SA|Saudi/i.test(v.lang+' '+v.name))||vs.find(v=>/^ar/i.test(v.lang))||null;u.onstart=()=>status('يقرأ الآن…');u.onend=()=>status('جاهز');u.onerror=()=>status('تعذر تشغيل الصوت');speechSynthesis.speak(u);renderText(text)}
function renderText(text){const x=$('#kvg-answer');if(x)x.textContent=text;lastText=text}
function status(t){const x=$('#kvg-status');if(x)x.textContent=t;const l=$('#kosif-live-region');if(l)l.textContent=t}
function goTo(v){try{if(typeof go==='function')go(v)}catch(_){}close()}
function interpret(raw){const t=String(raw||'').trim();renderText('سمعت: '+t);if(!t)return;
 if(/ابدأ|أبدأ|منين|الخطوة|التالي/.test(t)){const n=nextStep();speak(n.title+'. '+n.text);return}
 if(/ملخص|الشغل|الوضع/.test(t)){speak(summary());return}
 if(/مشك|خطر|ملاحظ|ناقص/.test(t)){speak(problems());return}
 if(/الرئيس|نظرة/.test(t)){goTo('overview');return}
 if(/ميزان/.test(t)){goTo('tb');return}
 if(/جول/.test(t)){goTo('rounds');return}
 if(/مطالب|مستند|دليل/.test(t)){goTo('pbc');return}
 if(/مراجع.*ملاحظ|ملاحظ.*مراجع/.test(t)){goTo('reviewer');return}
 if(/تقرير|مخرج/.test(t)){goTo('outputs');return}
 if(/معيار|مكتبة/.test(t)){goTo('library');return}
 if(/إعداد|اعداد/.test(t)){goTo('settings');return}
 if(/قف|اسكت|إيقاف|ايقاف/.test(t)){try{speechSynthesis.cancel()}catch(_){}status('تم إيقاف الصوت');return}
 speak('أقدر أساعدك صوتيًا في: ابدأ منين، ملخص الشغل، المشاكل المفتوحة، والانتقال إلى الميزان والجولات والمطالبات والملاحظات والتقرير والمكتبة.')}
function listen(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){status('التحدث إلى المساعد غير مدعوم في هذا المتصفح');return}if(listening){try{rec?.stop()}catch(_){}return}rec=new R();rec.lang='ar-SA';rec.interimResults=false;rec.continuous=false;rec.onstart=()=>{listening=true;status('أسمعك الآن…');$('#kvg-mic')?.classList.add('primary')};rec.onend=()=>{listening=false;status('جاهز');$('#kvg-mic')?.classList.remove('primary')};rec.onerror=e=>{listening=false;status('تعذر الاستماع: '+(e.error||'خطأ'))};rec.onresult=e=>interpret(e.results?.[0]?.[0]?.transcript||'');rec.start()}
function ui(){if($('#kosif-voice-guide'))return;document.body.insertAdjacentHTML('beforeend',`<div id="kosif-voice-guide" class="kvg-bg" role="dialog" aria-modal="true" aria-labelledby="kvg-title" aria-hidden="true"><div class="kvg-sheet"><button class="kosif-close" id="kvg-close" aria-label="إغلاق">✕</button><h3 id="kvg-title">المساعد الصوتي · دليل المراجع</h3><p class="hint">يقرأ حالة ملفك الحالية ويقول لك تبدأ منين. الحسابات والأرقام تُقرأ من محرك Kosif الحتمي؛ الصوت لا يحوّل رأيًا آليًا إلى قرار مهني.</p><div class="kvg-actions"><button class="btn primary" id="kvg-next">ابدأ منين؟</button><button class="btn ghost" id="kvg-summary">ملخص الشغل</button><button class="btn ghost" id="kvg-problems">المشاكل المفتوحة</button><button class="btn ghost" id="kvg-mic">🎙 تكلم مع Kosif</button><button class="btn ghost" id="kvg-repeat">🔊 اقرأ الرد</button><button class="btn danger" id="kvg-stop">■ إيقاف الصوت</button></div><div id="kvg-answer" class="note info" aria-live="polite">اسأل: «ابدأ منين؟» أو «ملخص الشغل» أو «المشاكل».</div><div id="kvg-status" class="hint" aria-live="polite">جاهز</div></div></div>`);
 const css=document.createElement('style');css.id='kvg-style';css.textContent=`.kvg-bg{position:fixed;inset:0;z-index:2147483300;background:rgba(15,23,42,.46);display:none;align-items:flex-end;justify-content:center;padding:14px}.kvg-bg.show{display:flex}.kvg-sheet{width:min(720px,100%);max-height:88dvh;overflow:auto;background:var(--surface,#fff);color:var(--ink,#111827);border:1px solid var(--line,#ddd);border-radius:22px;padding:20px;box-shadow:0 28px 80px rgba(15,23,42,.26);position:relative}.kvg-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.kvg-sheet .kosif-close{position:absolute;top:12px;inset-inline-end:12px}.kvg-sheet h3{padding-inline-end:42px}@media(min-width:800px){.kvg-bg{align-items:center}}`;document.head.appendChild(css);
 $('#kvg-close').onclick=close;$('#kosif-voice-guide').onclick=e=>{if(e.target.id==='kosif-voice-guide')close()};$('#kvg-next').onclick=()=>{const n=nextStep();speak(n.title+'. '+n.text)};$('#kvg-summary').onclick=()=>speak(summary());$('#kvg-problems').onclick=()=>speak(problems());$('#kvg-mic').onclick=listen;$('#kvg-repeat').onclick=()=>speak(lastText||summary());$('#kvg-stop').onclick=()=>{try{speechSynthesis.cancel()}catch(_){}status('تم إيقاف الصوت')};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#kosif-voice-guide')?.classList.contains('show'))close()})}
function open(){ui();const x=$('#kosif-voice-guide');x.classList.add('show');x.setAttribute('aria-hidden','false');setTimeout(()=>$('#kvg-next')?.focus(),20)}
function close(){try{rec?.stop()}catch(_){}const x=$('#kosif-voice-guide');if(x){x.classList.remove('show');x.setAttribute('aria-hidden','true')}}
function more(){const g=$('#kosif-more .kosif-sheet-grid');if(!g||$('#kosif-voice-guide-open'))return false;const b=document.createElement('button');b.id='kosif-voice-guide-open';b.className='kosif-action';b.innerHTML='المساعد الصوتي<small>ابدأ منين · ملخص الشغل · تكلم مع Kosif</small>';b.onclick=()=>{open();$('#kosif-more')?.classList.remove('show')};g.appendChild(b);return true}
function init(){ui();let i=0,t=setInterval(()=>{if(more()||++i>120)clearInterval(t)},100);if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=()=>{} }
window.KosifVoiceGuide={version:'36.3-history',open,close,nextStep,summary,problems,speak,listen,interpret};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
