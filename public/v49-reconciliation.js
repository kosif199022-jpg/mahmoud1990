/* KOSIF v49 — Bank ↔ Supplier Reconciliation Workspace */
(()=>{
'use strict';
const boot=()=>{
  const V=window.KosifV38;if(!V)return;
  if(window.__KOSIF_RECONCILIATION_V49__)return;window.__KOSIF_RECONCILIATION_V49__=true;
  const fmt=m=>V.fmtMinor(String(m??'0'),2);
  const esc=V.esc;
  const style=document.createElement('style');style.id='kosif-reconciliation-v49-style';style.textContent=`
  .kr49-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.kr49-box{border:1px solid var(--v38-line,#e2e8f0);border-radius:14px;padding:14px;background:var(--v38-card,#fff)}
  .kr49-box textarea{width:100%;min-height:240px;resize:vertical;border:1px solid #d7dce5;border-radius:12px;padding:12px;font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;direction:ltr;text-align:left;background:rgba(255,255,255,.86);color:#172033}
  .kr49-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}.kr49-tools label{font-size:12px;font-weight:700}.kr49-tools input[type=number],.kr49-tools input[type=text]{min-height:42px;border:1px solid #d7dce5;border-radius:10px;padding:0 10px;max-width:180px}
  .kr49-file{position:absolute;width:1px;height:1px;opacity:0}.kr49-status{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.kr49-table td,.kr49-table th{font-size:12px}.kr49-money{font-variant-numeric:tabular-nums;direction:ltr;white-space:nowrap}
  .kr49-exception{border-inline-start:4px solid #f59e0b}.kr49-ok{border-inline-start:4px solid #10b981}.kr49-proposed{border-inline-start:4px solid #8b5cf6}
  @media(max-width:760px){.kr49-grid{grid-template-columns:1fr}.kr49-box textarea{min-height:190px}.kr49-tools>*{flex:1 1 140px}.kr49-tools button{min-height:44px}}
  html[data-theme=dark] .kr49-box textarea,html[data-theme=dark] .kr49-tools input{background:#111827;color:#e5e7eb;border-color:#334155}`;document.head.appendChild(style);

  const DEMO_BANK=`| 17/08/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 114686237 | JM | -4,000.00 |
| 11/08/2026 | حوالة فورية محلية صادرة | شراء بضاعة مفوضين شركة رواد للتسويق المحدودة | 121264986 | JM | -3,000.00 |
| 05/08/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 115356665 | JM | -3,600.00 |
| 23/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 121475953 | JM | -3,000.00 |
| 18/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116055477 | JM | -2,500.00 |
| 09/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 119457006 | JM | -3,500.00 |
| 02/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 123335099 | JM | -2,500.00 |
| 29/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116406890 | JM | -2,000.00 |
| 27/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 117127940 | JM | -3,000.00 |
| 20/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116536723 | JM | -2,500.00 |
| 06/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 104751835 | JM | -1,500.00 |
| 04/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 108961081 | JM | -3,500.00 |
| 23/05/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 105280755 | JM | -2,000.00 |
| 19/05/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116288666 | JM | -500.00 |
| 19/05/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 114833908 | JM | -2,500.00 |
| 26/02/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 119965779 | JM | -3,700.00 |
| 14/03/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 104012913 | JM | -5,000.00 |`;
  const DEMO_LEDGER=`#\tرقم السند\tالنوع\tالحساب\tالتاريخ\tمدين\tدائن\tالرصيد\tملاحظة\tالحساب المقابل
1\t3228\tسند يومية\tشركة رواد للتسويق المحدودة\t19/05/2026\t2,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
2\t3267\tسند يومية\tشركة رواد للتسويق المحدودة\t23/05/2026\t2,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
3\t3243\tسند يومية\tشركة رواد للتسويق المحدودة\t04/06/2026\t3,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
4\t3280\tسند يومية\tشركة رواد للتسويق المحدودة\t27/06/2026\t3,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
5\t3283\tسند يومية\tشركة رواد للتسويق المحدودة\t29/06/2026\t2,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
6\t3300\tسند يومية\tشركة رواد للتسويق المحدودة\t09/07/2026\t3,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
7\t3304\tسند يومية\tشركة رواد للتسويق المحدودة\t18/07/2026\t2,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
8\t3328\tسند يومية\tشركة رواد للتسويق المحدودة\t11/08/2026\t3,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
9\t3337\tسند يومية\tشركة رواد للتسويق المحدودة\t17/08/2026\t4,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
10\t3086\tسند يومية\tشركة رواد للتسويق المحدودة\t01/03/2026\t3,700.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
11\t3139\tسند يومية\tشركة رواد للتسويق المحدودة\t15/03/2026\t5,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي`;

  let last=null;
  function get(id){return secQuery('#'+id)}
  let section=null; const secQuery=s=>section?.querySelector(s);
  function table(headers,rows,cls=''){
    if(!rows.length)return '<div class="v38-empty"><b>لا توجد عناصر</b></div>';
    return '<div class="v38-scroll"><table class="v38-table kr49-table '+cls+'"><thead><tr>'+headers.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
  }
  function txMap(report,kind){return new Map((report.transactions?.[kind]||[]).map(x=>[x.id,x]))}
  function renderResult(r){
    last=r;const s=r.summary||{},bank=txMap(r,'bank'),ledger=txMap(r,'ledger');
    const matchedRows=(r.matches||[]).map(m=>{
      const b=m.bankIds.map(id=>bank.get(id)).filter(Boolean),l=m.ledgerIds.map(id=>ledger.get(id)).filter(Boolean);
      const bd=b.map(x=>x.date).join(' + '),ld=l.map(x=>x.date).join(' + '),party=(b[0]?.counterparty||l[0]?.counterparty||'—');
      const kind=m.type==='exact'?'مطابقة مؤكدة':m.type==='probable'?'مطابقة مرجحة':'مطابقة مجمعة';
      return `<tr><td>${esc(kind)}</td><td>${esc(party)}</td><td class="kr49-money">${fmt(m.amountMinor)}</td><td>${esc(bd)}</td><td>${esc(ld)}</td><td>${m.dateDifferenceDays||0} يوم</td><td>${m.score}%</td></tr>`;
    });
    const bankRows=(r.exceptions?.bankOnly||[]).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.counterparty||'—')}</td><td class="kr49-money">${fmt(x.amountMinor)}</td><td>${esc(x.reference||'—')}</td><td>${esc(x.description||'')}</td></tr>`);
    const ledgerRows=(r.exceptions?.ledgerOnly||[]).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.counterparty||'—')}</td><td class="kr49-money">${fmt(x.amountMinor)}</td><td>${esc(x.reference||'—')}</td><td>${esc(x.description||'')}</td></tr>`);
    const drafts=(r.journalDrafts||[]).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.memo)}</td><td class="kr49-money">${fmt(x.amountMinor)}</td><td><span class="v38-chip human">اعتماد بشري</span></td></tr>`);
    const adj=r.adjustedBalance?V.kpi('الرصيد المقترح بعد التسوية',fmt(r.adjustedBalance.suggestedMinor),'مقترح فقط — يحتاج اعتمادًا بشريًا',true):'';
    get('kr49-result').innerHTML=`
      <div class="v38-kpis">${V.kpi('مجموعات المطابقة',s.matchGroups||0,`مؤكد ${s.exactCount||0} · مرجح ${s.probableCount||0}`)}${V.kpi('حوالات بالبنك فقط',s.bankOnlyCount||0,`${fmt(s.bankOnlyTotalMinor)} ريال`,true)}${V.kpi('قيود بالدفاتر فقط',s.ledgerOnlyCount||0,`${fmt(s.ledgerOnlyTotalMinor)} ريال`)}${V.kpi('فروق تاريخ',s.dateDifferenceCount||0,'داخل نافذة السماح')}${adj}</div>
      ${V.card('المطابقات','لا يُستخدم أي قيد مرتين',table(['الحالة','المورد','المبلغ','تاريخ البنك','تاريخ الدفاتر','فرق التاريخ','الثقة'],matchedRows),'kr49-ok')}
      ${V.card('موجود بالبنك وغير مسجل في حساب المورد',`الإجمالي ${fmt(s.bankOnlyTotalMinor)} ريال`,table(['التاريخ','المورد','المبلغ','المرجع','الوصف'],bankRows),'kr49-exception')}
      ${V.card('موجود بالدفاتر وغير ظاهر بالبنك',`الإجمالي ${fmt(s.ledgerOnlyTotalMinor)} ريال`,table(['التاريخ','المورد','المبلغ','السند','الملاحظة'],ledgerRows),'kr49-exception')}
      ${V.card('قيود مقترحة','مسودات فقط — لا ترحيل تلقائي',table(['التاريخ','البيان','المبلغ','الحوكمة'],drafts),'kr49-proposed')}
      <div class="v38-note info"><span>🔐</span><span>المطابقة حتمية ولا تستخدم AI لحساب المبالغ. الطلب لا يُحفظ على الخادم، ولا يتم ترحيل أي قيد تلقائيًا.</span></div>`;
    get('kr49-export').disabled=false;
  }
  async function run(){
    const bankText=get('kr49-bank').value.trim(),ledgerText=get('kr49-ledger').value.trim();
    if(!bankText||!ledgerText){V.toast('أدخل كشف البنك وكشف المورد أولًا','error');return}
    const btn=get('kr49-run');btn.disabled=true;btn.textContent='جارٍ المطابقة…';get('kr49-result').innerHTML='<div class="v38-loading">تنظيف البيانات وبناء مرشحات المطابقة…</div>';
    try{
      const body={bankText,ledgerText,includeJournalDrafts:true,options:{dateToleranceDays:Number(get('kr49-days').value||3),recordedSupplierBalance:get('kr49-balance').value.trim(),defaultParty:get('kr49-party').value.trim(),bankOnlyLedger:get('kr49-bankonly').checked}};
      const r=await V.api('/api/kosif/v49/reconcile',{method:'POST',body});renderResult(r);V.toast('اكتملت المطابقة الحتمية','ok');
    }catch(e){get('kr49-result').innerHTML='<div class="v38-note danger"><span>⛔</span><span>'+esc(e.message)+'</span></div>';V.toast(e.message,'error')}
    finally{btn.disabled=false;btn.textContent='نفّذ المطابقة'}
  }
  function loadDemo(){get('kr49-bank').value=DEMO_BANK;get('kr49-ledger').value=DEMO_LEDGER;get('kr49-party').value='شركة رواد للتسويق المحدودة';get('kr49-balance').value='14460.68';V.toast('تم تحميل مثال رواد — شغّل المطابقة','ok')}
  async function attach(inputId,targetId){const f=get(inputId).files?.[0];if(!f)return;try{get(targetId).value=await f.text();V.toast('تم تحميل '+f.name,'ok')}catch{V.toast('تعذر قراءة الملف','error')}}
  function exportJson(){if(!last)return;const blob=new Blob([JSON.stringify(last,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kosif-reconciliation-v49.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}

  V.registerView({id:'v49-reconciliation',title:'المطابقة البنكية',icon:'⇄',order:920,render(sec){section=sec;sec.innerHTML=
    V.hero('المطابقة البنكية الذكية','قارن كشف البنك بحساب المورد تلقائيًا: مطابقة مؤكدة، فروق تاريخ، حوالات مفقودة، قيود غير ظاهرة بالبنك، وتجميع دفعات — بحسابات حتمية واعتماد بشري.',[['fact','حساب حتمي'],['human','اعتماد بشري'],['source','Bank ↔ Ledger']])+
    `<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>مصادر المطابقة</h3><span class="hint">الصق النص أو ارفع CSV / TSV / TXT</span></div>
      <div class="kr49-grid"><div class="kr49-box"><b>كشف البنك</b><textarea id="kr49-bank" placeholder="ألصق عمليات البنك هنا…"></textarea><div class="kr49-tools"><label class="v38-btn">تحميل ملف<input class="kr49-file" id="kr49-bank-file" type="file" accept=".txt,.csv,.tsv,text/plain,text/csv"></label></div></div>
      <div class="kr49-box"><b>كشف حساب المورد</b><textarea id="kr49-ledger" placeholder="ألصق كشف حساب المورد هنا…"></textarea><div class="kr49-tools"><label class="v38-btn">تحميل ملف<input class="kr49-file" id="kr49-ledger-file" type="file" accept=".txt,.csv,.tsv,text/plain,text/csv"></label></div></div></div>
      <div class="kr49-tools"><label>نافذة فرق التاريخ <input id="kr49-days" type="number" min="0" max="31" value="3"></label><label>المورد الافتراضي <input id="kr49-party" type="text" placeholder="اختياري"></label><label>رصيد المورد الحالي <input id="kr49-balance" type="text" placeholder="اختياري"></label><label style="display:flex;gap:6px;align-items:center"><input id="kr49-bankonly" type="checkbox" checked> استبعد دفعات الصندوق من مطابقة البنك</label></div>
      <div class="kr49-tools"><button class="v38-btn gold" id="kr49-run">نفّذ المطابقة</button><button class="v38-btn" id="kr49-demo">حمّل مثال رواد</button><button class="v38-btn" id="kr49-export" disabled>تصدير JSON</button></div>
      <div class="v38-note warn"><span>⚖️</span><span>التطبيق لا يعدّل الدفاتر. أي رصيد مصحح أو قيد يظهر هنا هو اقتراح مراجعة فقط حتى يعتمد المحاسب العملية والمستند المؤيد.</span></div></div>
      <div id="kr49-result"></div>`;
    get('kr49-run').onclick=run;get('kr49-demo').onclick=loadDemo;get('kr49-export').onclick=exportJson;get('kr49-bank-file').onchange=()=>attach('kr49-bank-file','kr49-bank');get('kr49-ledger-file').onchange=()=>attach('kr49-ledger-file','kr49-ledger');
  }});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
