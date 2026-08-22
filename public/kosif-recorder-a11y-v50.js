/* KOSIF v50 — accessibility bridge for the manual UX recorder.
 * Adds accessible names only; does not change recorder behavior or captured data.
 */
(()=>{
  'use strict';
  if(window.__KOSIF_RECORDER_A11Y_V50__) return;
  window.__KOSIF_RECORDER_A11Y_V50__=true;

  function apply(){
    const dialog=document.getElementById('kosif-rec-report');
    const code=document.getElementById('kosif-rec-code');
    if(dialog && !dialog.getAttribute('aria-label') && !dialog.getAttribute('aria-labelledby')){
      dialog.setAttribute('aria-label','تقرير تسجيل تجربة المستخدم');
    }
    if(code && !code.getAttribute('aria-label') && !code.getAttribute('aria-labelledby')){
      code.setAttribute('aria-label','نص تقرير تسجيل تجربة المستخدم');
    }
    return Boolean(dialog && code);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  const observer=new MutationObserver(()=>{
    if(apply()) observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
