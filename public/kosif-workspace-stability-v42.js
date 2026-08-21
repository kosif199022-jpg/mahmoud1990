/* KOSIF Workspace Stability v42
 * UI continuity/command-center layer. It does not calculate or alter accounting conclusions.
 */
(() => {
  'use strict';
  if (window.__KOSIF_WORKSPACE_STABILITY_V42__) return;
  window.__KOSIF_WORKSPACE_STABILITY_V42__ = true;

  const root = document.documentElement;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const VIEW_KEY = 'kosif_workspace_view_v42';
  const SCROLL_KEY = 'kosif_workspace_scroll_v42';
  let scrollTimer = 0;
  let roundTimer = 0;

  function stateRef() {
    try { return typeof state !== 'undefined' && state && typeof state === 'object' ? state : {}; }
    catch (_) { return {}; }
  }
  function arr(value) { return Array.isArray(value) ? value : []; }
  function text(value) { return String(value ?? '').trim(); }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function currentView() {
    return $('section[data-view].show')?.dataset.view || document.body?.dataset.kosifCurrentView || 'overview';
  }
  function entity() {
    const s = stateRef();
    return s.entity && typeof s.entity === 'object' ? s.entity : {};
  }
  function companyName() {
    const e = entity();
    const pill = text($('#pill-entity')?.textContent).replace(/\s+/g, ' ');
    return text(e.name || $('#s-name')?.value || (!/اختر|غير محدد|لم تُحد/i.test(pill) ? pill : '')) || 'اختر الشركة';
  }
  function accounts() {
    const s = stateRef();
    return arr(s.tb).length ? arr(s.tb) : arr(s.accounts).length ? arr(s.accounts) : arr(s.trialBalance).length ? arr(s.trialBalance) : arr(s.rows);
  }
  function auditRounds() {
    const s = stateRef();
    return arr(s.rounds).length ? arr(s.rounds) : arr(s.auditRounds);
  }
  function requests() {
    const s = stateRef();
    return arr(s.pbc).length ? arr(s.pbc) : arr(s.requests).length ? arr(s.requests) : arr(s.documentsRequired);
  }
  function domNumber(selector) {
    const raw = text($(selector)?.textContent).replace(/[^0-9.-]/g, '');
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  function accountCount() { return accounts().length || domNumber('#kpi-accounts') || domNumber('[data-kpi="accounts"]'); }
  function roundCount() { return auditRounds().length || $$('#view-rounds .round').length || domNumber('#kpi-rounds'); }
  function pendingRequestCount() {
    const list = requests();
    if (!list.length) return $$('#view-pbc .docreq:not(.done),#view-pbc [data-status="open"]').length;
    return list.filter(item => !/done|complete|closed|received|تم|مكتمل|مستلم/i.test(text(item?.status || item?.state))).length;
  }
  function progress() {
    const e = entity();
    let score = 0;
    if (text(e.name || $('#s-name')?.value)) score += 15;
    if (text(e.period || $('#s-period')?.value)) score += 10;
    if (text(e.framework || $('#s-framework')?.value)) score += 10;
    if (accountCount()) score += 30;
    if (roundCount()) score += 20;
    if (requests().length && pendingRequestCount() === 0) score += 10;
    const s = stateRef();
    if (s.report || s.finalReport || s.opinion) score += 5;
    return Math.min(100, score);
  }
  function nextAction() {
    if (companyName() === 'اختر الشركة') return {view:'settings', label:'اختيار الشركة وبياناتها'};
    if (!accountCount()) return {view:'tb', label:'تحميل ميزان الشركة'};
    if (!roundCount()) return {view:'rounds', label:'بدء أول جولة مراجعة'};
    if (pendingRequestCount()) return {view:'pbc', label:'استكمال المطالبات المفتوحة'};
    return {view:'outputs', label:'مراجعة المخرجات والتقرير'};
  }

  function scrollMap() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function savePosition() {
    const view = currentView();
    const map = scrollMap();
    map[view] = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map));
      sessionStorage.setItem(VIEW_KEY, view);
    } catch (_) {}
  }
  function restorePosition(view = currentView()) {
    const top = Number(scrollMap()[view] || 0);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({top, behavior:'auto'})));
  }
  function goView(view, restore = false) {
    try {
      if (typeof window.go === 'function') window.go(view);
      else $('[data-kgo="' + CSS.escape(view) + '"]')?.click();
    } catch (_) { $('[data-kgo="' + view + '"]')?.click(); }
    try { sessionStorage.setItem(VIEW_KEY, view); } catch (_) {}
    setTimeout(() => {
      syncNav();
      syncWorkspace();
      if (restore) restorePosition(view); else window.scrollTo({top:0, behavior:'auto'});
    }, 30);
  }
  function syncNav() {
    const view = currentView();
    $$('#kosif-bottom-nav [data-kgo]').forEach(button => button.classList.toggle('active', button.dataset.kgo === view));
  }

  function mountCommandCenter() {
    const view = $('#view-overview');
    if (!view) return;
    let box = $('#kw42-command-center');
    if (!box) {
      box = document.createElement('section');
      box.id = 'kw42-command-center';
      box.className = 'kw42-command';
      view.prepend(box);
    }
    const next = nextAction();
    box.innerHTML = `
      <div class="kw42-command-head">
        <div><h1>مركز قيادة الارتباط</h1><p>شركة واحدة نشطة، بياناتها مرتبطة بها، والخطوة التالية واضحة.</p></div>
        <button class="kw42-command-company" type="button" data-kw42-company>${escapeHtml(companyName())}</button>
      </div>
      <div class="kw42-command-grid">
        <div class="kw42-stat"><b>${accountCount()}</b><span>حسابًا محمّلًا</span></div>
        <div class="kw42-stat"><b>${roundCount()}</b><span>جولات مراجعة</span></div>
        <div class="kw42-stat"><b>${pendingRequestCount()}</b><span>مطالبات مفتوحة</span></div>
        <div class="kw42-stat"><b>${progress()}%</b><span>تقدم الارتباط</span></div>
      </div>
      <div class="kw42-command-actions">
        <button class="primary" type="button" data-kw42-go="${next.view}">أكمل: ${escapeHtml(next.label)}</button>
        <button type="button" data-kw42-go="settings">تحرير بيانات المنشأة</button>
        <button type="button" data-kw42-go="rounds">الجولات</button>
      </div>`;
  }

  function syncCompanyLabels() {
    const name = companyName();
    const pill = $('#pill-entity');
    const e = entity();
    if (pill && name !== 'اختر الشركة' && text(pill.textContent) !== name) pill.textContent = name;
    const input = $('#s-name');
    if (input && e.name && input.value !== e.name) input.value = e.name;
    root.dataset.kosifCompanyContext = name === 'اختر الشركة' ? 'none' : 'loaded';
  }

  function decorateEntityFlow() {
    const settings = $('#view-settings');
    if (!settings) return;
    const card = $(':scope > .card', settings) || $('.card', settings);
    if (!card) return;
    let steps = $('.kw42-entity-steps', card);
    if (!steps) {
      steps = document.createElement('div');
      steps.className = 'kw42-entity-steps';
      const header = $('.card-h', card);
      if (header) header.insertAdjacentElement('afterend', steps); else card.prepend(steps);
    }
    const e = entity();
    const hasCompany = companyName() !== 'اختر الشركة';
    const hasContext = !!text(e.period || $('#s-period')?.value) && !!text(e.framework || $('#s-framework')?.value);
    const hasData = accountCount() > 0;
    steps.innerHTML = `
      <div class="kw42-entity-step ${hasCompany?'done':''}"><b>1 · الشركة</b><span>${hasCompany?'محددة ومحملة':'اختر أو أنشئ شركة'}</span></div>
      <div class="kw42-entity-step ${hasContext?'done':''}"><b>2 · الإطار والفترة</b><span>${hasContext?'مكتمل':'أكمل بيانات الارتباط'}</span></div>
      <div class="kw42-entity-step ${hasData?'done':''}"><b>3 · بيانات الشركة</b><span>${hasData?'الميزان والحسابات مرتبطة بالشركة':'حمّل بيانات الشركة مرة واحدة'}</span></div>`;
  }

  function compactRounds() {
    const view = $('#view-rounds');
    if (!view) return;
    $$('.round', view).forEach(round => {
      if (round.dataset.kw42Compact === '1') return;
      round.dataset.kw42Compact = '1';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'kw42-round-toggle';
      button.textContent = 'عرض تفاصيل الجولة';
      button.setAttribute('aria-expanded','false');
      button.addEventListener('click', () => {
        const open = round.classList.toggle('kw42-expanded');
        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? 'إخفاء التفاصيل' : 'عرض تفاصيل الجولة';
      });
      round.appendChild(button);
    });
  }

  function removeDelayArtifacts() {
    $('#kosif-boot')?.remove();
    // Preserve the v41 scroll-progress element: visual/runtime contracts query it directly.
    $('#kosif-motion-bg')?.remove();
    document.body?.classList.add('kosif-ready');
    $$('#view-overview [data-k41-reveal],section[data-view].show [data-k41-reveal]').forEach(el => {
      el.classList.add('k41-in');
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'none';
    });
  }

  function syncWorkspace() {
    root.dataset.kosifWorkspace = 'stable-v42';
    syncCompanyLabels();
    mountCommandCenter();
    decorateEntityFlow();
    compactRounds();
    syncNav();
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const goButton = event.target.closest?.('[data-kw42-go]');
      if (goButton) { event.preventDefault(); goView(goButton.dataset.kw42Go); return; }
      if (event.target.closest?.('[data-kw42-company]')) { event.preventDefault(); $('#pill-entity')?.click(); return; }

      const selectedCompany = event.target.closest?.('#kosif-company-list [data-cid]');
      if (selectedCompany) {
        /* Existing application code loads the full saved snapshot (state), not just the label. */
        setTimeout(() => { syncWorkspace(); goView('overview'); }, 180);
        return;
      }
      if (event.target.closest?.('#btn-save-entity,#btn-import,#btn-start-round,#btn-next-round,#btn-gen-report')) setTimeout(syncWorkspace, 180);

      const edit = event.target.closest?.('button,a');
      if (edit && /تحرير بيانات المنشأة/.test(text(edit.textContent)) && !edit.matches('[data-kw42-go]')) {
        event.preventDefault();
        goView('settings');
        setTimeout(() => $('#view-settings .card')?.scrollIntoView({block:'start',behavior:'auto'}), 40);
      }
    }, true);

    window.addEventListener('kosif-view-change', event => {
      try { sessionStorage.setItem(VIEW_KEY, event.detail?.view || currentView()); } catch (_) {}
      setTimeout(syncWorkspace, 0);
    });

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(savePosition, 100);
    }, {passive:true});
    window.addEventListener('pagehide', savePosition, {passive:true});
    window.addEventListener('pageshow', event => {
      removeDelayArtifacts();
      const view = (() => { try { return sessionStorage.getItem(VIEW_KEY); } catch (_) { return null; } })() || currentView();
      if (event.persisted || view !== currentView()) goView(view, true); else restorePosition(view);
      setTimeout(syncWorkspace, 40);
    }, {passive:true});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) savePosition();
      else { removeDelayArtifacts(); syncWorkspace(); restorePosition(currentView()); }
    }, {passive:true});
  }

  function watchRounds() {
    const target = $('#view-rounds');
    if (!target || !('MutationObserver' in window)) return;
    new MutationObserver(() => {
      clearTimeout(roundTimer);
      roundTimer = setTimeout(() => { compactRounds(); mountCommandCenter(); }, 80);
    }).observe(target,{childList:true,subtree:true});
  }

  function boot() {
    if (!$('#view-overview') || !$('#kosif-bottom-nav')) return;
    try { history.scrollRestoration = 'manual'; } catch (_) {}
    root.dataset.kosifWorkspace = 'stable-v42';
    removeDelayArtifacts();
    bindEvents();
    syncWorkspace();
    watchRounds();
    const remembered = (() => { try { return sessionStorage.getItem(VIEW_KEY); } catch (_) { return null; } })();
    if (remembered && remembered !== currentView()) goView(remembered, true); else restorePosition(currentView());
  }

  if (document.readyState === 'complete') setTimeout(boot,0);
  else window.addEventListener('load',() => setTimeout(boot,0),{once:true});
})();
