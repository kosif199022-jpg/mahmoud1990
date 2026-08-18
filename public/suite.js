(()=>{'use strict';
const q=(s)=>document.querySelector(s);
fetch('/__version',{cache:'no-store'}).then(r=>r.json()).then(v=>{const e=q('#suite-version');if(e)e.textContent=`${v.suiteVersion||v.version||'v37'} · ${v.buildId||''}`}).catch(()=>{});
for(const a of document.querySelectorAll('.module,.primary,.secondary,.ghost'))a.addEventListener('pointerdown',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=a.getBoundingClientRect(),s=document.createElement('i');s.style.cssText=`position:absolute;pointer-events:none;width:12px;height:12px;border-radius:50%;background:rgba(99,102,241,.18);left:${e.clientX-r.left-6}px;top:${e.clientY-r.top-6}px;transform:scale(1);transition:.45s ease`;a.appendChild(s);requestAnimationFrame(()=>{s.style.transform='scale(18)';s.style.opacity='0'});setTimeout(()=>s.remove(),500)});
})();
