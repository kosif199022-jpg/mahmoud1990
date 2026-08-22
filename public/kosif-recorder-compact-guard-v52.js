/* KOSIF recorder compact guard v52.
 * Final UI guard: keeps the opt-in recorder control compact and clear of the bottom navigation
 * even if an older recorder stylesheet is cached by iOS/WebView.
 */
(() => {
  'use strict';
  if (window.__KOSIF_RECORDER_COMPACT_GUARD_V52__) return;
  window.__KOSIF_RECORDER_COMPACT_GUARD_V52__ = true;

  const STYLE_ID = 'kosif-recorder-compact-guard-v52-style';
  const BUTTON_ID = 'kosif-rec-btn';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #kosif-rec-ctl{
        left:10px!important;
        right:auto!important;
        bottom:calc(86px + env(safe-area-inset-bottom, 0px))!important;
        width:auto!important;
        max-width:70px!important;
        gap:4px!important;
        padding:0!important;
        margin:0!important;
        pointer-events:none!important;
      }
      #kosif-rec-btn{
        pointer-events:auto!important;
        box-sizing:border-box!important;
        width:44px!important;
        min-width:44px!important;
        max-width:44px!important;
        height:44px!important;
        min-height:44px!important;
        max-height:44px!important;
        padding:0!important;
        margin:0!important;
        border-radius:999px!important;
        overflow:hidden!important;
        white-space:nowrap!important;
        text-indent:-9999px!important;
        font-size:0!important;
        line-height:0!important;
        box-shadow:0 5px 16px rgba(15,23,42,.20)!important;
      }
      #kosif-rec-btn::after{
        content:'●'!important;
        display:grid!important;
        place-items:center!important;
        position:absolute!important;
        inset:0!important;
        text-indent:0!important;
        font-size:18px!important;
        line-height:44px!important;
        color:#ef4444!important;
      }
      #kosif-rec-btn[data-active='1']::after{
        content:'■'!important;
        font-size:14px!important;
        color:#fff!important;
      }
      #kosif-rec-live{
        pointer-events:none!important;
        position:absolute!important;
        left:50px!important;
        bottom:7px!important;
        min-height:28px!important;
        max-width:92px!important;
        padding:0 7px!important;
        font-size:10px!important;
        border-radius:999px!important;
      }
      @media (max-width:520px){
        #kosif-rec-ctl{left:8px!important;bottom:calc(82px + env(safe-area-inset-bottom, 0px))!important}
      }
    `;
    document.head.appendChild(style);
  }

  function compact() {
    ensureStyle();
    const button = document.getElementById(BUTTON_ID);
    if (!button) return false;
    button.setAttribute('aria-label', button.dataset.active === '1' ? 'إيقاف التسجيل' : 'بدء التسجيل');
    button.setAttribute('title', button.dataset.active === '1' ? 'إيقاف التسجيل' : 'بدء التسجيل');
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (compact() || attempts > 100) clearInterval(timer);
  }, 120);

  new MutationObserver(() => compact()).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-active', 'style', 'class']
  });
})();
