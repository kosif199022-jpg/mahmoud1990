/* KOSIF Canva Rose Calm V8 runtime finisher.
   Visual/typographic cleanup only. */
(()=>{'use strict';
const CSS='/kosif-canva-rose-v8.css?v=2026.08.20-rose-v8';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function mountCss(){
  if($('#kosif-canva-rose-v8-final'))return;
  const st=document.createElement('style');
  st.id='kosif-canva-rose-v8-final';
  st.textContent=`@import url("${CSS}");`;
  (document.body||document.documentElement).appendChild(st);
}
function theme(){
  const r=document.documentElement;
  try{if(!localStorage.getItem('kosif_theme'))localStorage.setItem('kosif_theme','light')}catch(_){}
  r.dataset.theme='light';
  r.dataset.kosifVisual='canva-rose-v8';
  const metas=[...document.querySelectorAll('meta[name="theme-color"]')];
  if(metas.length)metas.forEach(m=>m.setAttribute('content','#fff8f7'));
  else{const m=document.createElement('meta');m.name='theme-color';m.content='#fff8f7';document.head.appendChild(m)}
}
function normalizeWelcome(){
  const w=$('#kosif-premium-welcome');if(!w)return;
  w.setAttribute('aria-label','مرحبًا بك في KOSIF');
  const h=w.querySelector('.kcw-copy h2');if(h&&h.textContent.replace(/\s+/g,' ').trim()!=='مرحبًا بك ✦')h.innerHTML='مرحبًا بك <span aria-hidden="true">✦</span>';
  const p=w.querySelector('.kcw-copy p');if(p)p.textContent='بدأت رحلة المراجعة. كل شيء جاهز لتحقيق الامتثال بثقة وكفاءة، مع إبقاء القرار المهني النهائي تحت اعتماد المراجع البشري.';
}
function normalizeHero(){
  const hero=$('#view-overview>.card.hero');if(hero)hero.classList.add('kc-linkage-card');
  const title=hero?.querySelector('.card-h h2');if(title)title.textContent='ملف الارتباط';
  const btn=$('#btn-ov-entity');if(btn)btn.textContent='تحرير بيانات المنشأة';
}
function normalizeNumbers(){
  $$('#view-overview #kpis .kpi .v').forEach(x=>{
    const t=(x.textContent||'').replace(/[\s\u066C]/g,'').trim();
    const long=/^[\d٠-٩۰-۹,.-]+$/.test(t)&&t.length>=7;
    x.classList.toggle('kc-financial-number',long);
    if(long)x.dataset.kcLong='1';else delete x.dataset.kcLong;
  });
}
function normalizeNav(){
  const nav=$('#kosif-bottom-nav');if(!nav)return;
  nav.setAttribute('aria-label','التنقل الرئيسي في KOSIF');
  const labels={overview:'الرئيسية',tb:'الميزان',rounds:'الجولات',pbc:'المطالبات'};
  $$('[data-kgo]').forEach(b=>{const v=b.dataset.kgo;if(labels[v]){const svg=b.querySelector('svg')?.outerHTML||'';b.innerHTML=svg+labels[v]}});
}
function normalizeBrand(){
  $$('.brand-name').forEach(x=>x.textContent='KOSIF');
  const sub=$('.brand-sub');if(sub)sub.textContent='محاسبة • مراجعة • امتثال ذكي';
}
function polish(){theme();mountCss();normalizeBrand();normalizeWelcome();normalizeHero();normalizeNumbers();normalizeNav()}
function watch(){
  let raf=0;
  const run=()=>{raf=0;polish()};
  const mo=new MutationObserver(()=>{if(!raf)raf=requestAnimationFrame(run)});
  const host=$('#view-overview')||document.body;
  mo.observe(host,{childList:true,subtree:true,characterData:true});
  window.addEventListener('kosif-view-change',()=>requestAnimationFrame(polish));
  window.addEventListener('pageshow',()=>requestAnimationFrame(polish));
}
function init(){polish();watch();setTimeout(polish,120);setTimeout(polish,650)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
