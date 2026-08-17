/* Kosif v36 Consolidated Native Features
 * Restores capabilities that had depended on removed v5/v6 runtime layers.
 * Operates on the canonical legacy audit state; no duplicate engagement store.
 */
(()=>{'use strict';
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number(String(v??0).replace(/[،,\s]/g,''))||0;
const fmt=v=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(num(v));
const now=()=>new Date().toISOString();
const V36_KEY='kosif_v36_workspace_v1';
function store(){try{return JSON.parse(localStorage.getItem(V36_KEY)||'{}')}catch{return{}}}
function persist(){try{localStorage.setItem(V36_KEY,JSON.stringify(v36()))}catch(_){}}
function v36(){
  if(typeof state==='undefined') return store();
  const saved=store();
  state.v36=Object.assign({
    acceptance:{accepted:false,independence:false,conflicts:false,clientIntegrity:false,terms:false,at:null,note:''},
    pbc:{},notes:[],priorTB:[],materialityLog:[],journals:[],journalFlags:[],templates:[],riskRegister:[]
  },saved,state.v36||{});
  return state.v36;
}
function saveV36(){persist();try{if(typeof save==='function')save()}catch(_){}}
function toastV(msg,type='ok'){try{if(typeof toast==='function')toast(msg,type);else console.log(msg)}catch(_){console.log(msg)}}
function bal(a){if(Number.isFinite(+a.balance))return +a.balance;return num(a.debit)-num(a.credit)}
function code(a){return a.code||a.accountCode||a.account_no||a.account||''}
function name(a){return a.name||a.accountName||a.title||''}
function debit(a){return num(a.debit)} function credit(a){return num(a.credit)}
function accounts(){try{return state.tb.accounts||[]}catch{return[]}}
function rounds(){try{return state.rounds||[]}catch{return[]}}
function report(){try{return state.report||null}catch{return null}}
function ensureCoreCompat(){
  if(typeof refreshTop==='function'&&!refreshTop.__v36){
    refreshTop=function(){
      const e=q('#pill-entity');if(e)e.textContent=state.entity.name?`${state.entity.name} · ${state.entity.period||'فترة غير محددة'}${state.demo?' · عرض توضيحي':''}`:'لم تُحدَّد المنشأة بعد';
      const ok=(()=>{try{return !!getKey()}catch{return false}})();
      const d=q('#api-dot');if(d)d.className='dot '+(ok?'on':'off');
      const t=q('#api-txt');if(t)t.textContent=ok?`Gemini جاهز · ${typeof getModel==='function'?getModel():''}`:'مفتاح Gemini غير مضبوط';
      const n=rounds().length,rt=q('#round-txt');if(rt)rt.textContent=state.report?'صدر التقرير النهائي':n?`أُنجزت ${n} ${n===1?'جولة':'جولات'}`:'قبل بدء الجولات';
      const nm=q('#n-map');if(nm)nm.textContent=accounts().length;
      const nr=q('#n-rounds');if(nr)nr.textContent=n;
      const rp=q('#rounds-model');if(rp&&!/AI:/.test(rp.textContent||''))rp.textContent='النموذج: '+(typeof getModel==='function'?getModel():'—');
      const ob=q('#ov-basis');if(ob)ob.textContent='الأساس: '+(state.entity.framework==='sme'?'معيار المنشآت الصغيرة والمتوسطة':'المعايير الدولية كما اعتمدتها الهيئة');
    }; refreshTop.__v36=true;
  }
}
function ensureViews(){
  const main=q('main'); if(!main)return;
  const before=q('#view-outputs')||main.lastElementChild;
  const add=(id,html)=>{let x=q('#'+id);if(!x){x=document.createElement('section');x.id=id;x.dataset.view=id.replace(/^view-/,'');main.insertBefore(x,before)}if(x.dataset.v36Mounted!=='1'){x.insertAdjacentHTML('beforeend',html);x.dataset.v36Mounted='1'}};
  add('view-analytics',`<div class="card"><div class="card-h"><h2>التحليلات واختبارات المراجعة</h2><span class="hint">تحليلات حتمية قابلة لإعادة التنفيذ — لا تعتمد على AI</span></div><div id="v36-analytics"></div></div><div class="card"><div class="card-h"><h3>اختبار قيود اليومية · ISA 240</h3><span class="hint">CSV/TSV: التاريخ، رقم القيد، الحساب، الوصف، مدين، دائن، المستخدم</span></div><textarea id="v36-je-paste" placeholder="التاريخ\tرقم القيد\tالحساب\tالوصف\tمدين\tدائن\tالمستخدم"></textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn primary sm" id="v36-je-run">تحليل القيود</button><button class="btn ghost sm" id="v36-je-sample">عينة مراجعة ISA 530</button></div><div id="v36-je-out"></div></div><div class="card"><div class="card-h"><h3>سجل المخاطر والتأكيدات</h3></div><div id="v36-risk-register"></div></div>`);
  add('view-pbc',`<div class="card"><div class="card-h"><h2>مركز المطالبات والمستندات · PBC</h2><span class="hint">Missing / Requested / Received / Under Review / Accepted / Rejected / Need Clarification</span><span class="spacer"></span><span class="badge mut" id="n-pbc-v36">0</span></div><div id="v36-pbc"></div></div>`);
  add('view-reviewer',`<div class="card"><div class="card-h"><h2>ملاحظات المراجع</h2><span class="hint">تُحفظ محليًا مع ملف الارتباط وتدخل في الجولة التالية</span></div><textarea id="v36-note" placeholder="اكتب ملاحظة، استفسار إدارة، نقطة متابعة أو استنتاج مراجعة…"></textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn primary sm" id="v36-note-add">إضافة الملاحظة</button><button class="btn ghost sm" id="v36-note-dictate">🎙 إملاء صوتي</button></div><div id="v36-notes"></div></div><div class="card"><div class="card-h"><h3>قوالب أوراق العمل</h3><span class="spacer"></span><button class="btn ghost sm" id="v36-template-new">＋ قالب خاص</button></div><div id="v36-templates"></div></div>`);
}
function ensureAcceptance(){
  const settings=q('#view-settings');if(!settings||q('#v36-acceptance'))return;
  const card=document.createElement('div');card.className='card';card.id='v36-acceptance';
  card.innerHTML=`<div class="card-h"><h2>قبول واستمرار الارتباط</h2><span class="hint">بوابة مهنية قبل تشغيل جولات المراجعة</span></div><div class="grid g2"><label class="note info"><input type="checkbox" id="v36-ind"> <span><b>الاستقلال</b><br>تم تقييم الاستقلال والتهديدات والإجراءات الوقائية.</span></label><label class="note info"><input type="checkbox" id="v36-conf"> <span><b>تعارض المصالح</b><br>تم فحص التعارضات والعلاقات ذات الصلة.</span></label><label class="note info"><input type="checkbox" id="v36-int"> <span><b>نزاهة العميل</b><br>تم تقييم خلفية الإدارة وأسباب قبول/استمرار العميل.</span></label><label class="note info"><input type="checkbox" id="v36-terms"> <span><b>شروط الارتباط</b><br>تم توثيق النطاق والمسؤوليات وشروط الارتباط.</span></label></div><div class="field"><label>ملاحظة القبول / الاستمرار</label><textarea id="v36-accept-note" style="min-height:72px"></textarea></div><button class="btn primary" id="v36-accept-save">اعتماد قرار القبول/الاستمرار</button><div id="v36-accept-state"></div>`;
  settings.insertBefore(card,settings.firstElementChild);
}
function ensurePriorAndMateriality(){
  const tb=q('#view-tb');if(tb&&!q('#v36-prior-card')){const c=document.createElement('div');c.className='card';c.id='v36-prior-card';c.innerHTML=`<div class="card-h"><h3>ميزان السنة السابقة / المقارنة</h3><span class="hint">لاكتشاف الحسابات الجديدة والمختفية والتغيرات غير المعتادة</span></div><input type="file" id="v36-prior-file" accept=".csv,.tsv,.txt,.xlsx,.xls"><div id="v36-prior-out"></div>`;tb.appendChild(c)}
  const s=q('#view-settings');if(s&&!q('#v36-mat-log-card')){const c=document.createElement('div');c.className='card';c.id='v36-mat-log-card';c.innerHTML=`<div class="card-h"><h3>سجل تنقيح الأهمية النسبية</h3><span class="hint">يوثق كل تغيير في الأساس أو النسبة أو القيمة</span></div><div id="v36-mat-log"></div>`;s.appendChild(c)}
}
function ensureOutputs(){const o=q('#view-outputs');if(!o)return;if(!q('#v36-misstatements')){const c=document.createElement('div');c.className='card no-print';c.innerHTML=`<div class="card-h"><h3>جدول التحريفات · ISA 450</h3></div><div id="v36-misstatements"></div>`;o.insertBefore(c,q('#report-holder'))}if(!q('#v36-fs-draft')){const c=document.createElement('div');c.className='card no-print';c.innerHTML=`<div class="card-h"><h3>مسودة القوائم المالية</h3><span class="hint">مسودة تحليلية مبنية على الميزان/التسويات، وتحتاج مراجعة واعتماد بشري</span></div><div id="v36-fs-draft"></div>`;o.insertBefore(c,q('#report-holder'))}}
function renderTB(){
  const w=q('#tb-result');if(!w)return;const a=accounts();if(!a.length){w.innerHTML='';return}
  const totalD=a.reduce((s,x)=>s+debit(x),0),totalC=a.reduce((s,x)=>s+credit(x),0);
  w.innerHTML=`<div class="card"><div class="card-h"><h3>الميزان المعتمد</h3><span class="badge ${Math.abs(totalD-totalC)<.5?'ok':'danger'}">${a.length} حسابًا</span><span class="spacer"></span><span class="badge mut">مدين ${fmt(totalD)}</span><span class="badge mut">دائن ${fmt(totalC)}</span></div><div class="twrap"><table class="data"><thead><tr><th>الحساب</th><th>الاسم</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${a.map(x=>`<tr><td>${h(code(x))}</td><td>${h(name(x))}</td><td>${fmt(debit(x))}</td><td>${fmt(credit(x))}</td><td>${fmt(bal(x))}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function firstDigit(v){const m=String(Math.abs(v)).replace(/[^1-9]/g,'').match(/[1-9]/);return m?+m[0]:0}
function deriveRisks(){
  const out=[];const a=accounts();const abs=a.map(x=>Math.abs(bal(x))).filter(Boolean).sort((x,y)=>y-x);const threshold=abs[Math.min(abs.length-1,Math.floor(abs.length*.1))]||0;
  for(const x of a){const v=bal(x),n=name(x);let score=0,reasons=[];if(Math.abs(v)>=threshold&&threshold){score+=30;reasons.push('رصيد مرتفع')}if(v<0&&/نقد|بنك|مخزون|أصل|مصروف|عميل|ذمم مدينة/.test(n)){score+=35;reasons.push('إشارة غير معتادة')}if(v&&Math.abs(v)%10000===0){score+=15;reasons.push('رقم دائري')}if(/معلق|تسوية|عهدة|سلف|طرف ذي علاقة|أطراف ذات علاقة/.test(n)){score+=25;reasons.push('حساب حساس')}if(score)out.push({area:n||code(x),score:Math.min(score,100),assertions:score>=50?'الوجود · الدقة · العرض':'الدقة · التصنيف',source:'TB',reason:reasons.join('، ')})}
  for(const r of rounds())for(const f of (r.parsed?.findings||[])){out.push({area:f.area||'نتيجة جولة',score:f.severity==='مرتفع'?90:f.severity==='متوسط'?65:35,assertions:'حسب طبيعة البند',source:'Round '+r.no,reason:f.issue||''})}
  try{const extra=window.KosifOperations?.riskItems?.()||[];for(const x of extra)out.push(x)}catch(_){}
  return out.sort((x,y)=>y.score-x.score).slice(0,140);
}
function renderAnalytics(){
  const w=q('#v36-analytics');if(!w)return;const a=accounts();if(!a.length){w.innerHTML='<div class="empty">اعتمد ميزان المراجعة أولًا.</div>';return}
  const vals=a.map(x=>Math.abs(bal(x))).filter(v=>v>0),roundNums=a.filter(x=>Math.abs(bal(x))>=1000&&Math.abs(bal(x))%10000===0),neg=a.filter(x=>bal(x)<0&&/نقد|بنك|مخزون|أصل|مصروف|عميل|ذمم مدينة/.test(name(x))),zeros=a.filter(x=>Math.abs(bal(x))<.01);
  const freq=Array(10).fill(0);vals.forEach(v=>freq[firstDigit(v)]++);const total=vals.length||1;const expected=[0,.301,.176,.125,.097,.079,.067,.058,.051,.046];const dev=[1,2,3,4,5,6,7,8,9].reduce((s,d)=>s+Math.abs(freq[d]/total-expected[d]),0);
  const risks=deriveRisks();v36().riskRegister=risks;persist();
  w.innerHTML=`<div class="grid g4"><div class="kpi"><div class="v">${a.length}</div><div class="l">الحسابات</div></div><div class="kpi"><div class="v">${roundNums.length}</div><div class="l">أرقام دائرية</div></div><div class="kpi"><div class="v">${neg.length}</div><div class="l">أرصدة بإشارة غير معتادة</div></div><div class="kpi"><div class="v">${zeros.length}</div><div class="l">أرصدة صفرية</div></div></div><div class="note ${dev>.35?'warn':'info'}"><span>∑</span><span><b>Benford — مؤشر استكشافي:</b> مجموع الانحراف ${dev.toFixed(3)}. المؤشر لا يثبت وجود تحريف ويُستخدم لتوجيه إجراءات إضافية فقط.</span></div><div class="twrap"><table class="data"><thead><tr><th>الرقم الأول</th><th>فعلي</th><th>متوقع</th></tr></thead><tbody>${[1,2,3,4,5,6,7,8,9].map(d=>`<tr><td>${d}</td><td>${(freq[d]/total*100).toFixed(1)}%</td><td>${(expected[d]*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;
  renderRiskRegister();
}
function renderRiskRegister(){const w=q('#v36-risk-register');if(!w)return;const r=v36().riskRegister||deriveRisks();w.innerHTML=r.length?`<div class="twrap"><table class="data"><thead><tr><th>المجال</th><th>الدرجة</th><th>التأكيدات</th><th>المصدر/السبب</th></tr></thead><tbody>${r.map(x=>`<tr><td>${h(x.area)}</td><td><span class="badge ${x.score>=75?'danger':x.score>=50?'warn':'info'}">${x.score}</span></td><td>${h(x.assertions)}</td><td>${h(x.source+' — '+x.reason)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">لا توجد مخاطر مشتقة بعد.</div>'}
function allRequests(){const arr=[];for(const r of rounds())for(const d of (r.parsed?.document_requests||[]))arr.push({...d,round:r.no});return arr}
function renderPBC(){
  const w=q('#v36-pbc');if(!w)return;const req=allRequests(),st=v36().pbc||{};const n=q('#n-pbc-v36');if(n)n.textContent=req.length;const top=q('#n-pbc');if(top)top.textContent=req.filter(x=>(st[x.id]?.status||'Missing')!=='Accepted').length;
  if(!req.length){w.innerHTML='<div class="empty">لا توجد مطالبات حتى الآن. ستُنشأ تلقائيًا من جولات المراجعة ويمكن تتبع حالتها هنا.</div>';return}
  const opts=['Missing','Requested','Received','Under Review','Accepted','Rejected','Need Clarification'];
  w.innerHTML=req.map(d=>{const s=st[d.id]?.status||'Missing';return `<div class="docreq"><h5>${h(d.title||d.id)} <span class="badge mut">الجولة ${d.round}</span></h5><p>${h(d.reason||'')}</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select class="v36-pbc-status" data-id="${h(d.id)}">${opts.map(o=>`<option ${o===s?'selected':''}>${o}</option>`).join('')}</select><span class="round-meta">${h((d.standard_refs||[]).join(' · '))}</span></div></div>`}).join('');
  qa('.v36-pbc-status').forEach(x=>x.onchange=()=>{v36().pbc[x.dataset.id]={status:x.value,at:now()};saveV36();renderPBC()});
}
function renderNotes(){const w=q('#v36-notes');if(!w)return;const notes=v36().notes||[];const n=q('#n-reviewer');if(n)n.textContent=notes.length;w.innerHTML=notes.length?notes.slice().reverse().map((x,i)=>`<div class="finding"><h5>${new Date(x.at).toLocaleString('ar-SA')}</h5><p>${h(x.text)}</p></div>`).join(''):'<div class="empty">لا توجد ملاحظات بعد.</div>';const extra=q('#extra-notes');if(extra&&!extra.dataset.v36Injected){extra.dataset.v36Injected='1';const latest=notes.slice(-5).map(x=>x.text).join('\n');if(latest)extra.value=(extra.value?extra.value+'\n':'')+'ملاحظات المراجع المحفوظة:\n'+latest}}
const BUILTIN_TEMPLATES=[['مذكرة التخطيط','الهدف:\nفهم المنشأة والبيئة:\nالمخاطر المهمة:\nاستجابة المراجعة:\nالاستنتاج:'],['مذكرة الإيرادات','دورة الإيرادات:\nنقاط التحكم:\nاختبارات القطع والحدوث:\nالعينة:\nالاستنتاج:'],['مذكرة المخزون','مواقع المخزون:\nالجرد والملاحظة:\nالتسعير وصافي القيمة القابلة للتحقق:\nالقطع:\nالاستنتاج:'],['مذكرة التقديرات','التقدير المحاسبي:\nطريقة الإدارة:\nالبيانات والافتراضات:\nاختبار الحساسية:\nالتحيز المحتمل:\nالاستنتاج:'],['مذكرة الإقفال','الأحداث اللاحقة:\nالاستمرارية:\nالتحريفات غير المصححة:\nالإقرارات المكتوبة:\nالاستنتاج النهائي:']];
function renderTemplates(){const w=q('#v36-templates');if(!w)return;const all=[...BUILTIN_TEMPLATES,...(v36().templates||[]).map(x=>[x.name,x.body])];w.innerHTML='<div class="grid g2">'+all.map((x,i)=>`<button class="kosif-action v36-template" data-i="${i}"><b>${h(x[0])}</b><small>فتح كنقطة بداية لملاحظة مراجع قابلة للتعديل</small></button>`).join('')+'</div>';qa('.v36-template').forEach(b=>b.onclick=()=>{q('#v36-note').value=all[+b.dataset.i][1];q('#v36-note').focus()})}
function renderAcceptance(){const a=v36().acceptance||{};for(const [id,k] of [['#v36-ind','independence'],['#v36-conf','conflicts'],['#v36-int','clientIntegrity'],['#v36-terms','terms']]){const x=q(id);if(x)x.checked=!!a[k]}const t=q('#v36-accept-note');if(t)t.value=a.note||'';const s=q('#v36-accept-state');if(s)s.innerHTML=a.accepted?`<div class="note ok"><span>✓</span><span>قرار القبول/الاستمرار موثق بتاريخ ${new Date(a.at).toLocaleString('ar-SA')}.</span></div>`:`<div class="note warn"><span>!</span><span>لم يُعتمد قرار القبول/الاستمرار بعد. لن تبدأ مراجعة حقيقية قبل استكمال البوابة.</span></div>`}
function patchRoundGate(){if(typeof readyForRounds==='function'&&!readyForRounds.__v36){const old=readyForRounds;readyForRounds=function(){const m=old();if(state.demo)return m;const a=v36().acceptance;if(!a.accepted)m.unshift({t:'اعتماد قبول/استمرار الارتباط والاستقلال',go:'settings'});return m};readyForRounds.__v36=true}}
async function readPriorFile(f){if(!f)return[];const n=f.name.toLowerCase();if(/\.xlsx?$/.test(n)&&typeof ensureXLSX==='function'){await ensureXLSX();const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_csv(ws,{FS:'\t'});return buildTB(parseTable(rows),guessColumns(parseTable(rows).headers))}const text=await f.text();const t=parseTable(text);return buildTB(t,guessColumns(t.headers))}
function renderPrior(){const w=q('#v36-prior-out');if(!w)return;const p=v36().priorTB||[],a=accounts();if(!p.length){w.innerHTML='';return}const pm=new Map(p.map(x=>[String(code(x)||name(x)).trim(),x])),cm=new Map(a.map(x=>[String(code(x)||name(x)).trim(),x]));const added=[...cm.keys()].filter(k=>!pm.has(k)),gone=[...pm.keys()].filter(k=>!cm.has(k));const changes=[];for(const [k,x] of cm){if(!pm.has(k))continue;const prev=bal(pm.get(k)),cur=bal(x),delta=cur-prev,pct=Math.abs(prev)>.01?Math.abs(delta/prev)*100:null;if(Math.abs(delta)>0&&(pct==null||pct>=25))changes.push({k,name:name(x),prev,cur,delta,pct})}changes.sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta));w.innerHTML=`<div class="note info"><span>↔</span><span>مقارنة السنة السابقة: ${p.length} حسابًا · جديد ${added.length} · مختفٍ ${gone.length} · تغيرات ≥25% ${changes.length}</span></div><div class="twrap"><table class="data"><thead><tr><th>الحساب</th><th>السابق</th><th>الحالي</th><th>التغير</th><th>%</th></tr></thead><tbody>${changes.slice(0,80).map(x=>`<tr><td>${h(x.name||x.k)}</td><td>${fmt(x.prev)}</td><td>${fmt(x.cur)}</td><td>${fmt(x.delta)}</td><td>${x.pct==null?'جديد/صفر':x.pct.toFixed(1)+'%'}</td></tr>`).join('')}</tbody></table></div>`}
function logMateriality(){try{const m=computeMateriality(accounts(),state.mat.basis,state.mat.pct),log=v36().materialityLog,last=log[log.length-1];if(!last||last.basis!==state.mat.basis||+last.pct!==+state.mat.pct||Math.abs((last.value||0)-m)>.5){log.push({at:now(),basis:state.mat.basis,pct:state.mat.pct,value:m});saveV36()}}catch(_){}}
function renderMatLog(){const w=q('#v36-mat-log');if(!w)return;const l=v36().materialityLog||[];w.innerHTML=l.length?`<div class="twrap"><table class="data"><thead><tr><th>التاريخ</th><th>الأساس</th><th>النسبة</th><th>القيمة</th></tr></thead><tbody>${l.slice().reverse().map(x=>`<tr><td>${new Date(x.at).toLocaleString('ar-SA')}</td><td>${h(x.basis)}</td><td>${h(x.pct)}%</td><td>${fmt(x.value)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">سيبدأ السجل عند حفظ بيانات الارتباط/الأهمية النسبية.</div>'}
function parseJournal(text){const lines=String(text||'').trim().split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];const delim=lines[0].includes('\t')?'\t':',';const cells=l=>l.split(delim).map(x=>x.trim().replace(/^"|"$/g,''));const hd=cells(lines[0]).map(x=>x.toLowerCase()),ix=(...ks)=>hd.findIndex(x=>ks.some(k=>x.includes(k)));const I={date:ix('تاريخ','date'),id:ix('رقم القيد','قيد','journal','voucher'),account:ix('حساب','account'),desc:ix('وصف','بيان','description'),debit:ix('مدين','debit'),credit:ix('دائن','credit'),user:ix('مستخدم','user','منشئ')};return lines.slice(1).map((l,i)=>{const c=cells(l);return{row:i+2,date:c[I.date]||'',id:c[I.id]||String(i+1),account:c[I.account]||'',desc:c[I.desc]||'',debit:num(c[I.debit]),credit:num(c[I.credit]),user:c[I.user]||''}}).filter(x=>x.account||x.debit||x.credit)}
function analyzeJournals(js){const flags=[];const materiality=(()=>{try{return computeMateriality(accounts(),state.mat.basis,state.mat.pct)}catch{return 0}})();const seen=new Map();for(const j of js){const amount=Math.max(j.debit,j.credit),d=new Date(j.date);const reasons=[];if(amount&&amount%10000===0)reasons.push('رقم دائري');if(materiality&&amount>=materiality)reasons.push('يتجاوز الأهمية النسبية');if(!Number.isNaN(d.getTime())&&(d.getDay()===5||d.getDay()===6))reasons.push('قيد عطلة أسبوعية');if(/تسوية|يدوي|manual|إقفال|closing/i.test(j.desc))reasons.push('وصف حساس/يدوي');const key=[j.date,j.account,j.debit,j.credit,j.desc].join('|');if(seen.has(key))reasons.push('قيد مكرر');seen.set(key,1);if(reasons.length)flags.push({...j,amount,reasons})}return flags.sort((a,b)=>b.amount-a.amount)}
function renderJournals(){const w=q('#v36-je-out');if(!w)return;const j=v36().journals||[],f=v36().journalFlags||[];if(!j.length){w.innerHTML='';return}w.innerHTML=`<div class="note info"><span>J</span><span>${j.length} سطر قيد · ${f.length} استثناء موجّه للاختبار. الاستثناء ليس تحريفًا بحد ذاته.</span></div><div class="twrap"><table class="data"><thead><tr><th>التاريخ</th><th>القيد</th><th>الحساب</th><th>المبلغ</th><th>أسباب الاختيار</th></tr></thead><tbody>${f.slice(0,150).map(x=>`<tr><td>${h(x.date)}</td><td>${h(x.id)}</td><td>${h(x.account)}</td><td>${fmt(x.amount)}</td><td>${h(x.reasons.join('، '))}</td></tr>`).join('')}</tbody></table></div>`}
function renderMisstatements(){const w=q('#v36-misstatements');if(!w)return;const a=report()?.adjusting_entries||[];if(!a.length){w.innerHTML='<div class="empty">لا توجد تحريفات/قيود تسوية مسجلة في التقرير الحالي.</div>';return}w.innerHTML=`<div class="twrap"><table class="data"><thead><tr><th>رقم</th><th>الوصف</th><th>الأثر</th><th>الحالة</th><th>المرجع</th></tr></thead><tbody>${a.map(x=>{const d=(x.lines||[]).reduce((s,l)=>s+num(l.debit),0);return `<tr><td>${h(x.no)}</td><td>${h(x.description||x.reason)}</td><td>${fmt(d)}</td><td><span class="badge warn">Proposed</span></td><td>${h((x.standard_refs||[]).join(' · '))}</td></tr>`}).join('')}</tbody></table></div>`}
/* ── تصنيف الحسابات ──
   التصنيف يحرّك مسودة القوائم المالية، فالخانة الخاطئة تنقل مبلغًا بين المركز المالي
   وقائمة الدخل بصمت. لذلك:

   1. رقم الحساب هو الإشارة الأوثق. الدليل المحاسبي يبدأ الأصول بـ1 والالتزامات بـ2
      وحقوق الملكية بـ3 والإيرادات بـ4 والمصروفات بـ5/6، وهو عرف شبه شامل.
   2. الاسم مجرد احتياط، وتُفحص فيه المؤهِّلات (مقدمًا، مستحق، مجمع، مخصص) *قبل*
      الكلمات العامة — فـ«تكلفة المبيعات» تحوي «مبيعات» وكانت تُصنَّف إيرادًا، أي أن
      أكبر بند مصروف كان ينتقل إلى الدخل.
   3. التصنيف بالاسم وحده يُعلَّم منخفض الثقة ليراجعه المراجع بدل أن يمرّ صامتًا. */
const CAT_BY_CODE={'1':'asset','2':'liability','3':'equity','4':'revenue','5':'expense','6':'expense'};
function categoryFromCode(c){
  /* Saudi charts are often exported with Arabic-Indic or Eastern-Arabic digits, which
     would otherwise fall through to the weaker name path. */
  const western=String(c==null?'':c)
    .replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660))
    .replace(/[\u06F0-\u06F9]/g,d=>String(d.charCodeAt(0)-0x06F0));
  const digits=western.trim().replace(/^[^0-9]+/,'');
  return digits?(CAT_BY_CODE[digits[0]]||null):null;
}
const NAME_RULES=[
  /* مؤهِّلات تُقلب التصنيف — تُفحص أولًا */
  [/مجمع\s*(ال)?إهلاك|مجمع\s*(ال)?استهلاك|accumulated\s+depreciation/i,'asset'],
  [/(مخصص|مجمع)\s*(ال)?(هبوط|انخفاض|ديون مشكوك|خسائر ائتمان)|allowance for|provision for doubtful/i,'asset'],
  [/(مصروف|مصاريف|مصروفات)[^\n]*(مدفوع|مقدم)|prepaid/i,'asset'],
  [/(إيراد|ايراد|إيرادات|ايرادات)[^\n]*(مستحق|غير مفوتر|لم تفوتر)|accrued (revenue|income)|unbilled/i,'asset'],
  [/(إيراد|ايراد|إيرادات|ايرادات)[^\n]*(مقبوض|مؤجل|مقدم)|unearned|deferred revenue/i,'liability'],
  [/(مصروف|مصاريف|مصروفات)[^\n]*مستحق|accrued (expense|liabilit)/i,'liability'],
  /* التزامات صريحة */
  [/أوراق\s*دفع|notes? payable|ذمم دائنة|دائنون|مورد|payable/i,'liability'],
  [/مخصص|التزام|قرض|تسهيلات|زكاة مستحقة|ضريبة[^\n]*مستحقة|نهاية الخدمة|provision|loan|lease liabilit/i,'liability'],
  /* حقوق الملكية */
  [/رأس المال|احتياطي|احتياط|أرباح مبقاة|ارباح مبقاه|خسائر متراكمة|حقوق (الملكية|المساهمين)|equity|retained earnings/i,'equity'],
  /* تكلفة المبيعات قبل الإيراد، وإلا التقطتها قاعدة «مبيعات» */
  [/تكلفة[^\n]*(مبيعات|البضاعة|الإيراد)|cost of (sales|goods|revenue)|cogs/i,'expense'],
  /* إيراد */
  [/إيراد|ايراد|مبيعات|revenue|sales|turnover/i,'revenue'],
  /* مصروف */
  [/مصروف|مصاريف|مصروفات|تكلفة|تكاليف|رواتب|أجور|إهلاك|استهلاك|إطفاء|expense|cost|salar|deprecia|amorti/i,'expense'],
  /* أصول صريحة */
  [/نقد|صندوق|بنك|مخزون|ذمم مدينة|مدينون|أوراق قبض|ممتلكات|آلات|معدات|أصل|أصول|حق الاستخدام|cash|bank|inventor|receivable|asset/i,'asset'],
];
function classifyAccount(acc){
  const byCode=categoryFromCode(code(acc));
  if(byCode) return {cat:byCode,basis:'code'};
  const n=String(name(acc)||'');
  for(const [re,cat] of NAME_RULES) if(re.test(n)) return {cat,basis:'name'};
  return {cat:'asset',basis:'default'};
}
/* يبقى التوقيع القديم متاحًا للاسم وحده */
function category(n){return classifyAccount({name:String(n)}).cat}
function renderFSDraft(){const w=q('#v36-fs-draft');if(!w)return;const a=accounts();if(!a.length){w.innerHTML='<div class="empty">اعتمد ميزانًا لإعداد المسودة.</div>';return}const sums={asset:0,liability:0,equity:0,revenue:0,expense:0};const clsBasis={code:0,name:0,default:0};for(const x of a){const c=classifyAccount(x);clsBasis[c.basis]++;sums[c.cat]+=bal(x)}const profit=-(sums.revenue+sums.expense);const residual=sums.asset+sums.liability+sums.equity+sums.revenue+sums.expense;const balanced=Math.abs(residual)<.5;const review=clsBasis.name+clsBasis.default;w.innerHTML=`<div class="grid g2"><div><h4>مسودة قائمة المركز المالي</h4><div class="twrap"><table class="data"><tbody><tr><td>الأصول — تصنيف آلي</td><td>${fmt(sums.asset)}</td></tr><tr><td>الالتزامات — تصنيف آلي</td><td>${fmt(-sums.liability)}</td></tr><tr><td>حقوق الملكية — تصنيف آلي</td><td>${fmt(-sums.equity)}</td></tr><tr><td><b>الالتزامات وحقوق الملكية والنتيجة</b></td><td><b>${fmt(-(sums.liability+sums.equity)+profit)}</b></td></tr></tbody></table></div></div><div><h4>مسودة الربح أو الخسارة</h4><div class="twrap"><table class="data"><tbody><tr><td>الإيرادات — تصنيف آلي</td><td>${fmt(-sums.revenue)}</td></tr><tr><td>المصروفات — تصنيف آلي</td><td>${fmt(sums.expense)}</td></tr><tr><td><b>نتيجة تقريبية</b></td><td><b>${fmt(profit)}</b></td></tr></tbody></table></div></div></div><div class="note ${balanced?'ok':'danger'}"><span>${balanced?'=':'≠'}</span><span><b>فحص معادلة الميزانية:</b> ${balanced?'الأصول تساوي الالتزامات وحقوق الملكية والنتيجة.':`لا تتوازن — الفرق ${fmt(residual)}. راجع الميزان أو تصنيف الحسابات قبل الاعتماد.`}</span></div><div class="note ${review?'warn':'info'}"><span>${review?'!':'✓'}</span><span><b>أساس التصنيف:</b> ${fmt(clsBasis.code)} حسابًا بأرقام الدليل، و${fmt(clsBasis.name)} بالاسم فقط${clsBasis.default?`، و${fmt(clsBasis.default)} بلا مطابقة (صُنِّفت أصولًا افتراضًا)`:''}. ${review?'الحسابات المصنَّفة بالاسم أو افتراضًا تحتاج مراجعة يدوية.':'كل الحسابات صُنِّفت من أرقام الدليل.'}</span></div><div class="note warn"><span>!</span><span>هذه مسودة تصنيف أولي وليست قوائم مالية صالحة للإصدار. يلزم اعتماد التصنيف والتسويات والإفصاحات والتدفقات النقدية يدويًا.</span></div>`}
function renderAllV36(){try{v36();renderTB();renderAnalytics();renderPBC();renderNotes();renderTemplates();renderAcceptance();renderPrior();renderMatLog();renderJournals();renderMisstatements();renderFSDraft()}catch(e){console.error('Kosif v36 render',e)}}
function bind(){
  const a=q('#v36-accept-save');if(a)a.onclick=()=>{const x=v36().acceptance;Object.assign(x,{independence:q('#v36-ind').checked,conflicts:q('#v36-conf').checked,clientIntegrity:q('#v36-int').checked,terms:q('#v36-terms').checked,note:q('#v36-accept-note').value.trim()});x.accepted=x.independence&&x.conflicts&&x.clientIntegrity&&x.terms;x.at=now();saveV36();renderAllV36();try{renderRounds()}catch(_){ }toastV(x.accepted?'تم اعتماد قرار القبول/الاستمرار':'استكمل جميع عناصر القبول','ok')};
  const pf=q('#v36-prior-file');if(pf)pf.onchange=async()=>{try{v36().priorTB=await readPriorFile(pf.files[0]);saveV36();renderPrior();toastV('تم تحميل سنة المقارنة','ok')}catch(e){toastV(e.message,'danger')}};
  const add=q('#v36-note-add');if(add)add.onclick=()=>{const t=q('#v36-note').value.trim();if(!t)return;v36().notes.push({at:now(),text:t});q('#v36-note').value='';saveV36();renderNotes()};
  const dict=q('#v36-note-dictate');if(dict)dict.onclick=()=>{const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toastV('الإملاء الصوتي غير مدعوم في هذا المتصفح','warn');const r=new R();r.lang='ar-SA';r.onresult=e=>q('#v36-note').value+=(q('#v36-note').value?' ':'')+e.results[0][0].transcript;r.start()};
  const tn=q('#v36-template-new');if(tn)tn.onclick=()=>{const name=prompt('اسم القالب');if(!name)return;const body=prompt('محتوى القالب الأولي')||'';v36().templates.push({name,body});saveV36();renderTemplates()};
  const jr=q('#v36-je-run');if(jr)jr.onclick=()=>{const js=parseJournal(q('#v36-je-paste').value);v36().journals=js;v36().journalFlags=analyzeJournals(js);saveV36();renderJournals();toastV(`تم تحليل ${js.length} سطر قيد`,'ok')};
  const sm=q('#v36-je-sample');if(sm)sm.onclick=()=>{const f=(v36().journalFlags||[]),j=(v36().journals||[]);const sample=[...f.slice(0,20),...j.filter((_,i)=>i%Math.max(1,Math.floor(j.length/20))===0).slice(0,20)];toastV(`عينة مقترحة: ${sample.length} سطر — تجمع الاستثناءات مع اختيار منهجي. راجع تصميم العينة قبل الاعتماد.`,'info');};
  const se=q('#btn-save-entity');if(se&&!se.dataset.v36Bound){se.dataset.v36Bound='1';se.addEventListener('click',()=>setTimeout(()=>{logMateriality();renderMatLog()},0))}
}
function patchNavigation(){if(typeof go==='function'&&!go.__v36){const old=go;go=function(v,...a){if(v==='adj-tb'){old('outputs',...a);setTimeout(()=>q('#adj-card')?.scrollIntoView({behavior:'smooth'}),50);return}const r=old(v,...a);setTimeout(renderAllV36,0);return r};go.__v36=true}}
function patchRefresh(){if(typeof refreshAll==='function'&&!refreshAll.__v36extra){const old=refreshAll;refreshAll=function(...a){let r;try{r=old.apply(this,a)}finally{renderAllV36()}return r};refreshAll.__v36extra=true}}
function init(){ensureCoreCompat();ensureViews();ensureAcceptance();ensurePriorAndMateriality();ensureOutputs();patchRoundGate();patchNavigation();patchRefresh();v36();bind();logMateriality();renderAllV36();document.documentElement.dataset.kosifV36='consolidated'}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
