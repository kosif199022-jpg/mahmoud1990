/* KOSIF Workspace Stability v42 loader — intentionally runs after the governed v41 visual runtime. */
(() => {
  'use strict';
  if (window.__KOSIF_WORKSPACE_STABILITY_LOADER_V42__) return;
  window.__KOSIF_WORKSPACE_STABILITY_LOADER_V42__ = true;

  function mount() {
    if (!document.querySelector('#view-overview') || !document.querySelector('#kosif-bottom-nav')) return;
    let css = document.querySelector('#kosif-workspace-stability-css');
    if (!css) {
      css = document.createElement('link');
      css.id = 'kosif-workspace-stability-css';
      css.rel = 'stylesheet';
      css.href = '/kosif-workspace-stability-v42.css?v=2026.08.21-3';
    }
    document.head.appendChild(css);

    if (!document.querySelector('#kosif-workspace-stability-runtime')) {
      const script = document.createElement('script');
      script.id = 'kosif-workspace-stability-runtime';
      script.src = '/kosif-workspace-stability-v42.js?v=2026.08.21-3';
      script.defer = true;
      document.body.appendChild(script);
    }
  }

  if (document.readyState === 'complete') setTimeout(mount, 0);
  else window.addEventListener('load', () => setTimeout(mount, 0), {once:true});
})();
