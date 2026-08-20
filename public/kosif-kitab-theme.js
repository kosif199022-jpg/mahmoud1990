/* Kosif — Kitab Caffe theme authority.
   Bounded final-layer pinning avoids stylesheet reload loops while still
   winning over the suite's known late visual injections. */
(() => {
  'use strict';
  if (window.__KOSIF_KITAB_THEME_RUNTIME__) return;
  window.__KOSIF_KITAB_THEME_RUNTIME__ = true;
  const HREF = '/kosif-kitab-theme.css?v=1.0.0-kitab';
  const ID = 'kosif-kitab-theme';
  const AUTHORITY = 'kitab-caffe';
  const PAPER = '#FBF4E1';
  const PAPER_DARK = '#171009';
  const root = document.documentElement;
  const head = document.head;
  if (!head || !root) return;
  let link = document.getElementById(ID);
  if (!link) {
    link = document.createElement('link');
    link.id = ID;
    link.rel = 'stylesheet';
    link.href = HREF;
    link.dataset.kosifThemeAuthority = AUTHORITY;
    head.appendChild(link);
  }
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  const LIGHT = {
    '--kc-cream':'#FBF4E1','--kc-cream-deep':'#F4E9CE','--kc-paper':'#FFFDF7','--kc-paper2':'#FDF7E8','--kc-espresso':'#2B1D0E','--kc-deep':'#1E1409','--kc-roast':'#3B2A14','--kc-roast2':'#4A3419','--kc-ink2':'#5A4327','--kc-muted':'#7A6647','--kc-muted2':'#9C8A66','--kc-line':'#E8DCBE','--kc-line2':'#DFD0AC','--kc-gold':'#F5A623','--kc-gold2':'#C87510','--kc-gold3':'#8F4F08','--kc-gold-light':'#F8B94F','--kc-gold-lift':'#FFC763','--kc-gold-soft':'#FFF1CF','--kc-gold-line':'#E7C574','--kc-ok':'#4E6B33','--kc-oksoft':'#EDF0E2','--kc-warn':'#9E6420','--kc-warnsoft':'#F9EDD9','--kc-danger':'#A8542E','--kc-dangersoft':'#F7E7DC','--kc-info':'#3F5D63','--kc-infosoft':'#E9EFEC','--kc-ai':'#6B4257','--kc-aisoft':'#F3E7EC'
  };
  const DARK = {
    '--kc-cream':'#171009','--kc-cream-deep':'#1E1409','--kc-paper':'#211710','--kc-paper2':'#2A1E14','--kc-espresso':'#F0E4CB','--kc-deep':'#FBF4E1','--kc-roast':'#2A1E14','--kc-roast2':'#33251A','--kc-ink2':'#D6C3A0','--kc-muted':'#B7A17C','--kc-muted2':'#8E7A58','--kc-line':'#3A2C1D','--kc-line2':'#4C3B27','--kc-gold':'#F5A623','--kc-gold2':'#F8B94F','--kc-gold3':'#FFD47B','--kc-gold-light':'#FFC763','--kc-gold-lift':'#FFD47B','--kc-gold-soft':'#2A2113','--kc-gold-line':'#5C4A24','--kc-ok':'#8FAE6A','--kc-oksoft':'#1C2414','--kc-warn':'#D2954A','--kc-warnsoft':'#2A1F10','--kc-danger':'#D98156','--kc-dangersoft':'#2C170F','--kc-info':'#82A8AE','--kc-infosoft':'#14201F','--kc-ai':'#B98CA2','--kc-aisoft':'#241722'
  };
  const explicitMode = () => {
    const value = String(root.dataset.theme || '').toLowerCase();
    if (value === 'dark') return 'dark';
    if (value === 'light' || value === 'sepia') return 'light';
    return '';
  };
  /* Warm paper is the product default. Persist it once so the legacy
     continuity layer cannot reinterpret a missing preference as dark mode. */
  try {
    const saved = String(localStorage.getItem('kosif_theme') || '').toLowerCase();
    if (saved === 'dark' || saved === 'light' || saved === 'sepia') root.dataset.theme = saved;
    else { root.dataset.theme = 'light'; localStorage.setItem('kosif_theme', 'light'); }
  } catch { if (!explicitMode()) root.dataset.theme = 'light'; }
  const applyMode = () => {
    const mode = explicitMode();
    const vars = mode === 'dark' ? DARK : mode === 'light' ? LIGHT : null;
    for (const key of Object.keys(LIGHT)) {
      if (vars) root.style.setProperty(key, vars[key]);
      else root.style.removeProperty(key);
    }
    root.style.colorScheme = mode || '';
    const isDark = mode === 'dark' || (!mode && systemDark && systemDark.matches);
    let meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; head.appendChild(meta); }
    meta.content = isDark ? PAPER_DARK : PAPER;
    document.querySelectorAll('meta[name="theme-color"][media]').forEach(m => { m.content = /dark/.test(m.media) ? PAPER_DARK : PAPER; });
  };
  const pin = () => {
    if (link.isConnected && head.lastElementChild !== link) head.appendChild(link);
    root.dataset.kosifTheme = AUTHORITY;
    root.dataset.kosifUnifiedTheme = AUTHORITY;
  };
  const sync = () => { applyMode(); pin(); };
  sync();
  if (systemDark && systemDark.addEventListener) systemDark.addEventListener('change', applyMode);
  new MutationObserver(applyMode).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  /* Fallback for late UI rewrites: preserve the app handler when present and
     only toggle if a theme-control click made no change at all. */
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#kosif-theme-toggle')) return;
    const before = explicitMode() || 'light';
    setTimeout(() => {
      if ((explicitMode() || 'light') !== before) return;
      const next = before === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('kosif_theme', next); } catch {}
    }, 0);
  }, true);
  /* Known suite layers finish during boot. Re-pin a bounded number of times;
     never observe <head> continuously, which can fight other stylesheet owners. */
  for (const delay of [0, 120, 350, 800, 1600, 3200, 6000]) setTimeout(pin, delay);
})();
