(()=>{
'use strict';

const STORE='kosif:sales:v1';
const LEGACY_STORE='kosif:aghnam:v7:native';
const MIGRATION_MARKER='kosif:sales:migrated:v1';
window.__KOSIF_SALES_STORE_KEY__=STORE;

const sample={
  sales:[
    {id:'G-1',date:'2026-08-01',product:'المنتج A',category:'منتجات',channel:'المتجر الإلكتروني',qty:18,revenue:12600,cost:8460,customer:'عميل 001',phone:'0500000001',city:'الرياض',payment:'مدى'},
    {id:'G-2',date:'2026-08-02',product:'الخدمة الأساسية',category:'خدمات',channel:'واتساب',qty:14,revenue:9100,cost:5160,customer:'عميل 002',phone:'0500000002',city:'جدة',payment:'تحويل'},
    {id:'G-3',date:'2026-08-03',product:'المنتج B',category:'منتجات',channel:'الفرع',qty:22,revenue:12100,cost:7920,customer:'شركة تجريبية',phone:'0500000003',city:'مكة',payment:'شبكة'},
    {id:'G-4',date:'2026-08-04',product:'الباقة المتقدمة',category:'باقات',channel:'المتجر الإلكتروني',qty:26,revenue:14820,cost:8620,customer:'عميل 004',phone:'0500000004',city:'الدمام',payment:'مدى'},
    {id:'G-5',date:'2026-08-05',product:'الخدمة الاحترافية',category:'خدمات',channel:'المبيعات المباشرة',qty:17,revenue:8670,cost:5120,customer:'مؤسسة تجريبية',phone:'0500000005',city:'الرياض',payment:'تحويل'},
    {id:'G-6',date:'2026-08-06',product:'المنتج C',category:'منتجات',channel:'المتجر الإلكتروني',qty:11,revenue:6600,cost:4290,customer:'عميل 006',phone:'0500000006',city:'الرياض',payment:'مدى'},
    {id:'G-7',date:'2026-08-07',product:'الباقة الاقتصادية',category:'باقات',channel:'الفرع',qty:31,revenue:13020,cost:7990,customer:'عميل 007',phone:'0500000007',city:'جدة',payment:'نقدي'},
    {id:'G-8',date:'2026-08-08',product:'خدمة الدعم',category:'خدمات',channel:'المبيعات المباشرة',qty:13,revenue:7150,cost:3550,customer:'عميل 008',phone:'0500000008',city:'مكة',payment:'مدى'}
  ],
  clients:[],
  tasks:[],
  costs:{},
  meta:{source:'Kosif general sales demo',schema:'kosif.sales.v1',updatedAt:new Date().toISOString()}
};

const clone=value=>JSON.parse(JSON.stringify(value));
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const fmt=value=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:0}).format(Number(value)||0);
const money=value=>fmt(value)+' ر.س';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function parseStored(raw){
  try{
    const value=JSON.parse(raw||'null');
    return value&&typeof value==='object'?value:null;
  }catch{return null}
}

function shouldReplaceLegacyDemo(raw){
  const value=parseStored(raw);
  return value?.meta?.source==='Aghnam v7 native integration'&&
    Array.isArray(value.sales)&&
    value.sales.length===8&&
    value.sales.every((row,index)=>row?.id===`S-${index+1}`);
}

function normalizeDb(value){
  const base=value&&typeof value==='object'?value:{};
  const normalized={
    ...base,
    sales:Array.isArray(base.sales)?base.sales:[],
    clients:Array.isArray(base.clients)?base.clients:[],
    tasks:Array.isArray(base.tasks)?base.tasks:[],
    costs:base.costs&&typeof base.costs==='object'?base.costs:{},
    meta:{...(base.meta&&typeof base.meta==='object'?base.meta:{}),schema:'kosif.sales.v1'}
  };
  if(!normalized.meta.source)normalized.meta.source='Kosif sales workspace';
  if(!normalized.meta.updatedAt)normalized.meta.updatedAt=new Date().toISOString();
  return normalized;
}

