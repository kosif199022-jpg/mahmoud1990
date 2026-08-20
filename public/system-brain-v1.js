/* KOSIF System Brain v1 — unified map of experience, books, authority and audit workflow. */
(() => {
  'use strict';
  const V = window.KosifV38;
  if (!V) return;

  const esc = V.esc;
  const statusLabel = s => {
    const x = String(s || '').toLowerCase();
    if (x === 'effective') return ['fact', 'نافذ'];
    if (x === 'exposure-draft') return ['risk-m', 'مشروع — غير نافذ'];
    if (x === 'project') return ['source', 'مشروع/قيد التطوير'];
    if (x === 'future-effective') return ['source', 'قادم النفاذ'];
    return ['', x || 'مرجع'];
  };

  function layerCard(layer, i) {
    const icons = ['✦', '📖', '🧠', '⚖'];
    return '<div class="v38-card" style="margin:0;min-height:100%"><div class="v38-cardh"><h3>' + icons[i % icons.length] + ' ' + esc(layer.name) + '</h3></div>' +
      '<div style="display:grid;gap:7px">' + (layer.responsibilities || []).map(x => '<div class="v38-note info" style="margin:0"><span>•</span><span>' + esc(x) + '</span></div>').join('') + '</div></div>';
  }

  function sourceRow(s) {
    const [kind, label] = statusLabel(s.status);
    const url = String(s.url || '');
    return '<tr><td><b>' + esc(s.issuer || '—') + '</b></td><td>' + esc(s.title_ar || s.title || s.id) + '</td><td><span class="v38-chip ' + kind + '">' + esc(label) + '</span></td><td>' + esc(s.kind || '—') + '</td><td>' +
      (url.startsWith('https://') ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">المصدر ↗</a>' : '—') + '</td></tr>';
  }

  function bookCard(b) {
    const authority = b.professionalAuthority === false ? 'مرجع غير مهني' : (b.id === 'b3' ? 'مرجع رسمي محدث' : b.id === 'b1' ? 'مرجع رسمي تاريخي' : b.id === 'b2' ? 'تدريب' : 'كتاب');
    const chip = b.id === 'b3' ? 'fact' : b.professionalAuthority === false ? 'ai' : 'source';
    return '<div class="v38-tile" style="text-align:start;cursor:default"><span class="ic">📚</span><b>' + esc(b.title) + '</b><small>' + esc(b.sub || '') + '</small>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="v38-chip ' + chip + '">' + esc(authority) + '</span>' +
      '<span class="v38-chip">' + esc(String(b.year || '—')) + '</span><span class="v38-chip">' + esc(String(b.chapters || 0)) + ' فصل/قسم</span></div></div>';
  }

  V.registerView({
    id: 'v38-brain', title: 'عقل النظام', icon: '🧠', order: 952,
    render(sec) {
      sec.innerHTML = V.hero(
        'عقل KOSIF — System Brain',
        'مصدر الحقيقة المركزي الذي يربط الواجهة، محرك الكتب، المصادر المهنية، والمحرك المحاسبي/المراجعي. كل إجابة مهنية يجب أن تعرف: الدولة + الفترة + سلطة المصدر + موضع الكتاب/الدليل + قرار الإنسان.',
        [['fact', 'Source of Truth'], ['source', 'Official-first'], ['human', 'Human approval']]
      ) +
      '<div id="kosif-brain-summary"><div class="v38-loading">تحميل خريطة النظام…</div></div>' +
      '<div class="v38-card"><div class="v38-cardh"><h3>طبقات السلطة المهنية</h3><span class="hint">الأعلى يحكم الأدنى عند التعارض</span></div><div id="kosif-brain-authority"></div></div>' +
      '<div class="v38-card"><div class="v38-cardh"><h3>كتب المعرفة داخل KOSIF</h3><span class="hint">الكتاب يحتفظ بدوره المهني ولا يتحول تلقائياً إلى مصدر إلزامي</span><span class="v38-spacer"></span><a class="v38-btn sm gold" href="/wealth/reader.html">فتح القارئ الموحد</a></div><div id="kosif-brain-books" class="v38-grid"></div></div>' +
      '<div class="v38-card"><div class="v38-cardh"><h3>المصادر الرسمية الحالية</h3><span class="hint">نافذ ≠ مشروع للتعليق</span></div><div id="kosif-brain-sources"><div class="v38-loading">تحميل السجل الرسمي…</div></div></div>' +
      '<div class="v38-card"><div class="v38-cardh"><h3>رحلة المراجعة الموحدة</h3><span class="hint">كل مرحلة تأخذ مدخلات محددة وتنتج مخرجات قابلة للتتبع</span></div><div id="kosif-brain-workflow"></div></div>' +
      '<div class="v38-card"><div class="v38-cardh"><h3>مجلس المراجعين</h3><span class="hint">مهمة فردية أو مهمة للمجلس ككل</span></div><div id="kosif-brain-council"></div></div>';

      Promise.all([
        fetch('/data/kosif-system-brain-v1.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('SYSTEM_BRAIN_CONFIG_UNAVAILABLE'))),
        fetch('/data/kosif-official-sources-2026.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : ({ sources: [] })),
        fetch('/standards/data/library.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : ([])),
        V.api('/api/kosif/v38/capabilities').catch(() => null)
      ]).then(([brain, catalog, books, cap]) => {
        const summary = V.$('#kosif-brain-summary');
        summary.innerHTML = '<div class="v38-kpis" style="margin-bottom:12px">' +
          V.kpi('طبقات النظام', String((brain.layers || []).length), 'واجهة + كتب + معرفة + مراجعة', true) +
          V.kpi('مصادر رسمية مفهرسة', String((catalog.sources || []).length), 'كتالوج 2026') +
          V.kpi('كتب داخلية', String((books || []).length), 'مع دور مهني واضح') +
          V.kpi('عمليات حتمية', String(cap?.deterministic?.length || 0), 'الأرقام لا تُترك للنموذج') + '</div>' +
          '<div class="v38-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">' + (brain.layers || []).map(layerCard).join('') + '</div>' +
          '<div class="v38-note warn"><span>🛡️</span><span>' + esc((brain.principles || []).join(' · ')) + '</span></div>';

        V.$('#kosif-brain-authority').innerHTML = '<div style="display:grid;gap:8px">' + (brain.authority_order || []).map(x =>
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--v38-line);border-radius:12px"><span class="v38-badge">' + esc(x.rank) + '</span><b>' + esc(x.label) + '</b><span class="hint">' + esc(x.type) + '</span></div>').join('') + '</div>';

        V.$('#kosif-brain-books').innerHTML = (books || []).map(bookCard).join('') || V.empty('لا توجد كتب', 'تعذر تحميل مكتبة الكتب الداخلية');

        const sources = catalog.sources || [];
        V.$('#kosif-brain-sources').innerHTML = '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>الجهة</th><th>المصدر</th><th>الحالة</th><th>النوع</th><th>الرابط</th></tr></thead><tbody>' + sources.map(sourceRow).join('') + '</tbody></table></div>' +
          '<div class="v38-note info"><span>ℹ️</span><span>المشروعات ومسودات التعليق تظهر للوعي المهني فقط، ولا تُعامل كمتطلبات نافذة حتى اعتمادها ونفاذها.</span></div>';

        V.$('#kosif-brain-workflow').innerHTML = '<div style="display:grid;gap:10px">' + (brain.workflow || []).map(w =>
          '<div style="display:grid;grid-template-columns:auto minmax(150px,.8fr) minmax(180px,1fr) minmax(180px,1fr);gap:10px;align-items:start;padding:12px;border:1px solid var(--v38-line);border-radius:14px">' +
          '<span class="v38-badge">' + esc(w.step) + '</span><div><b>' + esc(w.name) + '</b><div class="hint">' + esc(w.id) + '</div></div>' +
          '<div><span class="hint">المدخلات</span><div>' + (w.inputs || []).map(x => '<span class="v38-chip source">' + esc(x) + '</span>').join(' ') + '</div></div>' +
          '<div><span class="hint">المخرجات</span><div>' + (w.outputs || []).map(x => '<span class="v38-chip fact">' + esc(x) + '</span>').join(' ') + '</div></div></div>').join('') + '</div>';

        const council = brain.council || {};
        V.$('#kosif-brain-council').innerHTML = '<div class="v38-kpis">' +
          V.kpi('أنماط الإسناد', String((council.assignment_modes || []).length), 'فردي + المجلس كله', true) +
          V.kpi('أعضاء', String((council.members || []).length), (council.members || []).join(' · ')) +
          V.kpi('قواعد حوكمة', String((council.rules || []).length), 'لا اعتماد آلي') + '</div>' +
          '<div class="v38-note ok"><span>⚖️</span><span>' + esc((council.rules || []).join(' · ')) + '</span></div>';
      }).catch(e => {
        V.$('#kosif-brain-summary').innerHTML = '<div class="v38-note danger"><span>⛔</span><span>' + esc(e.message) + '</span></div>';
      });
    }
  });
})();
