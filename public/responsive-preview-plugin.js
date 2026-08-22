/* KOSIF Responsive Preview ChatGPT Plugin — progressive UI bridge only. */
(() => {
  'use strict';
  if (window.__KOSIF_RESPONSIVE_PREVIEW_PLUGIN__) return;
  window.__KOSIF_RESPONSIVE_PREVIEW_PLUGIN__ = true;

  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const VIEW = 'responsive-preview';

  function showView() {
    const section = $('#view-responsive-preview');
    if (!section) return;
    if (typeof window.go === 'function') {
      try { window.go(VIEW); return; } catch (_) {}
    }
    $$('section[data-view]').forEach(el => el.classList.toggle('show', el === section));
    document.body.dataset.kosifCurrentView = VIEW;
    window.dispatchEvent(new CustomEvent('kosif-view-change', {detail:{view:VIEW}}));
    section.scrollIntoView({block:'start'});
  }

  function publishAudit(detail) {
    window.__KOSIF_LAST_RESPONSIVE_AUDIT__ = detail;
    setStatus(detail);
    window.dispatchEvent(new CustomEvent('kosif-responsive-audit', {detail}));
  }

  function collectAuditFromFrame(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc) return null;
      const issues = $$('.audit-item', doc).map(item => {
        const severity = $('.audit-severity', item)?.textContent?.trim()?.toLowerCase() || 'warning';
        const title = $('strong', item)?.textContent?.trim() || 'QA issue';
        const detail = $('small', item)?.textContent?.trim() || '';
        return {severity, title, detail};
      });
      const detail = {url: frame.src, device:'embedded', mode:'attached-runtime', issues, source:'same-origin-dom-bridge'};
      publishAudit(detail);
      return detail;
    } catch (_) { return null; }
  }

  function frameCommand(command, payload = {}) {
    const frame = $('#kosif-responsive-preview-frame');
    if (!frame) return;
    frame.contentWindow?.postMessage({source:'kosif-responsive-preview-host', type:'kosif:responsive-preview:command', command, payload}, location.origin);
    if (command === 'run-audit') {
      try {
        frame.contentDocument?.querySelector('#auditBtn')?.click();
        setTimeout(() => collectAuditFromFrame(frame), 350);
      } catch (_) {}
    } else if (command === 'get-audit') {
      collectAuditFromFrame(frame);
    } else if (command === 'reload') {
      try { frame.contentDocument?.querySelector('#reloadBtn')?.click(); } catch (_) { frame.src = frame.src; }
    }
  }

  function setStatus(detail) {
    const target = $('#kosif-responsive-preview-status');
    if (!target) return;
    const issues = Array.isArray(detail?.issues) ? detail.issues : [];
    const errors = issues.filter(x => ['error','critical'].includes(String(x?.severity || '').toLowerCase())).length;
    const warnings = issues.length - errors;
    target.className = `badge ${errors ? 'danger' : warnings ? 'warn' : 'ok'}`;
    target.textContent = errors ? `${errors} خطأ · ${warnings} تنبيه` : warnings ? `${warnings} تنبيه` : 'الفحص سليم';
  }

  function mount() {
    if ($('#view-responsive-preview')) return;
    const main = $('main');
    if (!main) return;

    const section = document.createElement('section');
    section.dataset.view = VIEW;
    section.id = 'view-responsive-preview';
    section.innerHTML = `
      <div class="card reveal">
        <div class="card-h">
          <h2>مختبر الواجهات · ChatGPT Responsive QA</h2>
          <span class="badge info">Plugin</span>
          <span id="kosif-responsive-preview-status" class="badge mut">جاهز للفحص</span>
          <span class="spacer"></span>
          <button class="btn primary sm" id="kosif-preview-run-audit">تشغيل QA Audit</button>
          <a class="btn ghost sm" href="/preview/index.html?url=/audit/&device=iphone-15-pro&mode=single" target="_blank" rel="noopener">فتح مستقل</a>
        </div>
        <p class="hint" style="margin-bottom:12px">التطبيق المرفق مدمج داخل Kosif لمعاينة الهاتف والتابلت واللابتوب، المقارنة وMatrix وFluid، وفحص overflow والوصول وأهداف اللمس. الفحص العميق يعمل للصفحات من نفس النطاق.</p>
        <div style="border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#081B19;min-height:70vh">
          <iframe id="kosif-responsive-preview-frame" title="KOSIF Responsive Preview Lab" src="/preview/index.html?url=/audit/&device=iphone-15-pro&mode=single" style="display:block;width:100%;height:78vh;border:0;background:#081B19" loading="lazy" allow="clipboard-write"></iframe>
        </div>
      </div>`;
    main.appendChild(section);

    const tabs = $('.tabs-inner');
    if (tabs && !$('#kosif-responsive-preview-tab')) {
      const btn = document.createElement('button');
      btn.id = 'kosif-responsive-preview-tab';
      btn.className = 'tab';
      btn.dataset.go = VIEW;
      btn.dataset.kgo = VIEW;
      btn.dataset.v38Order = '9850';
      btn.innerHTML = '<span aria-hidden="true">▣</span> مختبر الواجهات <span class="n">GPT</span>';
      btn.addEventListener('click', ev => { ev.preventDefault(); showView(); });
      const settings = tabs.querySelector('[data-go="settings"],[data-kgo="settings"]');
      tabs.insertBefore(btn, settings || null);
    }

    const addMore = root => {
      if (!root || root.querySelector('[data-preview-plugin]')) return;
      const btn = document.createElement('button');
      btn.className = root.classList.contains('ms-grid') ? 'ms-it' : 'kosif-action';
      btn.dataset.previewPlugin = '1';
      btn.innerHTML = root.classList.contains('ms-grid') ? '<span class="ic">▣</span>مختبر الواجهات' : 'مختبر الواجهات<small>Responsive Preview + QA</small>';
      btn.addEventListener('click', () => { root.closest('#kosif-more,#moresheet')?.classList.remove('show'); showView(); });
      root.appendChild(btn);
    };
    addMore($('#kosif-more .kosif-sheet-grid'));
    addMore($('#moresheet .ms-grid'));

    $('#kosif-preview-run-audit')?.addEventListener('click', () => frameCommand('run-audit'));
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const data = event.data || {};
    if (data.source !== 'kosif-responsive-preview') return;
    if (data.type === 'kosif:responsive-preview:audit' || data.type === 'kosif:responsive-preview:result') publishAudit(data.detail || data.payload || data);
  });

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-go="responsive-preview"],[data-kgo="responsive-preview"]');
    if (trigger) { event.preventDefault(); showView(); }
  }, true);

  const observer = new MutationObserver(() => mount());
  function boot() { mount(); observer.observe(document.body, {childList:true, subtree:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
