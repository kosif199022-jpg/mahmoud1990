(()=>{
'use strict';
const ALLOWED=new Set(['std2025','std2018','dipifr']);
const qs=new URLSearchParams(location.search);
const BOOK=String(qs.get('book')||'').toLowerCase();
if(!ALLOWED.has(BOOK)){location.replace('/libraries/');return}
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const key=s=>`kosif_prepared_reader:${BOOK}:${s}`;
const read=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const noStore={credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache'}};
let library=[],info=null,index=null,chapters=[],current=0,requestSeq=0,aborter=null;

window.__KOSIF_PREPARED_READER__={isolated:true,book:BOOK,route:location.pathname,version:'v37-isolated-1'};

document.documentElement.dataset.theme=read('kosif_prepared_reader:theme','light');
const savedSize=Math.max(17,Math.min(30,Number(read('kosif_prepared_reader:font',20))||20));
document.documentElement.style.setProperty('--r-fs',savedSize+'px');

function sourceLabel(){
  if(BOOK==='dipifr')return{badge:'تدريب · ليس مصدر اعتماد',note:'مادة تدريبية مستقلة. لا تحل محل SOCPA أو IFRS كمصدر اعتماد مهني.'};
  if(BOOK==='std2025')return{badge:'SOCPA · نسخة 2025 المجهزة',note:'نسخة مجهزة للقراءة من مكتبة Kosif. عند الاستشهاد المهني تكون الأولوية للمصدر الرسمي النافذ.'};
  return{badge:'SOCPA · نسخة 2018 المرجعية',note:'نسخة مرجعية تاريخية مستقلة. لا تُعامل تلقائيًا باعتبارها أحدث مصدر نافذ.'};
}

async function json(url){const r=await fetch(url,noStore);if(!r.ok)throw new Error(`${url} ${r.status}`);return r.json()}

async function boot(){
  try{
    [library,index]=await Promise.all([
      json('/wealth/books/library.json?reader=v37-isolated-1'),
      json(`/wealth/books/${encodeURIComponent(BOOK)}.json?reader=v37-isolated-1`)
    ]);
    info=(Array.isArray(library)?library:[]).find(x=>x.id===BOOK)||{};
    chapters=Array.isArray(index?.chapters)?index.chapters:[];
    if(!chapters.length)throw new Error('empty index');
    const labels=sourceLabel();
    $('#bookTitle').textContent=index?.title||info.title||BOOK;
    $('#tocTitle').textContent=index?.title||info.title||BOOK;
    $('#bookYear').textContent=info.year?`• ${ar(info.year)}`:'';
    $('#sourceBadge').textContent=labels.badge;
    $('#sourceNote').textContent=labels.note+' هذا القارئ لا يستخدم D/CH أو Service Worker الخاص بـ «مفاتيح الثروة».';
    $('#bookKind').textContent=BOOK==='dipifr'?'KOSIF TRAINING READER':'KOSIF STANDARDS READER';
    document.title=(index?.title||info.title||'القارئ المهني')+' | Kosif';
    renderToc('');
    const requested=Math.max(1,Number(qs.get('ch'))||0);
    const saved=Math.max(1,Number(read(key('chapter'),1))||1);
    const start=requested||saved;
    const pos=Math.max(0,chapters.findIndex(c=>Number(c.no)===start));
    await go(pos<0?0:pos,false);
  }catch(err){showFatal(err)}
}

function showFatal(err){
  $('#page').setAttribute('aria-busy','false');
  $('#chapterTitle').textContent='تعذّر فتح الكتاب';
  $('#chapterBody').innerHTML='';
  const e=$('#chapterError');e.hidden=false;e.querySelector('b').textContent='تعذّر تحميل فهرس الكتاب من المصدر.';
  console.error('[Kosif Prepared Reader]',err);
}

function renderToc(filter=''){
  const q=clean(filter).toLowerCase();
  const list=$('#tocList');
  list.textContent='';
  chapters.forEach((c,i)=>{
    const title=clean(c.title||c.name||`الفصل ${c.no||i+1}`);
    if(q&&!title.toLowerCase().includes(q))return;
    const b=document.createElement('button');
    b.type='button';b.className='toc-item';b.dataset.index=String(i);b.setAttribute('aria-current',i===current?'true':'false');
    const n=document.createElement('span');n.textContent=ar(c.no||i+1);
    const t=document.createElement('b');t.textContent=title;
    b.append(n,t);b.onclick=()=>{go(i,true);closeToc()};list.appendChild(b);
  });
}

function bodyNode(entry){
  const tag=String(entry?.[0]||'p').toLowerCase();
  const text=String(entry?.[1]??'');
  const allowed=/^h[234]$/.test(tag)?tag:'p';
  const el=document.createElement(allowed);
  el.textContent=text;
  if(/note|quote|تنبيه|ملاحظة/i.test(tag))el.className='body-note';
  if(/li|list/i.test(tag))el.classList.add('body-list');
  return el;
}

async function go(i,push=true){
  if(!chapters.length)return;
  i=Math.max(0,Math.min(chapters.length-1,Number(i)||0));
  current=i;requestSeq+=1;const seq=requestSeq;
  aborter?.abort();aborter=new AbortController();
  const c=chapters[i],no=Number(c.no)||i+1;
  $('#page').setAttribute('aria-busy','true');$('#chapterError').hidden=true;
  $('#chapterMeta').textContent=`الفصل ${ar(no)} · ${ar(i+1)} من ${ar(chapters.length)}`;
  $('#chapterTitle').textContent=clean(c.title||c.name||`الفصل ${no}`)||`الفصل ${ar(no)}`;
  $('#chapterBody').innerHTML='<p style="opacity:.55">يتم تحميل النص…</p>';
  $('#chapterCount').textContent=`${ar(i+1)} / ${ar(chapters.length)}`;
  $('#prevBtn').disabled=i===0;$('#nextBtn').disabled=i===chapters.length-1;
  $('#progress i').style.width=`${((i+1)/chapters.length)*100}%`;
  write(key('chapter'),no);
  if(push){const u=new URL(location.href);u.searchParams.set('book',BOOK);u.searchParams.set('ch',String(no));history.pushState({book:BOOK,ch:no},'',u)}
  renderToc($('#tocSearch').value||'');
  try{
    const r=await fetch(`/wealth/books/${encodeURIComponent(BOOK)}/${no}.json?reader=v37-isolated-1`,{...noStore,signal:aborter.signal});
    if(!r.ok)throw new Error(String(r.status));const full=await r.json();
    if(seq!==requestSeq)return;
    const body=Array.isArray(full?.body)?full.body:[];
    const host=$('#chapterBody');host.textContent='';
    for(const entry of body)host.appendChild(bodyNode(entry));
    if(!body.length){const p=document.createElement('p');p.textContent='لا يوجد نص مجهز لهذا الفصل.';host.appendChild(p)}
    $('#page').setAttribute('aria-busy','false');
    window.__KOSIF_PREPARED_READER__.chapter=no;
    window.__KOSIF_PREPARED_READER__.title=clean(c.title||c.name||'');
    scrollTo({top:0,behavior:'instant'});
  }catch(err){if(err?.name==='AbortError')return;$('#page').setAttribute('aria-busy','false');$('#chapterBody').textContent='';$('#chapterError').hidden=false;console.error('[Kosif Prepared Reader chapter]',err)}
}

function openToc(){const t=$('#toc'),s=$('#tocShade');s.hidden=false;t.classList.add('on');t.setAttribute('aria-hidden','false');setTimeout(()=>$('#tocSearch').focus({preventScroll:true}),20)}
function closeToc(){const t=$('#toc'),s=$('#tocShade');t.classList.remove('on');t.setAttribute('aria-hidden','true');setTimeout(()=>{s.hidden=true},280)}
$('#tocBtn').onclick=openToc;$('#tocClose').onclick=closeToc;$('#tocShade').onclick=closeToc;
$('#tocSearch').addEventListener('input',e=>renderToc(e.target.value));
$('#prevBtn').onclick=()=>go(current-1,true);$('#nextBtn').onclick=()=>go(current+1,true);$('#retryBtn').onclick=()=>go(current,false);
$('#themeBtn').onclick=()=>{const order=['light','sepia','dark'],cur=document.documentElement.dataset.theme||'light',next=order[(order.indexOf(cur)+1)%order.length];document.documentElement.dataset.theme=next;write('kosif_prepared_reader:theme',next)};
$('#fontBtn').onclick=()=>{const cur=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--r-fs'))||20,next=cur>=28?18:cur+2;document.documentElement.style.setProperty('--r-fs',next+'px');write('kosif_prepared_reader:font',next)};
window.addEventListener('popstate',()=>{const u=new URL(location.href);if(u.searchParams.get('book')!==BOOK){location.reload();return}const no=Number(u.searchParams.get('ch'))||1;const i=chapters.findIndex(c=>Number(c.no)===no);if(i>=0)go(i,false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeToc();if(e.key==='ArrowLeft'&&document.dir==='rtl')go(current+1,true);if(e.key==='ArrowRight'&&document.dir==='rtl')go(current-1,true)});

boot();
})();
