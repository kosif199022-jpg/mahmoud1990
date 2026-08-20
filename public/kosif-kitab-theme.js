/* Kosif — Kitab Caffe theme authority.
   Keeps the user-approved visual layer last after late UI injections. */
(() => {
  'use strict';
  const HREF = '/kosif-kitab-theme.css?v=1.0.0-kitab';
  const ID = 'kosif-kitab-theme';
  const AUTHORITY = 'kitab-caffe';
  const PAPER = '#FBF4E1';
  const PAPER_DARK = '#171009';
  const head = document.head;
  if (!head) return;
  let link = document.getElementById(ID);
  if (!link) {
    link = document.createElement('link');
    link.id = ID;
    link.rel = 'stylesheet';
    link.href = HREF;
    link.dataset.kosifThemeAuthority = AUTHORITY;
    head.appendChild(link);
  }
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  const paintChrome = () => {
    const colour = dark && dark.matches ? PAPER_DARK : PAPER;
    let meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; head.appendChild(meta); }
    meta.content = colour;
    document.querySelectorAll('meta[name="theme-color"][media]').forEach(m => { m.content = /dark/.test(m.media) ? PAPER_DARK : PAPER; });
  };
  const pin = () => {
    if (link.isConnected && head.lastElementChild !== link) head.appendChild(link);
    document.documentElement.dataset.kosifTheme = AUTHORITY;
    document.documentElement.dataset.kosifUnifiedTheme = AUTHORITY;
  };
  pin(); paintChrome();
  if (dark && dark.addEventListener) dark.addEventListener('change', paintChrome);
  new MutationObserver(records => {
    for (const r of records) for (const n of r.addedNodes) {
      if (n === link || n?.nodeType !== 1) continue;
      const isSheet = n.tagName === 'STYLE' || (n.tagName === 'LINK' && String(n.rel || '').toLowerCase() === 'stylesheet');
      if (isSheet) { queueMicrotask(pin); return; }
    }
  }).observe(head, { childList: true });
  for (const t of [250, 900, 1800, 3200]) setTimeout(pin, t);
})();