function migrateStorage(){
  const current=parseStored(localStorage.getItem(STORE));
  if(current)return normalizeDb(current);

  const legacyRaw=localStorage.getItem(LEGACY_STORE);
  const legacy=parseStored(legacyRaw);
  let next;
  if(legacy&&Array.isArray(legacy.sales)&&!shouldReplaceLegacyDemo(legacyRaw)){
    next=normalizeDb(legacy);
    next.meta={...next.meta,source:next.meta.source||'Migrated sales data',migratedFrom:LEGACY_STORE,migratedAt:new Date().toISOString()};
  }else{
    next=normalizeDb(clone(sample));
  }
  try{
    localStorage.setItem(STORE,JSON.stringify(next));
    localStorage.setItem(MIGRATION_MARKER,'1');
  }catch(_){ }
  return next;
}

let db;
try{db=migrateStorage()}catch{db=normalizeDb(clone(sample))}

function rebuildClients(){
  if(db.clients.length||!db.sales.length)return;
  db.clients=[...new Map(db.sales.map(row=>{
    const phone=String(row.phone||'');
    const matches=db.sales.filter(sale=>String(sale.phone||'')===phone);
    return [phone||row.customer||row.id,{
      name:row.customer||'عميل',
      phone,
      city:row.city||'',
      orders:matches.length,
      revenue:matches.reduce((total,sale)=>total+(Number(sale.revenue)||0),0),
      source:row.channel||'غير محدد',
      status:'نشط'
    }];
  })).values()];
}
rebuildClients();

function save(){
  db.meta={...(db.meta||{}),schema:'kosif.sales.v1',updatedAt:new Date().toISOString()};
  localStorage.setItem(STORE,JSON.stringify(db));
  qualityScore();
  window.dispatchEvent(new CustomEvent('kosif-sales-updated',{detail:{store:STORE}}));
}

function sum(rows,key){return rows.reduce((total,row)=>total+(Number(row[key])||0),0)}
function group(rows,key,value='revenue'){
  const grouped={};
  for(const row of rows){
    const label=row[key]||'غير محدد';
    grouped[label]=(grouped[label]||0)+(Number(row[value])||0);
  }
  return Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
}
function profit(row){return(Number(row.revenue)||0)-(Number(row.cost)||0)}

function qualityScore(){
  const rows=db.sales;
  let missing=0,duplicates=0;
  for(const row of rows){
    for(const key of ['date','product','channel','revenue','cost']){
      if(row[key]===null||row[key]===undefined||row[key]==='')missing++;
    }
  }
  const seen=new Set();
  for(const row of rows){
    const key=[row.date,row.product,row.revenue,row.phone].join('|');
    if(seen.has(key))duplicates++;
    seen.add(key);
  }
  const denominator=Math.max(1,rows.length*5);
  const score=Math.max(0,Math.round(100-(missing/denominator*70)-(duplicates/Math.max(1,rows.length)*30)));
  const element=$('#healthScore');
  if(element)element.textContent=score;
  return{score,miss:missing,dup:duplicates};
}

function renderKpis(){
  const rows=db.sales;
  const revenue=sum(rows,'revenue');
  const cost=sum(rows,'cost');
  const grossProfit=revenue-cost;
  const quantity=sum(rows,'qty');
  return `<div class="grid kpis"><div class="kpi"><span>إجمالي المبيعات</span><b>${money(revenue)}</b><small>${rows.length} عملية</small></div><div class="kpi"><span>مجمل الربح</span><b>${money(grossProfit)}</b><small>هامش ${revenue?(grossProfit/revenue*100).toFixed(1):0}%</small></div><div class="kpi"><span>الكمية المباعة</span><b>${fmt(quantity)}</b><small>وحدة / طلب</small></div><div class="kpi"><span>متوسط الطلب</span><b>${money(rows.length?revenue/rows.length:0)}</b><small>قيمة العملية</small></div></div>`;
}

function bars(data){
  const max=Math.max(1,...data.map(item=>item[1]));
  return `<div class="bars-h">${data.map(([label,value])=>`<div class="rowbar"><span>${esc(label)}</span><div class="track"><div class="fill" style="width:${Math.max(2,value/max*100)}%"></div></div><b>${money(value)}</b></div>`).join('')}</div>`;
}

