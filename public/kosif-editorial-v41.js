/* KOSIF Editorial Stable — fast mobile-first orchestration.
 * Keeps professional accounting/audit logic intact and only coordinates UI/state presentation.
 */
(() => {
  'use strict';
  if (window.__KOSIF_EDITORIAL_STABLE__) return;
  window.__KOSIF_EDITORIAL_STABLE__ = true;

  const root = document.documentElement;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const VIEW_KEY = 'kosif_ui_active_view_v42';
  const SCROLL_KEY = 'kosif_ui_scroll_v42';
  let scrollTimer = 0;
  let roundTimer = 0;

  function ensureStyles() {
    if ($('#kosif-editorial-v41')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/kosif-editorial-v41.css?v=2026.08.21-stable-1';
    link.id = 'kosif-editorial-v41';
    document.head.appendChild(link);
  }

  function currentView() {
    return $('section[data-view].show')?.dataset.view || document.body?.dataset.kosifCurrentView || 'overview';
  }

  function safeState() {
    try { return typeof state !== 'undefined' && state && typeof state === 'object' ? state : {}; }
    catch (_) { return {}; }
  }

  function asArray(value) { return Array.isArray(value) ? value : []; }

  function entityOf() {
    const s = safeState();
    return s.entity && typeof s.entity === 'object' ? s.entity : {};
  }

  function companyName() {
    const entity = entityOf();
    return String(entity.name || $('#s-name')?.value || $('#pill-entity')?.textContent || 'اختر الشركة').trim() || 'اختر الشركة';
  }

  function trialBalance() {
    const s = safeState();
    return asArray(s.tb || s.trialBalance || s.accounts);
  }

  function rounds() {
    const s = safeState();
    return asArray(s.rounds || s.auditRounds);
  }

  function pbcItems() {
    const s = safeState();
    return asArray(s.pbc || s.requests || s.documentsRequired);
  }

  function pendingPbcCount() {
    return pbcItems().filter(item => {
      const status = String(item?.status || item?.state || '').toLowerCase();
      return !/done|complete|closed|received|تم|مكتمل|مستلم/.test(status);
    }).length;
  }

  function progressValue() {
    const entity = entityOf();
    let score = 0;
    if (entity.name) score += 15;
    if (entity.period || $('#s-period')?.value) score += 10;
    if (trialBalance().length) score += 30;
    if (rounds().length) score += 25;
    if (pbcItems().length && pendingPbcCount() === 0) score += 10;
    const s = safeState();
    if (s.report || s.finalReport || s.opinion) score += 10;
    return Math.min(100, score);
  }

  function nextAction() {
    if (!entityOf().name) return { view: 'settings', label: 'اختيار الشركة وبياناتها' };
    if (!trialBalance().length) return { view: 'tb', label: 'تحميل ميزان الشركة' };
    if (!rounds().length) return { view: 'rounds', label: 'بدء أول جولة مراجعة' };
    if (pendingPbcCount()) return { view: 'pbc', label: 'استكمال المطالبات المفتوحة' };
    return { view: 'outputs', label: 'مراجعة المخرجات والتقرير' };
  }

  function goView(view, restore = false) {
    try {
      if (typeof go === 'function') go(view);
      else $('[data-kgo="' + CSS.escape(view) + '"]')?.click();
    } catch (_) {
      $('[data-kgo="' + view + '"]')?.click();
    }
    sessionStorage.setItem(VIEW_KEY, view);
    setTimeout(() => {
      syncNavState();
      syncWorkspace();
      if (restore) restoreScroll(view);
      else window.scrollTo({ top: 0, behavior: 'auto' });
    }, 20);
  }

  function syncNavState() {
    const view = currentView();
    $$('#kosif-bottom-nav [data-kgo]').forEach(button => button.classList.toggle('active', button.dataset.kgo === view));
  }

  function scrollMap() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }

  function saveScroll() {
    const view = currentView();
    const map = scrollMap();
    map[view] = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map));
    sessionStorage.setItem(VIEW_KEY, view);
  }

  function restoreScroll(view = currentView()) {
    const top = Number(scrollMap()[view] || 0);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top, behavior: 'auto' })));
  }

  function bindContinuity() {
    try { history.scrollRestoration = 'manual'; } catch (_) {}
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(saveScroll, 90);
    }, { passive: true });
    window.addEventListener('pagehide', saveScroll, { passive: true });
    window.addEventListener('pageshow', event => {
      document.body.classList.add('kosif-ready');
      $('#kosif-boot')?.remove();
      const view = sessionStorage.getItem(VIEW_KEY) || currentView();
      if (event.persisted || view !== currentView()) goView(view, true);
      else restoreScroll(view);
      setTimeout(syncWorkspace, 40);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) saveScroll();
      else { syncWorkspace(); restoreScroll(currentView()); }
    }, { passive: true });
    window.addEventListener('kosif-view-change', () => {
      sessionStorage.setItem(VIEW_KEY, currentView());
      syncWorkspace();
      syncNavState();
    });
  }

  function mountCommandCenter() {
    const view = $('#view-overview');
    if (!view) return;
    let box = $('#k42-command-center');
    if (!box) {
      box = document.createElement('section');
      box.id = 'k42-command-center';
      box.className = 'k42-command';
      view.prepend(box);
    }
    const next = nextAction();
    box.innerHTML = `
      <div class="k42-command-head">
        <div><h1>مركز قيادة الارتباط</h1><p>شركة واحدة نشطة · حالة واحدة · والخطوة التالية واضحة.</p></div>
        <button class="k42-command-company" type="button" data-k42-company>${escapeHtml(companyName())}</button>
      </div>
      <div class="k42-command-grid">
        <div class="k42-stat"><b>${trialBalance().length}</b><span>حسابًا محمّلًا</span></div>
        <div class="k42-stat"><b>${rounds().length}</b><span>جولات مراجعة</span></div>
        <div class="k42-stat"><b>${pendingPbcCount()}</b><span>مطالبات مفتوحة</span></div>
        <div class="k42-stat"><b>${progressValue()}%</b><span>تقدم الارتباط</span></div>
      </div>
      <div class="k42-command-actions">
        <button class="primary" type="button" data-k42-go="${next.view}">أكمل: ${escapeHtml(next.label)}</button>
        <button type="button" data-k42-go="settings">تحرير بيانات المنشأة</button>
        <button type="button" data-k42-go="rounds">الجولات</button>
      </div>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  }

  function syncCompanyNames() {
    const name = companyName();
    const pill = $('#pill-entity');
    if (pill && pill.textContent.trim() !== name) pill.textContent = name;
    const input = $('#s-name');
    const entity = entityOf();
    if (input && entity.name && input.value !== entity.name) input.value = entity.name;
    document.title = name && name !== 'اختر الشركة' ? `Kosif · ${name}` : 'Kosif';
  }

  function decorateEntityFlow() {
    const card = $('#view-settings > .card');
    if (!card) return;
    let steps = $('.k42-entity-steps', card);
    if (!steps) {
      steps = document.createElement('div');
      steps.className = 'k42-entity-steps';
      const header = $('.card-h', card);
      header?.insertAdjacentElement('afterend', steps);
    }
    const e = entityOf();
    const hasName = !!String(e.name || $('#s-name')?.value || '').trim();
    const hasContext = !!String(e.period || $('#s-period')?.value || '').trim() && !!$('#s-framework')?.value;
    const hasTb = trialBalance().length > 0;
    steps.innerHTML = `
      <div class="k42-entity-step ${hasName?'done':''}"><b>1 · الشركة</b><span>${hasName?'محددة':'اختر أو أنشئ شركة'}</span></div>
      <div class="k42-entity-step ${hasContext?'done':''}"><b>2 · الإطار والفترة</b><span>${hasContext?'مكتمل':'أكمل بيانات الارتباط'}</span></div>
      <div class="k42-entity-step ${hasTb?'done':''}"><b>3 · بيانات الشركة</b><span>${hasTb?'الميزان والحسابات محملة':'حمّل الميزان مرة واحدة'}</span></div>`;
  }

  function compactRounds() {
    const view = $('#view-rounds');
    if (!view) return;
    $$('.round', view).forEach((round, index) => {
      if (round.dataset.k42Compact === '1') return;
      round.dataset.k42Compact = '1';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'k42-round-toggle';
      button.textContent = 'عرض تفاصيل الجولة';
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => {
        const open = round.classList.toggle('k42-expanded');
        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? 'إخفاء التفاصيل' : 'عرض تفاصيل الجولة';
      });
      round.appendChild(button);
      if (index === 0 && rounds().length <= 1) round.classList.add('k42-expanded');
    });
  }

  function removeLegacyEffects() {
    $('#kosif-motion-bg')?.remove();
    $('#k41-scroll-progress')?.remove();
    $$('.kosif-tilt,.k41-in,[data-k41-reveal]').forEach(el => {
      el.classList.remove('kosif-tilt','k41-in');
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      delete el.dataset.k41Reveal;
    });
    const boot = $('#kosif-boot');
    if (boot) boot.remove();
    document.body.classList.add('kosif-ready');
  }

  function syncWorkspace() {
    root.dataset.kosifEdition = 'v41';
    root.dataset.kosifExperience = 'stable';
    root.dataset.kosifRevision = '2026.08.21-stable-1';
    syncCompanyNames();
    mountCommandCenter();
    decorateEntityFlow();
    compactRounds();
    syncNavState();
  }

  function bindActions() {
    document.addEventListener('click', event => {
      const goButton = event.target.closest?.('[data-k42-go]');
      if (goButton) { event.preventDefault(); goView(goButton.dataset.k42Go); return; }
      if (event.target.closest?.('[data-k42-company]')) {
        event.preventDefault();
        $('#pill-entity')?.click();
        return;
      }
      const selectedCompany = event.target.closest?.('#kosif-company-list [data-cid]');
      if (selectedCompany) setTimeout(() => { syncWorkspace(); goView('overview'); }, 140);
      if (event.target.closest?.('#btn-save-entity,#btn-import,#btn-start-round,#btn-next-round,#btn-gen-report')) setTimeout(syncWorkspace, 160);
      const legacyEdit = event.target.closest?.('button,a');
      if (legacyEdit && /تحرير بيانات المنشأة/.test(legacyEdit.textContent || '') && !legacyEdit.dataset.k42Go) {
        event.preventDefault();
        goView('settings');
        setTimeout(() => $('#view-settings > .card')?.scrollIntoView({ block:'start', behavior:'auto' }), 30);
      }
    });
  }

  function observeRoundsOnly() {
    const target = $('#view-rounds');
    if (!target || !('MutationObserver' in window)) return;
    new MutationObserver(() => {
      clearTimeout(roundTimer);
      roundTimer = setTimeout(() => { compactRounds(); mountCommandCenter(); }, 70);
    }).observe(target, { childList:true, subtree:true });
  }

  function boot() {
    ensureStyles();
    root.dataset.kosifEdition = 'v41';
    root.dataset.kosifExperience = 'stable';
    root.dataset.kosifRevision = '2026.08.21-stable-1';
    removeLegacyEffects();
    bindContinuity();
    bindActions();
    syncWorkspace();
    observeRoundsOnly();
    const remembered = sessionStorage.getItem(VIEW_KEY);
    if (remembered && remembered !== currentView()) goView(remembered, true);
    else restoreScroll(currentView());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
