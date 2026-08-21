/* KOSIF Workspace Stability v42b
 * UI continuity and compact audit workspace. No accounting calculations or professional conclusions.
 */
(() => {
  'use strict';
  if (window.__KOSIF_WORKSPACE_STABILITY_V42B__) return;
  window.__KOSIF_WORKSPACE_STABILITY_V42B__ = true;

  const root = document.documentElement;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const VIEW_KEY = 'kosif_workspace_view_v42';
  const SCROLL_KEY = 'kosif_workspace_scroll_v42';
  let scrollTimer = 0;
  let roundsTimer = 0;

  const trim = value => String(value ?? '').trim();
  const list = value => Array.isArray(value) ? value : [];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function appState() {
    try { return typeof state !== 'undefined' && state && typeof state === 'object' ? state : {}; }
    catch (_) { return {}; }
  }
  function entity() {
    const value = appState().entity;
    return value && typeof value === 'object' ? value : {};
  }
  function currentView() {
    return $('section[data-view].show')?.dataset.view || document.body?.dataset.kosifCurrentView || 'overview';
  }
  function companyName() {
    const e = entity();
    const pill = trim($('#pill-entity')?.textContent).replace(/\s+/g,' ');
    const pillName = /اختر|غير محدد|لم تُحد/i.test(pill) ? '' : pill;
    return trim(e.name || $('#s-name')?.value || pillName) || 'اختر الشركة';
  }
  function accounts() {
    const s = appState();
    for (const candidate of [s.tb,s.accounts,s.trialBalance,s.rows]) if (list(candidate).length) return list(candidate);
    return [];
  }
  function auditRounds() {
    const s = appState();
    return list(s.rounds).length ? list(s.rounds) : list(s.auditRounds);
  }
  function pbc() {
    const s = appState();
    for (const candidate of [s.pbc,s.requests,s.documentsRequired]) if (list(candidate).length) return list(candidate);
    return [];
  }
  function numericText(selector) {
    const n = Number(trim($(selector)?.textContent).replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : 0;
  }
  function accountCount() { return accounts().length || numericText('#kpi-accounts') || numericText('[data-kpi="accounts"]'); }
  function roundCount() { return auditRounds().length || $$('#view-rounds .round').length || numericText('#kpi-rounds'); }
  function pendingPbc() {
    const rows = pbc();
    if (!rows.length) return $$('#view-pbc .docreq:not(.done),#view-pbc [data-status="open"]').length;
    return rows.filter(row => !/done|complete|closed|received|تم|مكتمل|مستلم/i.test(trim(row?.status || row?.state))).length;
  }
  function progress() {
    const e = entity();
    let value = 0;
    if (companyName() !== 'اختر الشركة') value += 15;
    if (trim(e.period || $('#s-period')?.value)) value += 10;
    if (trim(e.framework || $('#s-framework')?.value)) value += 10;
    if (accountCount()) value += 30;
    if (roundCount()) value += 20;
    if (pbc().length && pendingPbc() === 0) value += 10;
    const s = appState();
    if (s.report || s.finalReport || s.opinion) value += 5;
    return Math.min(100,value);
  }
  function nextAction() {
    if (companyName() === 'اختر الشركة') return {view:'settings',label:'اختيار الشركة وبياناتها'};
    if (!accountCount()) return {view:'tb',label:'تحميل ميزان الشركة'};
    if (!roundCount()) return {view:'rounds',label:'بدء أول جولة مراجعة'};
    if (pendingPbc()) return {view:'pbc',label:'استكمال المطالبات المفتوحة'};
    return {view:'outputs',label:'مراجعة المخرجات والتقرير'};
  }

  function readScrollMap() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function savePosition() {
    const view = currentView();
    const map = readScrollMap();
    map[view] = Math.max(0,window.scrollY || document.documentElement.scrollTop || 0);
    try {
      sessionStorage.setItem(SCROLL_KEY,JSON.stringify(map));
      sessionStorage.setItem(VIEW_KEY,view);
    } catch (_) {}
  }
  function restorePosition(view=currentView()) {
    const y = Number(readScrollMap()[view] || 0);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({top:y,behavior:'auto'})));
  }
  function goView(view,restore=false) {
    try {
      if (typeof window.go === 'function') window.go(view);
      else $('[data-kgo="'+CSS.escape(view)+'"]')?.click();
    } catch (_) { $('[data-kgo="'+view+'"]')?.click(); }
    try { sessionStorage.setItem(VIEW_KEY,view); } catch (_) {}
    setTimeout(() => {
      syncNav();
      syncWorkspace();
      if (restore) restorePosition(view); else window.scrollTo({top:0,behavior:'auto'});
    },30);
  }
  function syncNav() {
    const view = currentView();
    $$('#kosif-bottom-nav [data-kgo]').forEach(button => button.classList.toggle('active',button.dataset.kgo === view));
  }

  function commandCenter() {
    const host = $('#view-overview');
    if (!host) return;
    let box = $('#kw42-command-center');
    if (!box) {
      box = document.createElement('section');
      box.id = 'kw42-command-center';
      box.className = 'kw42-command';
      host.prepend(box);
    }
    const next = nextAction();
    box.innerHTML = `<div class="kw42-command-head"><div><h1>مركز قيادة الارتباط</h1><p>شركة واحدة نشطة، بياناتها مرتبطة بها، والخطوة التالية واضحة.</p></div><button class="kw42-command-company" type="button" data-kw42-company>${escapeHtml(companyName())}</button></div><div class="kw42-command-grid"><div class="kw42-stat"><b>${accountCount()}</b><span>حسابًا محمّلًا</span></div><div class="kw42-stat"><b>${roundCount()}</b><span>جولات مراجعة</span></div><div class="kw42-stat"><b>${pendingPbc()}</b><span>مطالبات مفتوحة</span></div><div class="kw42-stat"><b>${progress()}%</b><span>تقدم الارتباط</span></div></div><div class="kw42-command-actions"><button class="primary" type="button" data-kw42-go="${next.view}">أكمل: ${escapeHtml(next.label)}</button><button type="button" data-kw42-go="settings">تحرير بيانات المنشأة</button><button type="button" data-kw42-go="rounds">الجولات</button></div>`;
  }

  function syncCompany() {
    const name = companyName();
    const e = entity();
    const pill = $('#pill-entity');
    if (pill && name !== 'اختر الشركة' && trim(pill.textContent) !== name) pill.textContent = name;
    const input = $('#s-name');
    if (input && e.name && input.value !== e.name) input.value = e.name;
    root.dataset.kosifCompanyContext = name === 'اختر الشركة' ? 'none' : 'loaded';
  }

  function entitySteps() {
    const settings = $('#view-settings');
    if (!settings) return;
    const card = $(':scope > .card',settings) || $('.card',settings);
    if (!card) return;
    let steps = $('.kw42-entity-steps',card);
    if (!steps) {
      steps = document.createElement('div');
      steps.className = 'kw42-entity-steps';
      const header = $('.card-h',card);
      if (header) header.insertAdjacentElement('afterend',steps); else card.prepend(steps);
    }
    const e = entity();
    const hasCompany = companyName() !== 'اختر الشركة';
    const hasContext = Boolean(trim(e.period || $('#s-period')?.value) && trim(e.framework || $('#s-framework')?.value));
    const hasData = accountCount() > 0;
    steps.innerHTML = `<div class="kw42-entity-step ${hasCompany?'done':''}"><b>1 · الشركة</b><span>${hasCompany?'محددة ومحملة':'اختر أو أنشئ شركة'}</span></div><div class="kw42-entity-step ${hasContext?'done':''}"><b>2 · الإطار والفترة</b><span>${hasContext?'مكتمل':'أكمل بيانات الارتباط'}</span></div><div class="kw42-entity-step ${hasData?'done':''}"><b>3 · بيانات الشركة</b><span>${hasData?'الميزان والحسابات مرتبطة بالشركة':'حمّل بيانات الشركة مرة واحدة'}</span></div>`;
  }

  function compactRounds() {
    const host = $('#view-rounds');
    if (!host) return;
    $$('.round',host).forEach(round => {
      if (round.dataset.kw42Compact === '1') return;
      round.dataset.kw42Compact = '1';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'kw42-round-toggle';
      button.textContent = 'عرض تفاصيل الجولة';
      button.setAttribute('aria-expanded','false');
      button.addEventListener('click',() => {
        const open = round.classList.toggle('kw42-expanded');
        button.setAttribute('aria-expanded',String(open));
        button.textContent = open ? 'إخفاء التفاصيل' : 'عرض تفاصيل الجولة';
      });
      round.appendChild(button);
    });
  }

  function revealNow() {
    document.body?.classList.add('kosif-ready');
    $('#kosif-boot')?.remove();
    $$('section[data-view].show [data-k41-reveal]').forEach(el => {
      el.classList.add('k41-in');
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'none';
    });
  }
  function syncWorkspace() {
    root.dataset.kosifWorkspace = 'stable-v42';
    syncCompany();
    commandCenter();
    entitySteps();
    compactRounds();
    syncNav();
  }

  function bind() {
    document.addEventListener('click',event => {
      const jump = event.target.closest?.('[data-kw42-go]');
      if (jump) { event.preventDefault(); goView(jump.dataset.kw42Go); return; }
      if (event.target.closest?.('[data-kw42-company]')) { event.preventDefault(); $('#pill-entity')?.click(); return; }
      if (event.target.closest?.('#kosif-company-list [data-cid]')) {
        /* The existing company selector loads the full saved snapshot before this refresh. */
        setTimeout(() => { syncWorkspace(); goView('overview'); },180);
        return;
      }
      if (event.target.closest?.('#btn-save-entity,#btn-import,#btn-start-round,#btn-next-round,#btn-gen-report')) setTimeout(syncWorkspace,180);
      const edit = event.target.closest?.('button,a');
      if (edit && /تحرير بيانات المنشأة/.test(trim(edit.textContent)) && !edit.matches('[data-kw42-go]')) {
        event.preventDefault();
        goView('settings');
        setTimeout(() => $('#view-settings .card')?.scrollIntoView({block:'start',behavior:'auto'}),40);
      }
    },true);

    window.addEventListener('kosif-view-change',event => {
      try { sessionStorage.setItem(VIEW_KEY,event.detail?.view || currentView()); } catch (_) {}
      setTimeout(syncWorkspace,0);
    });
    window.addEventListener('scroll',() => { clearTimeout(scrollTimer); scrollTimer=setTimeout(savePosition,100); },{passive:true});
    window.addEventListener('pagehide',savePosition,{passive:true});
    window.addEventListener('pageshow',event => {
      revealNow();
      let view=currentView();
      try { view=sessionStorage.getItem(VIEW_KEY) || view; } catch (_) {}
      if (event.persisted || view !== currentView()) goView(view,true); else restorePosition(view);
      setTimeout(syncWorkspace,40);
    },{passive:true});
    document.addEventListener('visibilitychange',() => {
      if (document.hidden) savePosition();
      else { revealNow(); syncWorkspace(); restorePosition(); }
    },{passive:true});
  }

  function watchRounds() {
    const host = $('#view-rounds');
    if (!host || !('MutationObserver' in window)) return;
    new MutationObserver(() => {
      clearTimeout(roundsTimer);
      roundsTimer=setTimeout(() => { compactRounds(); commandCenter(); },80);
    }).observe(host,{childList:true,subtree:true});
  }

  function boot() {
    if (!$('#view-overview') || !$('#kosif-bottom-nav')) return;
    try { history.scrollRestoration='manual'; } catch (_) {}
    revealNow();
    bind();
    syncWorkspace();
    watchRounds();
    let remembered=null;
    try { remembered=sessionStorage.getItem(VIEW_KEY); } catch (_) {}
    if (remembered && remembered !== currentView()) goView(remembered,true); else restorePosition();
  }

  if (document.readyState === 'complete') setTimeout(boot,0);
  else window.addEventListener('load',() => setTimeout(boot,0),{once:true});
})();
