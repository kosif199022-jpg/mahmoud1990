/* KOSIF v48 — semantic navigation + icon orchestration
 * Progressive enhancement only. Navigation labels/icons and layout; no business logic.
 */
(() => {
  'use strict';
  if (window.__KOSIF_NAVIGATION_V48__) return;
  window.__KOSIF_NAVIGATION_V48__ = true;

  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let queued = false;

  const PATHS = {
    home:'<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
    audit:'<path d="M7 3h10v4H7z"/><path d="M5 5h14v16H5z"/><path d="m8.5 13 2 2 5-5"/><path d="M8.5 18h7"/>',
    chart:'<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    council:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6"/><path d="M14.5 15.2c3.3-.6 5.3.9 6 4.8"/>',
    more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    balance:'<path d="M5 4h14v16H5z"/><path d="M5 9h14M10 4v16"/>',
    pbc:'<path d="M4 5h6l2 2h8v12H4z"/><path d="m8 13 2 2 4-4"/>',
    library:'<path d="M5 4h5v16H5zM14 4h5v16h-5z"/><path d="M10 7h4M10 17h4"/>',
    report:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 12h6M9 16h6"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/>',
    map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    note:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    source:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    ai:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="5"/><path d="M10 11h.01M14 11h.01M10 14c1.2 1 2.8 1 4 0"/>',
    theme:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18Z"/>',
    type:'<path d="M5 6V4h14v2M12 4v16M8 20h8"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    adjustments:'<path d="M4 7h10M17 7h3M4 17h3M10 17h10"/><circle cx="15.5" cy="7" r="1.5"/><circle cx="8.5" cy="17" r="1.5"/>'
  };

  function icon(name) {
    return `<svg class="k48-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">${PATHS[name] || PATHS.more}</svg>`;
  }

  function councilView() {
    if ($('section[data-view="council"]')) return 'council';
    if ($('section[data-view="v38-council"]')) return 'v38-council';
    return 'council';
  }

  function setNavButton(button, view, label, iconName) {
    if (!button) return;
    const signature = `${view}|${label}|${iconName}`;
    if (button.dataset.k48Nav === signature) return;
    button.dataset.kgo = view;
    button.dataset.k48Nav = signature;
    button.setAttribute('aria-label', label);
    button.innerHTML = `${icon(iconName)}<span>${esc(label)}</span>`;
  }

  function enhanceBottomNav() {
    const nav = $('#kosif-bottom-nav');
    if (!nav) return false;
    const buttons = $$('button[data-kgo]', nav);
    if (buttons.length < 4) return false;
    setNavButton(buttons[0], 'overview', 'الرئيسية', 'home');
    setNavButton(buttons[1], 'rounds', 'المراجعة', 'audit');
    setNavButton(buttons[2], 'analytics', 'التحليلات', 'chart');
    setNavButton(buttons[3], councilView(), 'المجلس', 'council');
    const more = $('#kosif-more-btn', nav);
    if (more && more.dataset.k48Nav !== 'more') {
      more.dataset.k48Nav = 'more';
      more.setAttribute('aria-label','المزيد');
      more.innerHTML = `${icon('more')}<span>المزيد</span>`;
    }
    nav.classList.add('k48-ready');
    syncActive();
    return true;
  }

  function actionIcon(action) {
    const view = action.dataset.go2 || '';
    const id = action.id || '';
    if (view === 'map') return 'map';
    if (view === 'analytics') return 'chart';
    if (view === 'pbc') return 'pbc';
    if (view === 'outputs') return 'report';
    if (view === 'reviewer') return 'note';
    if (view === 'library' || /books/i.test(id)) return 'library';
    if (view === 'sources') return 'source';
    if (view === 'settings') return 'settings';
    if (view === 'about') return 'info';
    if (/command/i.test(id)) return 'search';
    if (/ai-open/i.test(id)) return 'ai';
    if (/theme/i.test(id)) return 'theme';
    if (/font/i.test(id)) return 'type';
    if (view === 'adj-tb') return 'adjustments';
    return 'more';
  }

  function decorateMore() {
    $$('#kosif-more .kosif-action').forEach(action => {
      if (action.classList.contains('k48-action')) return;
      const small = $('small', action);
      const label = [...action.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ').trim() || action.getAttribute('aria-label') || 'إجراء';
      const description = small?.textContent?.trim() || '';
      action.innerHTML = `<span class="k48-action-icon">${icon(actionIcon(action))}</span><span class="k48-action-copy"><b>${esc(label)}</b>${description ? `<small>${esc(description)}</small>` : ''}</span>`;
      action.classList.add('k48-action');
      action.setAttribute('aria-label', label);
    });
  }

  const RAIL_ITEMS = [
    ['overview','الرئيسية','home'],
    ['rounds','المراجعة','audit'],
    ['tb','الميزان','balance'],
    ['pbc','المستندات','pbc'],
    ['analytics','التحليلات','chart'],
    ['__council__','المجلس','council'],
    ['library','المعايير','library'],
    ['outputs','التقارير','report'],
    ['settings','الإعدادات','settings']
  ];

  function goView(view) {
    try {
      if (typeof window.go === 'function') { window.go(view); return; }
      const target = document.querySelector(`[data-kgo="${view}"],[data-go="${view}"],[data-view-target="${view}"]`);
      if (target) { target.click(); return; }
      const section = document.querySelector(`section[data-view="${view}"]`);
      if (section) section.scrollIntoView({block:'start',behavior:'smooth'});
    } catch (_) {}
  }

  function mountDesktopRail() {
    let rail = $('#k48-desktop-rail');
    if (rail?.dataset.k48Mounted === '1') { syncActive(); return; }
    if (!rail) {
      rail = document.createElement('nav');
      rail.id = 'k48-desktop-rail';
      rail.setAttribute('aria-label','التنقل الرئيسي');
      document.body.appendChild(rail);
    }
    rail.innerHTML = RAIL_ITEMS.map(([rawView,label,iconName]) => {
      const view = rawView === '__council__' ? councilView() : rawView;
      if (!$(`section[data-view="${view}"]`)) return '';
      return `<button type="button" data-k48-view="${esc(view)}" aria-label="${esc(label)}">${icon(iconName)}<span class="k48-rail-label">${esc(label)}</span></button>`;
    }).join('') + `<button type="button" data-k48-more aria-label="المزيد">${icon('more')}<span class="k48-rail-label">المزيد</span></button>`;
    $$('[data-k48-view]', rail).forEach(button => button.addEventListener('click', () => goView(button.dataset.k48View)));
    $('[data-k48-more]', rail)?.addEventListener('click', () => $('#kosif-more')?.classList.add('show'));
    rail.dataset.k48Mounted = '1';
    syncActive();
  }

  function activeView() {
    return $('section[data-view].show')?.dataset.view || 'overview';
  }

  function syncActive() {
    const active = activeView();
    const nav = $('#kosif-bottom-nav');
    if (nav) {
      $$('button[data-kgo]', nav).forEach(button => {
        let on = button.dataset.kgo === active;
        if (button.dataset.kgo === 'rounds' && ['rounds','v38','v38-core'].includes(active)) on = true;
        if (button.dataset.kgo === 'analytics' && ['analytics','map','v38-graph'].includes(active)) on = true;
        if (button.dataset.kgo === councilView() && ['council','v38-council'].includes(active)) on = true;
        button.classList.toggle('active', on);
        if (on) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      });
    }
    $$('#k48-desktop-rail [data-k48-view]').forEach(button => {
      let on = button.dataset.k48View === active;
      if (button.dataset.k48View === 'rounds' && ['rounds','v38','v38-core'].includes(active)) on = true;
      if (button.dataset.k48View === 'analytics' && ['analytics','map','v38-graph'].includes(active)) on = true;
      if (button.dataset.k48View === councilView() && ['council','v38-council'].includes(active)) on = true;
      button.classList.toggle('active', on);
      if (on) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
  }

  function markSemanticIcons() {
    $$('button svg,.btn svg,.v38-btn svg,.tab svg').forEach(svg => {
      if (svg.dataset.k48Semantic === '1') return;
      svg.dataset.k48Semantic = '1';
      svg.setAttribute('aria-hidden','true');
      svg.setAttribute('focusable','false');
    });
  }

  function enhance() {
    queued = false;
    enhanceBottomNav();
    decorateMore();
    mountDesktopRail();
    markSemanticIcons();
    syncActive();
    document.documentElement.dataset.kosifNavigation = 'v48';
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enhance);
  }

  function boot() {
    enhance();
    window.addEventListener('kosif-view-change', schedule);
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-kgo],[data-go2],[data-go],[data-view-target],#kosif-more-btn')) setTimeout(schedule,40);
    }, true);
    if ('MutationObserver' in window) {
      new MutationObserver(records => {
        if (records.some(record => record.type === 'childList' && [...record.addedNodes].some(node => node.nodeType === 1 && (node.id === 'kosif-bottom-nav' || node.id === 'kosif-more' || node.querySelector?.('#kosif-bottom-nav,#kosif-more'))))) schedule();
      }).observe(document.body,{childList:true,subtree:true});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
