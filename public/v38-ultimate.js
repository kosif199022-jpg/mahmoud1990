/*
 * KOSIF v38 — Trusted Audit Intelligence OS — Bootstrapper
 * ينشئ نطاق الأسماء المشترك KosifV38 ويسجل شاشات v38 في نظام التبويبات
 * القائم (data-go المفوّض في core-v36) دون تعديل ملفات الإصدارات السابقة.
 */
(() => {
  'use strict';
  if (window.KosifV38) return;

  const V = {
    version: '38.0.0',
    buildId: '2026.08.19-v38-trusted-audit-os',
    views: {},
    rendered: new Set(),
    companyKey: 'kosif_v38_company'
  };

  /* ——— أدوات عامة ——— */
  V.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  V.$ = (sel, root) => (root || document).querySelector(sel);
  V.$$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

  V.fmtMinor = (minorStr, exp = 2) => {
    const neg = String(minorStr).startsWith('-');
    let s = String(minorStr).replace('-', '');
    const e = Number(exp) || 0;
    if (e > 0) { s = s.padStart(e + 1, '0'); s = s.slice(0, -e) + '.' + s.slice(-e); }
    const [i, f = ''] = s.split('.');
    const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + grouped + (f ? '.' + f : '');
  };
  V.fmtPct = x => (Math.round((Number(x) || 0) * 1000) / 10) + '%';

  V.company = () => {
    try { return localStorage.getItem(V.companyKey) || 'default'; } catch { return 'default'; }
  };
  V.setCompany = id => { try { localStorage.setItem(V.companyKey, id); } catch {} };

  V.api = async (path, opts = {}) => {
    const init = { method: opts.method || 'GET', headers: { 'content-type': 'application/json' } };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
    const res = await fetch(path, init);
    let data = null;
    try { data = await res.clone().json(); } catch {}
    if (!res.ok) {
      const e = new Error(data?.message || data?.error || ('HTTP_' + res.status));
      e.status = res.status; e.code = data?.error; e.data = data;
      throw e;
    }
    return data;
  };

  V.toast = (msg, kind = 'info') => {
    let host = V.$('#kosif-v38-toasts');
    if (!host) { host = document.createElement('div'); host.id = 'kosif-v38-toasts'; host.style.cssText = 'position:fixed;inset-inline-start:16px;bottom:86px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:340px'; document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'v38-note ' + (kind === 'error' ? 'danger' : kind === 'ok' ? 'ok' : 'info');
    t.style.margin = '0';
    t.innerHTML = '<span>' + (kind === 'error' ? '⛔' : kind === 'ok' ? '✅' : 'ℹ️') + '</span><span>' + V.esc(msg) + '</span>';
    host.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 450); }, 4200);
  };

  V.chip = (kind, text) => '<span class="v38-chip ' + kind + '">' + V.esc(text) + '</span>';

  V.icons = {
    account: ' ▤ ', journal_entry: ' ✎ ', journal_line: ' ≡ ', document: ' 📄 ', evidence: ' 🔎 ',
    risk: ' ⚠ ', procedure: ' ✓ ', finding: ' ◆ ', adjustment: ' ⇄ ', control: ' 🛡 ',
    standard_ref: ' 📕 ', ai_opinion: ' 🤖 ', human_decision: ' 👤 ', pbc_request: ' ⇩ '
  };

  /* ——— تسجيل الشاشات ——— */
  V.registerView = ({ id, title, icon, hint, order = 900, render, group = 'v38' }) => {
    V.views[id] = { id, title, icon, hint, order, render, group };
    injectTab(id, title, icon, order);
    ensureSection(id);
  };

  function tabbar() { return V.$('#tabbar'); }
  function injectTab(id, title, icon, order) {
    const bar = tabbar(); if (!bar) return;
    if (bar.querySelector('.tab[data-go="' + id + '"]')) return;
    const btn = document.createElement('button');
    btn.className = 'tab v38-tab'; btn.dataset.go = id; btn.dataset.ic = icon || '◆';
    btn.textContent = title;
    btn.dataset.v38Order = String(order);
    const siblings = V.$$('.tab', bar).filter(b => b !== btn);
    let after = null;
    for (const s of siblings) {
      const so = Number(s.dataset.v38Order ?? 10000);
      if (order <= so) { after = s; break; }
    }
    bar.insertBefore(btn, after);
  }
  function ensureSection(id) {
    if (V.$('section[data-view="' + id + '"]')) return;
    const main = V.$('main'); if (!main) return;
    const sec = document.createElement('section');
    sec.dataset.view = id; sec.id = 'view-' + id;
    sec.innerHTML = '<div class="v38-loading">تهيئة شاشة v38…</div>';
    main.appendChild(sec);
  }

  /* عرض كسول عند أول تنقل */
  const tryRender = () => {
    const shown = V.$('section[data-view].show');
    if (!shown) return;
    const id = shown.dataset.view;
    const view = V.views[id];
    if (!view || V.rendered.has(id)) return;
    V.rendered.add(id);
    try { view.render(shown); }
    catch (e) { console.error('[v38] render failed for ' + id, e); shown.innerHTML = '<div class="v38-note danger">تعذر تحميل هذه الشاشة: ' + V.esc(e.message) + '</div>'; }
  };
  document.addEventListener('click', e => { if (e.target.closest?.('[data-go]')) setTimeout(tryRender, 30); });
  setTimeout(tryRender, 250);

  /* ——— عناصر بناء مشتركة ——— */
  V.hero = (title, sub, pills = []) =>
    '<div class="v38-hero"><h2>' + V.esc(title) + '</h2><p>' + V.esc(sub) + '</p>' +
    (pills.length ? '<div class="v38-pill-row">' + pills.map(p => V.chip(p[0], p[1])).join('') + '</div>' : '') + '</div>';

  V.card = (title, hint, bodyHtml, extraClass = '') =>
    '<div class="v38-card ' + extraClass + '"><span class="v38-seal"></span>' +
    '<div class="v38-cardh"><h3>' + V.esc(title) + '</h3>' + (hint ? '<span class="hint">' + V.esc(hint) + '</span>' : '') + '</div>' + bodyHtml + '</div>';

  V.kpi = (label, value, sub, gold = false) =>
    '<div class="v38-kpi' + (gold ? ' gold' : '') + '"><div class="l">' + label + '</div><div class="v">' + value + '</div>' + (sub ? '<div class="s">' + V.esc(sub) + '</div>' : '') + '</div>';

  V.empty = (big, small) => '<div class="v38-empty"><b>' + V.esc(big) + '</b>' + V.esc(small || '') + '</div>';

  /* ——— شاشة مركز v38 ——— */
  const TILES = [
    ['v38-core', '⚙', 'النواة الحتمية', 'قيود، ميزان، أهمية نسبية، عينات وضريبة — حساب دقيق بالوحدات الصغرى'],
    ['v38-graph', '🕸', 'رسم الأدلة', 'ربط الأدلة بالنتائج والمعايير والقرارات وتتبع النسب'],
    ['v38-council', '⚖', 'مجلس المراجعين v3', 'أربعة نماذج + مراجع بشري في جولة عمياء ومصفوفة توافق حتمية'],
    ['v38-reports', '▤', 'التقارير الاحترافية', 'تقرير مراجعة جمالي بغلاف وخواتم اعتماد قابل للطباعة وPDF'],
    ['v38-io', '⇅', 'الاستيراد والتصدير', 'حزم ارتباط كاملة، CSV وExcel حقيقي XLSX ونسخ احتياطية'],
    ['v38-accounting', '∛', 'حاسبات محاسبية', 'نسب مالية، إهلاك، زكاة، ضريبة، أعمار ديون وتسوية بنوك'],
    ['v38-sources', '🌐', 'ذكاء المصادر', 'طبقات ثقة رسمية وكشف تغيّر مقنّن للمعايير والجهات'],
    ['v38-books', '📚', 'مكتبة الملايين', 'بحث في عشرات ملايين كتب المحاسبة والأعمال عبر Open Library'],
    ['v38-live', '🎙', 'المراجع الصوتي', 'محادثة صوتية مباشرة استشارية عبر OpenAI Realtime'],
    ['v38-lab', '🧪', 'مختبر التدقيق', 'بيانات اصطناعية مجندلة بمليونات القيود لاختبار المنصة']
  ];

  V.registerView({
    id: 'v38', title: 'v38 OS', icon: '◆', order: 55,
    render(sec) {
      sec.innerHTML =
        V.hero('KOSIF v38 — Trusted Audit Intelligence OS',
          'طبقة ذكاء تدقيق موثوقة فوق منصة المراجعة: كل رقم مساءل يُحسب حتميًا، والذكاء الاصطناعي يحلل ويفسر ويطعن ولا يرحّل قيدًا ولا يصدر رأيًا — الاعتماد بشري دائمًا.',
          [['fact', 'حقيقة'], ['source', 'مصدر'], ['ai', 'تحليل AI'], ['human', 'قرار بشري']]) +
        '<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>قدرات نظام التشغيل</h3><span class="hint">عشر شاشات من الدرجة الأولى مدمجة في مسار العمل</span><span class="v38-spacer"></span><span class="v38-badge" id="v38-cap-count">…</span></div>' +
        '<div class="v38-grid">' + TILES.map(t => '<button class="v38-tile" data-go="' + t[0] + '"><span class="ic">' + t[1] + '</span><b>' + t[2] + '</b><small>' + t[3] + '</small></button>').join('') + '</div></div>' +
        V.card('قاعدة الحوكمة الحاكمة', 'الثقة قبل السهولة',
          '<div class="v38-note warn"><span>⚖️</span><span>الحسابات، حراس الترحيل، المطابقات، مدخلات المعاينة، عتبات الأهمية النسبية وثوابت المحاسبة — كلها حتمية. قد يحلل الذكاء الاصطناعي ويطعن ويشرح ويستخرج ويصوغ، لكنه لا يرحّل قيدًا صامتًا ولا يحسب مبلغًا نهائيًا مساءلًا عليه ولا يصدر رأي المراجعة النهائي. يبقى الاعتماد البشري موثقًا في كل خطوة.</span></div>' +
          '<div class="v38-kpis" id="v38-gov-kpis"></div>');
      V.api('/api/kosif/v38/capabilities').then(c => {
        const el = V.$('#v38-cap-count'); if (el) el.textContent = c.deterministic.length + c.governed.length;
        const k = V.$('#v38-gov-kpis');
        if (k) k.innerHTML =
          V.kpi('عمليات حتمية', c.deterministic.length, 'بالوحدات الصغرى بدون فواصل عائمة', true) +
          V.kpi('قدرات محوكمة', c.governed.length, 'بجلسة مالك وقرار بشري') +
          V.kpi('حقول سلطة محجوبة', c.forbiddenAIFields.length, 'تُجرَّد من مخرجات النماذج') +
          V.kpi('مصادر رسمية أساسية', (c.coreSources || []).length, 'IFRS/IAASB/SOCPA/ZATCA…');
      }).catch(() => { const el = V.$('#v38-cap-count'); if (el) el.textContent = '—'; });
    }
  });

  window.KosifV38 = V;
})();