function analytics(){
  const byDay=group(db.sales,'date');
  const max=Math.max(1,...byDay.map(item=>item[1]));
  return `${renderKpis()}<div class="grid two"><div class="panel"><div class="panel-head"><h2>الاتجاه الزمني</h2><span>المبيعات اليومية</span></div><div class="chart">${byDay.map(([date,value])=>`<div class="bar" title="${money(value)}" style="height:${Math.max(3,value/max*100)}%"><i>${esc(String(date).slice(5))}</i></div>`).join('')}</div></div><div class="panel"><div class="panel-head"><h2>المبيعات حسب القناة</h2><span>توزيع المصادر</span></div>${bars(group(db.sales,'channel'))}</div></div><div class="grid two"><div class="panel"><div class="panel-head"><h2>أفضل الأصناف</h2><span>حسب الإيراد</span></div>${bars(group(db.sales,'product').slice(0,8))}</div><div class="panel"><div class="panel-head"><h2>الفئات</h2><span>تركيبة المبيعات</span></div>${bars(group(db.sales,'category'))}</div></div>`;
}

function costs(){
  const rows=[...db.sales].sort((a,b)=>profit(b)-profit(a));
  return `${renderKpis()}<div class="panel"><div class="panel-head"><h2>ربحية الأصناف</h2><span>إيراد - تكلفة فعلية مسجلة</span></div><div class="table-wrap"><table><thead><tr><th>الصنف</th><th>القناة</th><th>الكمية</th><th>الإيراد</th><th>التكلفة</th><th>الربح</th><th>الهامش</th></tr></thead><tbody>${rows.map(row=>{const rowProfit=profit(row),margin=row.revenue?rowProfit/row.revenue*100:0;return`<tr><td>${esc(row.product)}</td><td>${esc(row.channel)}</td><td>${fmt(row.qty)}</td><td>${money(row.revenue)}</td><td>${money(row.cost)}</td><td>${money(rowProfit)}</td><td><span class="pill ${margin>=30?'good':margin>=20?'warn':'bad'}">${margin.toFixed(1)}%</span></td></tr>`}).join('')}</tbody></table></div></div><div class="note">قاعدة القرار: لا تُولَّد تكلفة أو ربح بالذكاء الاصطناعي. جميع المؤشرات هنا مشتقة مباشرة من البيانات المستوردة أو المدخلة.</div>`;
}

function crm(){
  return `<div class="panel"><div class="panel-head"><h2>سجل العملاء</h2><span>${db.clients.length} عميل</span></div><div class="toolbar"><input id="crmSearch" placeholder="بحث بالاسم أو الجوال أو المدينة"><button class="action" id="addClient">إضافة عميل</button></div><div class="table-wrap"><table><thead><tr><th>العميل</th><th>الجوال</th><th>المدينة</th><th>المصدر</th><th>الطلبات</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody id="crmRows">${crmRows(db.clients)}</tbody></table></div></div><div class="grid three"><div class="mini-card"><b>متابعة العملاء</b><p>سجل الاتصال، الملاحظات، مصدر العميل، آخر طلب وحالة المتابعة في مساحة واحدة.</p></div><div class="mini-card"><b>قوائم الجوال</b><p>يمكن استخراج أعلى العملاء حسب القيمة ثم استخدام الرقم في قنوات التواصل المعتمدة.</p></div><div class="mini-card"><b>النسخ الاحتياطي</b><p>زر «تصدير نسخة» يحفظ المبيعات والعملاء والمهام وحالة اللوحة في JSON.</p></div></div>`;
}
function crmRows(rows){
  return rows.map(row=>`<tr><td>${esc(row.name)}</td><td dir="ltr">${esc(row.phone)}</td><td>${esc(row.city)}</td><td>${esc(row.source)}</td><td>${fmt(row.orders)}</td><td>${money(row.revenue)}</td><td><span class="pill good">${esc(row.status||'نشط')}</span></td></tr>`).join('');
}

