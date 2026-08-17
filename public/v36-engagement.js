/* Kosif v36.3 — engagement acceptance, quality and reporting-framework readiness */
(()=>{'use strict';
const KEY='kosif_engagement_governance_v36_3';
const $=s=>document.querySelector(s);
const defaults={acceptance:false,continuance:false,independence:false,conflicts:false,isa210:false,isa220:false,isqm1:false,listed:false,pie:false,eqcr:'assess',framework:'full-ifrs',jurisdiction:'saudi',fraudDiscussion:false,significantRisks:false,managementIntegrity:false,notes:''};
function load(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return{...defaults}}}
function save(v){localStorage.setItem(KEY,JSON.stringify(v));window.dispatchEvent(new CustomEvent('kosif-engagement-change',{detail:evaluate(v)}))}
function evaluate(v=load()){
 const core=['acceptance','continuance','independence','conflicts','isa210','isa220','isqm1','fraudDiscussion','significantRisks','managementIntegrity'];
 const done=core.filter(k=>!!v[k]).length,total=core.length;
 const listedOrPie=!!(v.listed||v.pie),eqcrResolved=!listedOrPie||['required','not-required','completed'].includes(v.eqcr);
 const gaps=[];
 if(!v.acceptance)gaps.push('توثيق قبول الارتباط');
 if(!v.continuance)gaps.push('توثيق الاستمرار/الاستمرارية');
 if(!v.independence)gaps.push('إقرار الاستقلال');
 if(!v.conflicts)gaps.push('فحص تعارض المصالح');
 if(!v.isa210)gaps.push('شروط الارتباط — ISA 210');
 if(!v.isa220)gaps.push('إدارة جودة الارتباط — ISA 220');
 if(!v.isqm1)gaps.push('ربط سياسات إدارة الجودة — ISQM 1');
 if(!v.fraudDiscussion)gaps.push('مناقشة مخاطر الغش');
 if(!v.significantRisks)gaps.push('توثيق المخاطر المهمة');
 if(!v.managementIntegrity)gaps.push('تقييم نزاهة الإدارة');
 if(!eqcrResolved)gaps.push('حسم متطلب مراجعة جودة الارتباط EQCR');
 return{score:Math.round((done+(eqcrResolved?1:0))/(total+1)*100),ready:gaps.length===0,gaps,listedOrPie,eqcrResolved,framework:v.framework,jurisdiction:v.jurisdiction,values:v,advisory:true};
}
function html(v){const c=(id,label,ref='')=>`<label class="k363-check"><input type="checkbox" data-eg="${id}" ${v[id]?'checked':''}><span><b>${label}</b>${ref?`<small>${ref}</small>`:''}</span></label>`;return `
<div class="card" id="kosif-engagement-readiness"><div class="card-h"><h2>جاهزية الارتباط والحوكمة</h2><span class="hint">أداة تخطيط وتوثيق — لا تُصدر رأيًا أو تأكيد امتثال تلقائيًا</span><span class="spacer"></span><span class="badge mut" id="eg-score">—</span></div>
<div class="grid g2 k363-check-grid">
${c('acceptance','قبول الارتباط','توثيق القبول قبل بدء العمل')}${c('continuance','استمرار العلاقة/الارتباط','قرار الاستمرار موثق')}${c('managementIntegrity','نزاهة الإدارة','تقييم أولي ومبرراته')}${c('independence','الاستقلال','إقرار وفحص التهديدات والضمانات')}${c('conflicts','تعارض المصالح','بحث وتوثيق النتيجة')}${c('isa210','شروط الارتباط','ISA 210')}${c('isa220','إدارة جودة الارتباط','ISA 220')}${c('isqm1','سياسات إدارة الجودة بالمكتب','ISQM 1')}${c('fraudDiscussion','مناقشة مخاطر الغش','ISA 240')}${c('significantRisks','المخاطر المهمة','تحديد وربط الاستجابات')}${c('listed','منشأة مدرجة','يؤثر في متطلبات الجودة/التقرير')}${c('pie','منشأة ذات مصلحة عامة PIE','حسب الولاية والمتطلبات المطبقة')}
</div>
<div class="grid g3" style="margin-top:14px"><div class="field"><label>إطار التقرير المالي</label><select data-eg="framework"><option value="full-ifrs" ${v.framework==='full-ifrs'?'selected':''}>IFRS الكامل</option><option value="ifrs-smes" ${v.framework==='ifrs-smes'?'selected':''}>IFRS for SMEs</option><option value="local-other" ${v.framework==='local-other'?'selected':''}>إطار محلي/آخر — يحتاج توثيق</option></select></div><div class="field"><label>الولاية</label><select data-eg="jurisdiction"><option value="saudi" ${v.jurisdiction==='saudi'?'selected':''}>السعودية — SOCPA أولًا</option><option value="international" ${v.jurisdiction==='international'?'selected':''}>دولي</option><option value="other" ${v.jurisdiction==='other'?'selected':''}>ولاية أخرى — تحتاج مصادر محلية</option></select></div><div class="field"><label>مراجعة جودة الارتباط EQCR</label><select data-eg="eqcr"><option value="assess" ${v.eqcr==='assess'?'selected':''}>تحتاج تقييم</option><option value="required" ${v.eqcr==='required'?'selected':''}>مطلوبة</option><option value="not-required" ${v.eqcr==='not-required'?'selected':''}>غير مطلوبة — موثق</option><option value="completed" ${v.eqcr==='completed'?'selected':''}>مطلوبة واكتملت</option></select></div></div>
<div class="field" style="margin-top:14px"><label>ملاحظات القبول والجودة</label><textarea data-eg="notes" placeholder="وثّق الاستنتاجات، التهديدات، الضمانات، مسؤول الجودة أو أي قرار مهني…">${String(v.notes||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</textarea></div>
<div id="eg-gaps" class="note warn" style="margin-top:12px"></div></div>`}
function mount(){let host=$('#view-governance');if(!host)host=$('#view-settings');if(!host)return false;if($('#kosif-engagement-readiness'))return true;host.insertAdjacentHTML('afterbegin',html(load()));bind();render();return true}
function bind(){document.querySelectorAll('#kosif-engagement-readiness [data-eg]').forEach(el=>{const evt=el.type==='checkbox'?'change':'input';el.addEventListener(evt,()=>{const v=load(),k=el.dataset.eg;v[k]=el.type==='checkbox'?el.checked:el.value;save(v);render()})})}
function render(){const r=evaluate(),s=$('#eg-score'),g=$('#eg-gaps');if(s){s.textContent=r.score+'%';s.className='badge '+(r.ready?'ok':r.score>=65?'warn':'mut')}if(g){g.className='note '+(r.ready?'ok':'warn');g.innerHTML=r.ready?'<span>✓</span><span><b>اكتملت عناصر الجاهزية المسجلة.</b> هذا لا يعني تلقائيًا أن الارتباط أو التقرير امتثل لكل المتطلبات؛ الحكم النهائي للمراجع.</span>':'<span>!</span><span><b>بنود ما زالت تحتاج توثيقًا:</b> '+r.gaps.join(' · ')+'</span>'}}
function more(){const grid=$('#kosif-more .kosif-sheet-grid');if(!grid||$('#kosif-engagement-open'))return false;const b=document.createElement('button');b.id='kosif-engagement-open';b.className='kosif-action';b.innerHTML='جاهزية الارتباط والجودة<small>ISA 210 · ISA 220 · ISQM 1 · EQCR · PIE</small>';b.onclick=()=>{try{go($('#view-governance')?'governance':'settings')}catch(_){}$('#kosif-more')?.classList.remove('show');setTimeout(()=>$('#kosif-engagement-readiness')?.scrollIntoView({block:'start'}),80)};grid.appendChild(b);return true}
function init(){let n=0;const t=setInterval(()=>{const a=mount(),b=more();if((a&&b)||++n>120)clearInterval(t)},100)}
window.KosifEngagementGovernance={version:'36.3',load,evaluate,mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
