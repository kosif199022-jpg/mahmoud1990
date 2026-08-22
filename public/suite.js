(()=>{'use strict';
const q=(s)=>document.querySelector(s),head=document.head;
if(head){let l=document.getElementById('kosif-kitab-theme');if(!l){l=document.createElement('link');l.id='kosif-kitab-theme';l.rel='stylesheet';l.href='/kosif-kitab-theme.css?v=1.0.0-kitab';l.dataset.kosifThemeAuthority='kitab-caffe';head.appendChild(l)}let s=document.getElementById('kosif-kitab-theme-runtime');if(!s){s=document.createElement('script');s.id='kosif-kitab-theme-runtime';s.src='/kosif-kitab-theme.js?v=1.0.0-kitab';s.defer=true;head.appendChild(s)}document.documentElement.dataset.kosifUnifiedTheme='kitab-caffe'}
fetch('/__version',{cache:'no-store'}).then(r=>r.json()).then(v=>{const e=q('#suite-version');if(e)e.textContent=`${v.suiteVersion||v.version||'v38'} · ${v.buildId||''}`}).catch(()=>{});
function mountPreviewLab(){
  const grid=q('.module-grid');
  if(grid&&!q('.module.preview-lab')){
    const a=document.createElement('a');
    a.className='module preview-lab';
    a.href='/preview/';
    a.innerHTML='<span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h10M7 11h6"/></svg></span><span class="chip">مختبر الواجهات</span><h3>Preview Lab</h3><p>معاينة Kosif على الجوال والتابلت واللابتوب والشاشات الكبيرة، مع فحص responsive وoverflow والوصولية السريعة.</p><ul><li>Apple / Android / Desktop</li><li>Single / Split / Matrix / Fluid</li><li>QA Audit + Inspect + Safe Area</li></ul><strong>فتح مختبر المعاينة ←</strong>';
    grid.appendChild(a);
  }
  const status=q('.status');if(status)status.textContent=status.textContent.replace('ثلاثة مسارات','أربعة مسارات');
  const metric=q('.hero-metrics article:first-child b');if(metric&&metric.textContent.trim()==='3')metric.textContent='4';
  const brandSub=q('.suite-head .brand small');if(brandSub&&!brandSub.textContent.includes('المعاينة'))brandSub.textContent+=' · المعاينة';
  if(head&&!q('#kosif-preview-hub-style')){
    const st=document.createElement('style');st.id='kosif-preview-hub-style';
    st.textContent='.module-grid{grid-template-columns:1.25fr 1fr 1fr 1fr!important}.module.preview-lab{border-top:4px solid #0B8B7C!important}.module.preview-lab .module-icon{background:#E4F2ED!important;color:#0B8B7C!important}@media(max-width:1180px){.module-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:840px){.module-grid{grid-template-columns:1fr!important}}';
    head.appendChild(st);
  }
}
mountPreviewLab();
for(const a of document.querySelectorAll('.module,.primary,.secondary,.ghost'))a.addEventListener('pointerdown',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=a.getBoundingClientRect(),s=document.createElement('i');s.style.cssText=`position:absolute;pointer-events:none;width:12px;height:12px;border-radius:50%;background:rgba(184,134,43,.20);left:${e.clientX-r.left-6}px;top:${e.clientY-r.top-6}px;transform:scale(1);transition:.45s ease`;a.appendChild(s);requestAnimationFrame(()=>{s.style.transform='scale(18)';s.style.opacity='0'});setTimeout(()=>s.remove(),500)});
})();
