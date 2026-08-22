/* KOSIF recorder compatibility loader.
 * The old responsive-preview bridge is intentionally not mounted in the product UI.
 * It now forwards to the temporary manual recorder requested for live UX diagnostics.
 */
(() => {
  'use strict';
  if (window.__KOSIF_MANUAL_RECORDER_LOADER__) return;
  window.__KOSIF_MANUAL_RECORDER_LOADER__ = true;
  const id = 'kosif-manual-recorder-v50-loader';
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.src = '/kosif-manual-recorder-v50.js?v=2026.08.22-1';
  script.defer = true;
  document.head.appendChild(script);
})();
