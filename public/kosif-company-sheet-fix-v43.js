/* KOSIF Company Sheet Fix v43
 * iPhone-safe modal layering + auth-aware Cloudflare company loading.
 * Preserves the owner-only company-data boundary and the explicit-create guard.
 */
(() => {
  'use strict';
  if (window.__KOSIF_COMPANY_SHEET_FIX_V43__) return;
  window.__KOSIF_COMPANY_SHEET_FIX_V43__ = true;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const OVERLAYS = ['#kosif-more', '#kosif-company-sheet', '#kosif-ai-sheet', '#kosif-command-sheet', '#kosif-font-sheet'];
  const legacyOpenCompanies = typeof window.openCompanies === 'function' ? window.openCompanies.bind(window) : null;
  const legacyNewCompanyForm = typeof window.newCompanyForm === 'function' ? window.newCompanyForm.bind(window) : null;
  const legacyPrivateOpenForm = typeof window.privateOpenForm === 'function' ? window.privateOpenForm.bind(window) : null;
  let lockedScrollY = 0;
  let pendingOwnerAction = '';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function ownerUnlocked() {
    return document.documentElement.dataset.kosifAiUnlocked === '1';
  }

  function currentLocalCompanyName() {
    try {
      const snap = typeof window.snapshot === 'function' ? window.snapshot() : null;
      const name = String(snap?.state?.entity?.name || snap?.entity?.name || $('#s-name')?.value || $('#pill-entity')?.textContent || '').trim();
      return /^(?:لم تُحد|اختر|شركة$)/.test(name) ? '' : name;
    } catch (_) {
      return '';
    }
  }

  function anyOverlayOpen() {
    return OVERLAYS.some(selector => $(selector)?.classList.contains('show'));
  }

  function lockBackground() {
    if (document.body.classList.contains('kosif-sheet-open')) return;
    lockedScrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    document.body.style.setProperty('--kosif-sheet-lock-top', `-${lockedScrollY}px`);
    document.body.classList.add('kosif-sheet-open');
  }

  function unlockBackground() {
    if (!document.body.classList.contains('kosif-sheet-open')) return;
    document.body.classList.remove('kosif-sheet-open');
    document.body.style.removeProperty('--kosif-sheet-lock-top');
    const y = lockedScrollY;
    lockedScrollY = 0;
    requestAnimationFrame(() => window.scrollTo({top: y, behavior: 'auto'}));
  }

  function syncOverlayState() {
    if (anyOverlayOpen()) lockBackground();
    else unlockBackground();
  }

  function companySheet() {
    try { if (typeof window.shells === 'function') window.shells(); } catch (_) {}
    const sheet = $('#kosif-company-sheet');
    if (!sheet) return null;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'الشركات');
    ensureActionTray(sheet);
    bindCompanyButtons(sheet);
    return sheet;
  }

  function ensureActionTray(sheet) {
    const panel = $('.kosif-sheet', sheet);
    const newButton = $('#kosif-new-company', sheet);
    const privateButton = $('#kosif-open-private', sheet);
    if (!panel || !newButton || !privateButton) return;
    let tray = $('.kosif-company-actions', panel);
    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'kosif-company-actions';
      newButton.before(tray);
      tray.append(newButton, privateButton);
    }
  }

  function setFormState(open) {
    $('#kosif-company-sheet .kosif-sheet')?.classList.toggle('kcs-form-open', Boolean(open));
  }

  function showSheet() {
    const sheet = companySheet();
    if (!sheet) return null;
    sheet.classList.add('show');
    syncOverlayState();
    return sheet;
  }

  function closeCompanySheet() {
    $('#kosif-company-sheet')?.classList.remove('show');
    setTimeout(syncOverlayState, 0);
  }

  function requestOwner(action = 'list') {
    pendingOwnerAction = action;
    closeCompanySheet();
    if (window.KosifAIGate?.open) {
      window.KosifAIGate.open();
      return;
    }
    const sheet = showSheet();
    const box = $('#kosif-company-list', sheet || document);
    if (box) box.innerHTML = '<div class="kcs-state kcs-state-error"><strong>تعذر فتح جلسة المالك</strong><span>أعد تحميل الصفحة ثم حاول مرة أخرى.</span></div>';
  }

  function renderLocked(box) {
    const local = currentLocalCompanyName();
    box.innerHTML = `
      <div class="kcs-state kcs-state-locked">
        <span class="kcs-state-icon" aria-hidden="true">🔐</span>
        <strong>بيانات الشركات محمية بجلسة المالك</strong>
        <span>لم يتم اعتبار القائمة فارغة؛ Cloudflare رفض القراءة لأن جلسة المالك غير مفتوحة.</span>
        ${local ? `<small>الشركة الحالية على هذا الجهاز: <b>${esc(local)}</b> — لم يتم نشرها تلقائيًا.</small>` : ''}
        <button type="button" class="btn primary" id="kcs-owner-unlock">فتح جلسة المالك</button>
      </div>`;
    $('#kcs-owner-unlock', box)?.addEventListener('click', () => requestOwner('list'));
  }

  function renderError(box, status, message) {
    box.innerHTML = `
      <div class="kcs-state kcs-state-error">
        <span class="kcs-state-icon" aria-hidden="true">!</span>
        <strong>تعذر تحميل الشركات من Cloudflare</strong>
        <span>${esc(message || `HTTP ${status || 'error'}`)}</span>
        <button type="button" class="btn ghost" id="kcs-company-retry">إعادة المحاولة</button>
      </div>`;
    $('#kcs-company-retry', box)?.addEventListener('click', () => openCompaniesFixed());
  }

  function renderCompanies(box, companies) {
    if (!companies.length) {
      const local = currentLocalCompanyName();
      box.innerHTML = `
        <div class="kcs-state kcs-state-empty">
          <span class="kcs-state-icon" aria-hidden="true">◇</span>
          <strong>لا توجد شركات محفوظة في مساحة المالك على Cloudflare بعد</strong>
          <span>أنشئ شركة سحابية من الزر بالأسفل، أو افتح شركة مشفرة.</span>
          ${local ? `<small>الشركة الحالية على الجهاز: <b>${esc(local)}</b>.</small>` : ''}
        </div>`;
      return;
    }

    box.innerHTML = companies.map(company => {
      let writable = false;
      try { writable = typeof window.writeTokenFor === 'function' && Boolean(window.writeTokenFor(company.id)); } catch (_) {}
      const updated = String(company.updatedAt || company.createdAt || '').slice(0, 10);
      return `<button type="button" class="kosif-company-item" data-kcs-company-id="${esc(company.id)}">
        <strong>${esc(company.name || 'شركة')}</strong>
        <small>محفوظة على Cloudflare${updated ? ` · محدثة ${esc(updated)}` : ''}${writable ? ' · قابلة للتعديل من هذا الجهاز' : ' · قراءة فقط على هذا الجهاز'}</small>
      </button>`;
    }).join('');

    $$('[data-kcs-company-id]', box).forEach(button => {
      button.addEventListener('click', () => {
        const company = companies.find(row => String(row.id) === String(button.dataset.kcsCompanyId));
        if (!company) return;
        try { if (typeof window.setActivePublic === 'function') window.setActivePublic(company.id); } catch (_) {}
        try { if (typeof window.loadSnapshot === 'function') window.loadSnapshot(company.company); } catch (error) { console.error('KOSIF company load', error); }
        closeCompanySheet();
        try {
          const writable = typeof window.writeTokenFor === 'function' && Boolean(window.writeTokenFor(company.id));
          if (!writable) window.toast?.('فُتحت الشركة للقراءة فقط على هذا الجهاز', 'warn');
        } catch (_) {}
      });
    });
  }

  async function openCompaniesFixed() {
    const sheet = showSheet();
    if (!sheet) return;
    const form = $('#kosif-company-form', sheet);
    const box = $('#kosif-company-list', sheet);
    if (!box) return;
    if (form) form.innerHTML = '';
    setFormState(false);
    box.classList.add('kosif-shimmer');
    box.setAttribute('aria-busy', 'true');
    box.innerHTML = '<div class="kcs-loading">جاري تحميل الشركات من Cloudflare…</div>';

    try {
      const response = await fetch('/api/kosif/companies', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {'accept': 'application/json'}
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      box.classList.remove('kosif-shimmer');
      box.removeAttribute('aria-busy');

      if (response.status === 401 || data?.error === 'OWNER_AUTH_REQUIRED') {
        renderLocked(box);
        return;
      }
      if (!response.ok) {
        renderError(box, response.status, data?.message || data?.error);
        return;
      }
      renderCompanies(box, Array.isArray(data?.companies) ? data.companies : []);
    } catch (error) {
      box.classList.remove('kosif-shimmer');
      box.removeAttribute('aria-busy');
      renderError(box, 0, error?.message || 'تعذر الاتصال');
    }
  }

  function newCompanyFixed() {
    if (!ownerUnlocked()) {
      requestOwner('new');
      return;
    }
    if (!legacyNewCompanyForm) return;
    legacyNewCompanyForm();
    setFormState(true);
    const form = $('#kosif-company-form');
    if (form) {
      form.innerHTML = form.innerHTML
        .replace('عامة — تظهر للجميع', 'سحابية — محفوظة في Cloudflare داخل جلسة المالك')
        .replace('الشركة العامة الجديدة تُنشأ بصلاحية كتابة خاصة بهذا الجهاز.', 'الشركة السحابية الجديدة تُنشأ بصلاحية كتابة خاصة بهذا الجهاز، وتبقى القراءة محمية بجلسة المالك.');
      form.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
  }

  function privateCompanyFixed() {
    if (!ownerUnlocked()) {
      requestOwner('private');
      return;
    }
    if (!legacyPrivateOpenForm) return;
    legacyPrivateOpenForm();
    setFormState(true);
    $('#kosif-company-form')?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }

  function bindCompanyButtons(sheet = companySheet()) {
    if (!sheet) return;
    const newButton = $('#kosif-new-company', sheet);
    const privateButton = $('#kosif-open-private', sheet);
    if (newButton) newButton.onclick = newCompanyFixed;
    if (privateButton) privateButton.onclick = privateCompanyFixed;
  }

  function bindEntityTrigger() {
    const pill = $('#pill-entity');
    if (!pill || pill.dataset.kcsV43Bound === '1') return;
    pill.dataset.kcsV43Bound = '1';
    pill.onclick = event => {
      event?.preventDefault?.();
      openCompaniesFixed();
    };
  }

  function observeOverlays() {
    if (!('MutationObserver' in window)) return;
    const observer = new MutationObserver(() => syncOverlayState());
    const attach = () => {
      OVERLAYS.forEach(selector => {
        const node = $(selector);
        if (node && node.dataset.kcsObserved !== '1') {
          node.dataset.kcsObserved = '1';
          observer.observe(node, {attributes: true, attributeFilter: ['class']});
        }
      });
      syncOverlayState();
    };
    attach();
    new MutationObserver(attach).observe(document.body, {childList: true, subtree: false});
  }

  window.addEventListener('kosif-ai-gate-change', event => {
    if (!event.detail?.unlocked) {
      if ($('#kosif-company-sheet')?.classList.contains('show')) openCompaniesFixed();
      return;
    }
    const action = pendingOwnerAction;
    pendingOwnerAction = '';
    if (!action) return;
    openCompaniesFixed().then(() => {
      if (action === 'new') newCompanyFixed();
      else if (action === 'private') privateCompanyFixed();
    });
  });

  function boot() {
    try { if (typeof window.shells === 'function') window.shells(); } catch (_) {}
    window.openCompanies = openCompaniesFixed;
    bindEntityTrigger();
    bindCompanyButtons();
    observeOverlays();
    syncOverlayState();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