function quality(){
  const result=qualityScore(),issues=[];
  if(result.miss)issues.push(['bad',`${result.miss} حقول أساسية مفقودة`,'أكمل التاريخ والصنف والقناة والإيراد والتكلفة.']);
  if(result.dup)issues.push(['warn',`${result.dup} عمليات مشتبه بتكرارها`,'راجع التاريخ والصنف والقيمة والجوال قبل الحذف.']);
  for(const row of db.sales){
    if(Number(row.cost)>Number(row.revenue))issues.push(['bad',`تكلفة تتجاوز البيع: ${row.product}`,'راجع تسعير وتكلفة العملية.']);
    const phone=String(row.phone||'').replace(/\D/g,'');
    if(phone&&!/^05\d{8}$/.test(phone))issues.push(['warn',`رقم جوال يحتاج مراجعة: ${row.customer||row.id}`,'توحيد صيغة أرقام العملاء قبل الحملات.']);
  }
  return `<div class="grid kpis"><div class="kpi"><span>درجة السلامة</span><b>${result.score}%</b><small>مقياس حتمي</small></div><div class="kpi"><span>الحقول المفقودة</span><b>${result.miss}</b><small>أساسي</small></div><div class="kpi"><span>التكرارات</span><b>${result.dup}</b><small>مشتبه</small></div><div class="kpi"><span>السجلات</span><b>${db.sales.length}</b><small>مبيعات</small></div></div><div class="panel"><div class="panel-head"><h2>مركز جودة البيانات وسلامة التشغيل</h2><span>قواعد قابلة لإعادة التنفيذ</span></div>${issues.length?issues.map(([kind,title,detail])=>`<div class="issue"><i style="background:${kind==='bad'?'#f43f5e':'#f59e0b'}"></i><div><b>${esc(title)}</b><p>${esc(detail)}</p></div></div>`).join(''):'<div class="note oknote">لا توجد استثناءات جودة حالية في العينة.</div>'}</div>`;
}

function management(){
  const top=group(db.sales,'product').slice(0,5),channels=group(db.sales,'channel'),grossProfit=db.sales.reduce((total,row)=>total+profit(row),0);
  return `<div class="grid three"><div class="mini-card"><b>أفضل فرصة توسع</b><p>${esc(top[0]?.[0]||'—')} يقود الإيرادات في البيانات الحالية. اختبر المخزون، القدرة التشغيلية والهامش قبل زيادة الإنفاق.</p></div><div class="mini-card"><b>القناة الأعلى</b><p>${esc(channels[0]?.[0]||'—')} بقيمة ${money(channels[0]?.[1]||0)}. راقب CAC ومعدل إعادة الشراء قبل قرار التوسع.</p></div><div class="mini-card"><b>الربح المسجل</b><p>${money(grossProfit)} مبني فقط على التكلفة والإيراد الموجودين في البيانات.</p></div></div><div class="panel"><div class="panel-head"><h2>مركز القرار التنفيذي</h2><span>توصيات قواعد لا أرقام AI</span></div>${top.map(([label,value],index)=>`<div class="issue"><i></i><div><b>${index+1}. ${esc(label)} — ${money(value)}</b><p>${index===0?'حافظ على التوفر وراقب الهامش ونسبة المرتجعات.':'قارن النمو مع الربحية ومصدر الطلب قبل رفع الأولوية.'}</p></div></div>`).join('')}</div>`;
}

function diagnostics(){
  const result=qualityScore(),revenue=sum(db.sales,'revenue'),cost=sum(db.sales,'cost'),issues=[];
  if(!db.sales.length)issues.push('لا توجد بيانات مبيعات.');
  if(cost>revenue)issues.push('إجمالي التكلفة يتجاوز إجمالي الإيراد.');
  if(result.score<90)issues.push('جودة البيانات أقل من 90%.');
  return `<div class="panel"><div class="panel-head"><h2>التشخيص التشغيلي</h2><span>Runtime & data integrity</span></div><div class="grid three"><div class="mini-card"><b>Local Storage</b><p>${localStorage.getItem(STORE)?'نشط — توجد حالة محفوظة':'جديد — ستُحفظ الحالة عند أول تعديل'}</p></div><div class="mini-card"><b>المصدر</b><p>${esc(db.meta.source||'غير محدد')}</p></div><div class="mini-card"><b>آخر تحديث</b><p>${esc(db.meta.updatedAt||'—')}</p></div></div><div style="margin-top:14px">${issues.length?`<div class="note fatal">${issues.map(esc).join('<br>')}</div>`:'<div class="note oknote">الفحوص الأساسية تمر دون استثناءات حرجة.</div>'}</div></div><div class="panel"><div class="panel-head"><h2>حدود الثقة</h2></div><p style="color:#64748b;font-size:12px;line-height:1.9">هذه اللوحة لا تعتبر البيانات المستوردة صحيحة تلقائيًا. الأرقام الناتجة هي حسابات مباشرة من المصدر؛ أما الاستنتاجات التشغيلية فتظل اقتراحات تحتاج مراجعة بشرية وربطها بالسياق التجاري.</p></div>`;
}

