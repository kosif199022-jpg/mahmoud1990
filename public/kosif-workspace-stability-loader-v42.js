/* KOSIF Workspace Stability v42 loader — intentionally runs after the governed v41 visual runtime. */
(() => {
  'use strict';
  if (window.__KOSIF_WORKSPACE_STABILITY_LOADER_V42__) return;
  window.__KOSIF_WORKSPACE_STABILITY_LOADER_V42__ = true;

  function addCss(id, href) {
    let css = document.querySelector('#' + id);
    if (!css) {
      css = document.createElement('link');
      css.id = id;
      css.rel = 'stylesheet';
      css.href = href;
      document.head.appendChild(css);
    }
    return css;
  }

  function addScript(id, src) {
    if (document.querySelector('#' + id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function keepFinalVisualAuthority() {
    const visual = document.querySelector('#kosif-visual-system-v45');
    if (visual && visual.parentNode === document.head) {
      // Reusing and moving the existing node keeps one request while ensuring late
      // stability/company fixes cannot restore historical colors and dimensions.
      document.head.appendChild(visual);
    }
  }

  function mount() {
    if (!document.querySelector('#view-overview') || !document.querySelector('#kosif-bottom-nav')) return;

    addCss('kosif-workspace-stability-css', '/kosif-workspace-stability-v42.css?v=2026.08.21-4');
    addCss('kosif-company-sheet-fix-css', '/kosif-company-sheet-fix-v43.css?v=2026.08.21-1');
    keepFinalVisualAuthority();

    addScript('kosif-workspace-stability-runtime', '/kosif-workspace-stability-v42.js?v=2026.08.21-4');
    addScript('kosif-company-sheet-fix-runtime', '/kosif-company-sheet-fix-v43.js?v=2026.08.21-1');
  }

  if (document.readyState === 'complete') setTimeout(mount, 0);
  else window.addEventListener('load', () => setTimeout(mount, 0), {once:true});
})();
