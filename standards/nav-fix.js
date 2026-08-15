(()=>{
'use strict';
const READER='./standards/';
function goReader(e){
  if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();}
  window.location.href=READER;
}
function wire(){
  document.querySelectorAll('[data-go="library"]').forEach(el=>{
    if(el.dataset.fullReaderWired)return;
    el.dataset.fullReaderWired='1';
    el.addEventListener('click',goReader,true);
  });
  const view=document.querySelector('#view-library');
  if(view && !document.querySelector('#full-standards-reader-entry')){
    const box=document.createElement('div');
    box.id='full-standards-reader-entry';
    box.style.cssText='margin:0 0 14px;padding:16px;border:1px solid #d8c69d;border-radius:14px;background:#fffaf0;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    box.innerHTML='<div><b style="display:block;font-size:16px;margin-bottom:5px">المكتبة الكاملة — 3 كتب</b><span style="font-size:13px;opacity:.78">القراءة الصوتية، تكبير الخط، البحث، الحفظ والعلامات.</span></div><a href="./standards/" style="text-decoration:none;padding:10px 14px;border-radius:10px;background:#16232c;color:#fff;font-weight:700">فتح المكتبة الكاملة</a>';
    view.prepend(box);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
new MutationObserver(wire).observe(document.documentElement,{childList:true,subtree:true});
})();