function render(view='analytics'){
  const element=$('#view');
  if(!element)return;
  element.innerHTML=({analytics,costs,crm,quality,management,diagnostics}[view]||analytics)();
  $$('.sales-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
  if(view==='crm')bindCrm();
}

function bindCrm(){
  const search=$('#crmSearch');
  if(search)search.oninput=()=>{$('#crmRows').innerHTML=crmRows(db.clients.filter(client=>[client.name,client.phone,client.city].join(' ').includes(search.value.trim())))};
  const add=$('#addClient');
  if(add)add.onclick=()=>{
    const name=prompt('اسم العميل');
    if(!name)return;
    const phone=prompt('الجوال')||'',city=prompt('المدينة')||'';
    db.clients.unshift({name,phone,city,orders:0,revenue:0,source:'يدوي',status:'نشط'});
    save();
    render('crm');
  };
}

function parseDelimited(text,delimiter=','){
  const rows=[];
  let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
      continue;
    }
    if(char===delimiter&&!quoted){row.push(field);field='';continue;}
    if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&text[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.some(value=>value.trim()!==''))rows.push(row);
      row=[];
      continue;
    }
    field+=char;
  }
  row.push(field);
  if(row.some(value=>value.trim()!==''))rows.push(row);
  return rows;
}

function rowsFromDelimited(text,delimiter=','){
  const matrix=parseDelimited(text,delimiter);
  if(!matrix.length)return[];
  const headers=matrix.shift().map(value=>value.trim());
  return matrix.map((values,index)=>{
    const row={id:`IMP-${index+1}`};
    headers.forEach((header,column)=>{if(header)row[header]=(values[column]??'').trim()});
    for(const key of ['qty','revenue','cost'])row[key]=Number(String(row[key]||0).replace(/[٬,،\s]/g,''))||0;
    return row;
  });
}

$$('.sales-tabs button').forEach(button=>button.onclick=()=>render(button.dataset.view));

const exportButton=$('#exportBtn');
if(exportButton)exportButton.onclick=()=>{
  const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),anchor=document.createElement('a');
  anchor.href=URL.createObjectURL(blob);
  anchor.download='kosif-sales-backup.json';
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(anchor.href),500);
};

const importFile=$('#importFile');
if(importFile)importFile.onchange=async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    const text=await file.text();
    if(file.name.toLowerCase().endsWith('.json')){
      const parsed=JSON.parse(text);
      if(Array.isArray(parsed))db.sales=parsed;
      else if(Array.isArray(parsed.sales))db=normalizeDb({...db,...parsed});
      else throw new Error('لا توجد مصفوفة sales');
    }else{
      const delimiter=file.name.toLowerCase().endsWith('.tsv')?'\t':',';
      db.sales=rowsFromDelimited(text,delimiter);
    }
    db.clients=[];
    rebuildClients();
    db.meta={...(db.meta||{}),source:file.name,importedAt:new Date().toISOString()};
    save();
    render('analytics');
    alert('تم الاستيراد. راجع قسم جودة البيانات قبل الاعتماد.');
  }catch(error){
    alert('تعذر الاستيراد: '+(error instanceof Error?error.message:'خطأ غير معروف'));
  }finally{
    event.target.value='';
  }
};

qualityScore();
render('analytics');
})();
