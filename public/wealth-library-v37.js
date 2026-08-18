/* Kosif v37 Mafateeh library router.
   Mafateeh stays in its original reader. Prepared standards/training books are
   intentionally opened in the first-party /libraries/reader.html runtime so
   they cannot share Mafateeh model bindings, service-worker scope or reading state. */
(()=>{
'use strict';
if(window.__KOSIF_WEALTH_LIBRARY_ROUTER__)return;window.__KOSIF_WEALTH_LIBRARY_ROUTER__=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const AR=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BOOK_BASE='/wealth/books';
let LIB=null;

const style=document.createElement('style');
style.textContent=`
#libShade{position:fixed;inset:0;background:#0a141bb0;z-index:170;opacity:0;pointer-events:none;transition:opacity .2s;backdrop-filter:blur(3px)}
#libShade.on{opacity:1;pointer-events:auto}
#libSheet{position:fixed;inset:auto 0 0 0;z-index:171;background:var(--bg,#fff);color:var(--ink,#111);border-radius:19px 19px 0 0;max-height:88dvh;display:flex;flex-direction:column;transform:translateY(101%);transition:transform .26s cubic-bezier(.32,.72,0,1);padding-bottom:env(safe-area-inset-bottom,0px);border-top:1px solid var(--line,#ddd);box-shadow:0 -24px 55px -34px rgba(12,22,44,.55)}
#libSheet.on{transform:none}
#libSheet header{display:flex;align-items:center;gap:9px;padding:14px 16px;border-bottom:1px solid var(--line,#ddd)}
#libSheet header b{flex:1;font-size:16px;font-weight:800}
#libSheet header button{width:44px;height:44px;border:0;background:none;font-size:17px;color:inherit;border-radius:12px}
#libSheet .body{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 16px 26px;overscroll-behavior:contain}
.lbk{display:block;width:100%;text-align:start;border:1px solid var(--line,#ddd);border-radius:15px;padding:17px;margin-bottom:12px;background:transparent;color:inherit}
.lbk[aria-current=true]{border-color:var(--gold,#B4894A);border-width:2px;background:color-mix(in srgb,var(--gold,#B4894A) 5%,transparent)}
.lbk h4{font-size:18px;margin:0 0 6px;line-height:1.5;font-weight:800}.lbk .s{font-size:13px;opacity:.72;line-height:1.6;margin-bottom:11px}
.lbk .m{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;opacity:.72;border-top:1px solid var(--line,#ddd);padding-top:10px;font-variant-numeric:tabular-nums}.lbk .m b{opacity:1;font-weight:800}
.lbadge{display:inline-block;font-size:11px;letter-spacing:.04em;border:1px solid currentColor;border-radius:99px;padding:2px 9px;margin-bottom:9px;color:var(--gold,#B4894A);font-variant-numeric:tabular-nums}
.lnote{font-size:12.5px;opacity:.72;line-height:1.8;margin:4px 0 16px}#libBtn{min-width:44px;min-height:44px}
@media(prefers-reduced-motion:reduce){#libShade,#libSheet{transition:none!important}}
`;
document.head.appendChild(style);

function ensureSheet(){
  if($('#libSheet'))return;
  document.body.insertAdjacentHTML('beforeend',`<div id="libShade"></div><section id="libSheet" role="dialog" aria-modal="true" aria-label="المكتبة" aria-hidden="true"><header><b>مكتبة Kosif</b><button id="libX" aria-label="إغلاق">✕</button></header><div class="body"><p class="lnote">«مفاتيح الثروة» يبقى في قارئه الأصلي. كتب المعايير والتدريب تفتح في قارئ Kosif مستقل حتى لا تختلط النماذج أو حالة القراءة أو Service Worker.</p><div id="libList"></div></div></section>`);
  $('#libX').onclick=closeLib;$('#libShade').onclick=closeLib;
}
function addButton(){
  ensureSheet();
  const bar=$('#top, #bar, .topbar, header');if(!bar||$('#libBtn'))return;
  const b=document.createElement('button');b.id='libBtn';b.className='ic';b.textContent='⌸';b.title='المكتبة';b.setAttribute('aria-label','فتح مكتبة Kosif');b.onclick=openLib;
  const menu=$('#bMenu')||bar.firstElementChild;menu?menu.after(b):bar.appendChild(b);
}
function openLib(){ensureSheet();const s=$('#libSheet');$('#libShade')?.classList.add('on');s?.classList.add('on');s?.setAttribute('aria-hidden','false');render()}
function closeLib(){const s=$('#libSheet');$('#libShade')?.classList.remove('on');s?.classList.remove('on');s?.setAttribute('aria-hidden','true')}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#libSheet')?.classList.contains('on'))closeLib()});

async function load(){if(LIB)return LIB;const r=await fetch(`${BOOK_BASE}/library.json?v=37-router-1`,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('library '+r.status);LIB=await r.json();return LIB}
async function render(){
  const list=$('#libList');if(!list)return;list.innerHTML='<p style="text-align:center;opacity:.6;padding:26px">…</p>';
  let lib;try{lib=await load()}catch{list.innerHTML='<p style="text-align:center;opacity:.6;padding:26px">تعذّر تحميل المكتبة.</p>';return}
  list.innerHTML=lib.map(b=>`<button class="lbk" data-b="${esc(b.id)}" aria-current="${b.id==='mafateeh'}"><span class="lbadge">${AR(b.year||'')}${b.audio?' · صوت':''}</span><h4>${esc(b.title)}</h4><div class="s">${esc(b.subtitle||'')}${b.author?' — '+esc(b.author):''}</div><div class="m"><span><b>${AR(b.parts||1)}</b> أبواب</span><span><b>${AR(b.chapters||0)}</b> فصلًا</span><span><b>${AR(Number(b.words||0).toLocaleString('en'))}</b> كلمة</span></div></button>`).join('');
  $$('#libList .lbk').forEach(x=>x.onclick=()=>openBook(x.dataset.b));
}
function openBook(id){
  if(id==='mafateeh'){closeLib();return}
  if(!['std2025','std2018','dipifr'].includes(id))return;
  location.assign('/libraries/reader.html?book='+encodeURIComponent(id));
}

addButton();new MutationObserver(addButton).observe(document.body,{childList:true,subtree:false});
console.log('[Kosif Wealth Library Router] prepared books isolated');
})();
