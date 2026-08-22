/* KOSIF manual recorder v51 compatibility loader.
 * Keeps the recorder opt-in: recording starts only after the visible compact control is pressed.
 */
(() => {
  'use strict';
  if (window.__KOSIF_MANUAL_RECORDER_LOADER_V51__) return;
  window.__KOSIF_MANUAL_RECORDER_LOADER_V51__ = true;

  const files = [
    ['/kosif-manual-recorder-v50.js?v=2026.08.22-2', 'kosif-manual-recorder-v50-loader'],
    ['/kosif-rec-v51-core.js?v=2026.08.22-2', 'kosif-rec-v51-core-loader'],
    ['/kosif-rec-v51-observe.js?v=2026.08.22-2', 'kosif-rec-v51-observe-loader'],
    ['/kosif-rec-v51-visual.js?v=2026.08.22-2', 'kosif-rec-v51-visual-loader']
  ];

  function load(index) {
    if (index >= files.length) return;
    const [src, id] = files[index];
    if (document.getElementById(id)) { load(index + 1); return; }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    script.onload = () => load(index + 1);
    script.onerror = () => load(index + 1);
    document.head.appendChild(script);
  }

  load(0);
})();
