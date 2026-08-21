/* KOSIF System Brain v2 — unified map + fast PDF semantic memory. */
(() => {
  'use strict';

  function bootSystemBrain() {
    const V = window.KosifV38;
    if (!V) return false;
    if (V.views?.['v38-brain']?.__kosifBrainV2) return true;

    const esc = V.esc;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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

    async function readJson(res) {
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) {
        const err = new Error(data?.message || data?.error || ('HTTP_' + res.status));
        err.status = res.status;
        err.code = data?.error || '';
        throw err;
      }
      return data || {};
    }

    function memoryState(status) {
      const item = (ok, label) => '<span class="v38-chip ' + (ok ? 'fact' : 'risk-m') + '">' + (ok ? '✓ ' : '○ ') + esc(label) + '</span>';
      return '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
        item(status?.postgres?.configured, 'PostgreSQL + pgvector') +
        item(status?.parser?.configured, 'LlamaParse') +
        item(status?.embeddings?.configured, 'Embeddings') +
        '<span class="v38-chip ' + (status?.ready ? 'fact' : 'source') + '">' + (status?.ready ? 'جاهز للفهرسة السريعة' : 'بانتظار ربط الخدمات') + '</span></div>';
    }

    function showMemoryMessage(text, kind = 'info') {
      const el = V.$('#kosif-brain-memory-msg');
      if (el) el.innerHTML = '<div class="v38-note ' + kind + '" style="margin:0"><span>' + (kind === 'danger' ? '⛔' : kind === 'ok' ? '✓' : 'ℹ️') + '</span><span>' + esc(text) + '</span></div>';
    }

    function renderSearchResults(rows) {
      const el = V.$('#kosif-brain-memory-results');
      if (!el) return;
      if (!rows?.length) {
        el.innerHTML = V.empty('لا توجد نتيجة مطابقة', 'جرّب صياغة مختلفة أو أضف كتاباً إلى الذاكرة السريعة.');
        return;
      }
      el.innerHTML = '<div style="display:grid;gap:9px">' + rows.map((r, i) => {
        const similarity = Number.isFinite(Number(r.similarity)) ? Math.round(Number(r.similarity) * 100) + '%' : '—';
        const page = r.page_start ? ('صفحة ' + esc(String(r.page_start))) : 'موضع مفهرس';
        return '<div style="padding:12px;border:1px solid var(--v38-line);border-radius:14px">' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="v38-badge">' + (i + 1) + '</span><b>' + esc(r.title || r.document_key || 'مرجع') + '</b><span class="v38-chip source">' + page + '</span><span class="v38-chip fact">تشابه ' + esc(similarity) + '</span></div>' +
          '<div style="margin-top:8px;line-height:1.9">' + esc(String(r.content || '').slice(0, 900)) + '</div>' +
          '<div class="hint" style="margin-top:6px">' + esc(r.authority || 'reference') + ' · ' + esc(r.jurisdiction || '—') + '</div></div>';
      }).join('') + '</div>';
    }

    async function initFastMemory() {
      const statusBox = V.$('#kosif-brain-memory-status');
      if (!statusBox) return;
      let status = null;
      try {
        status = await readJson(await fetch('/api/kosif/v38/brain/status', { cache: 'no-store', credentials: 'same-origin' }));
        statusBox.innerHTML = memoryState(status);
        if (!status.ready) showMemoryMessage('الكود السريع مفعّل داخل KOSIF، لكن الفهرسة السحابية تحتاج ربط PostgreSQL/pgvector وLlamaParse ومفتاح Embeddings على الخادم.', 'info');
        else showMemoryMessage('الذاكرة السريعة جاهزة: PDF → LlamaParse → pgvector. البحث لا يعيد قراءة الكتاب بالكامل كل مرة.', 'ok');
      } catch (e) {
        statusBox.innerHTML = '<span class="v38-chip risk-m">تعذر قراءة حالة الذاكرة</span>';
        showMemoryMessage(e.message, 'danger');
      }

      const searchBtn = V.$('#kosif-brain-search-btn');
      const searchInput = V.$('#kosif-brain-search-q');
      if (searchBtn && searchInput) searchBtn.addEventListener('click', async () => {
        const q = String(searchInput.value || '').trim();
        if (!q) return showMemoryMessage('اكتب سؤالاً أو عبارة بحث أولاً.', 'info');
        searchBtn.disabled = true;
        showMemoryMessage('أبحث دلالياً داخل الأجزاء الأقرب للسؤال…');
        try {
          const data = await readJson(await fetch('/api/kosif/v38/brain/search', {
            method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, limit: 8 })
          }));
          renderSearchResults(data.results || []);
          showMemoryMessage('تم البحث في الفهرس الدلالي بدون تحميل الكتب كاملة.', 'ok');
        } catch (e) {
          showMemoryMessage(e.status === 401 ? 'افتح جلسة المالك أولاً لاستخدام ذاكرة الكتب الخاصة.' : e.message, 'danger');
        } finally { searchBtn.disabled = false; }
      });

      const uploadBtn = V.$('#kosif-brain-upload-btn');
      const fileInput = V.$('#kosif-brain-pdf');
      if (uploadBtn && fileInput) uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files?.[0];
        if (!file) return showMemoryMessage('اختر ملف PDF أولاً.', 'info');
        if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return showMemoryMessage('الاستيراد السريع هنا مخصص لملفات PDF.', 'danger');
        uploadBtn.disabled = true;
        try {
          const form = new FormData();
          form.set('file', file, file.name);
          form.set('title', file.name.replace(/\.pdf$/i, ''));
          form.set('documentKey', 'upload-' + Date.now() + '-' + file.name.replace(/\.pdf$/i, '').slice(0, 80));
          form.set('language', 'ar');
          showMemoryMessage('تم رفع PDF إلى طبقة التحليل. جاري إنشاء خريطة الصفحات…');
          const started = await readJson(await fetch('/api/kosif/v38/brain/parse/upload', { method: 'POST', credentials: 'same-origin', body: form }));
          const jobId = started.jobId;
          let complete = false;
          for (let i = 0; i < 90; i++) {
            await sleep(i < 3 ? 1200 : 2200);
            const job = await readJson(await fetch('/api/kosif/v38/brain/parse/job/' + encodeURIComponent(jobId), { cache: 'no-store', credentials: 'same-origin' }));
            const state = String(job.status || job.job?.status || '').toUpperCase();
            showMemoryMessage('LlamaParse: ' + (state || 'RUNNING') + ' — جاري تجهيز الكتاب للفهرسة…');
            if (['SUCCESS', 'COMPLETED', 'COMPLETE'].includes(state)) { complete = true; break; }
            if (['FAILED', 'ERROR', 'CANCELLED'].includes(state)) throw new Error('فشل تحليل PDF: ' + state);
          }
          if (!complete) throw new Error('التحليل ما زال يعمل؛ أعد المحاولة بعد قليل وسيظل Job محفوظاً لمدة 24 ساعة.');
          showMemoryMessage('اكتمل تحليل الصفحات. جاري إنشاء embeddings وحفظها في pgvector…');
          const indexed = await readJson(await fetch('/api/kosif/v38/brain/parse/job/' + encodeURIComponent(jobId) + '/ingest', {
            method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}'
          }));
          showMemoryMessage('تمت فهرسة ' + String(indexed.pages || 0) + ' صفحة في ' + String(indexed.chunks || 0) + ' جزء دلالي. الكتاب أصبح جاهزاً للبحث السريع.', 'ok');
          fileInput.value = '';
        } catch (e) {
          showMemoryMessage(e.status === 401 ? 'افتح جلسة المالك أولاً قبل رفع الكتب.' : e.message, 'danger');
        } finally { uploadBtn.disabled = false; }
      });
    }

    V.registerView({
      id: 'v38-brain', title: 'عقل النظام', icon: '🧠', order: 56, __kosifBrainV2: true,
      render(sec) {
        sec.innerHTML = V.hero(
          'عقل KOSIF — System Brain',
          'مصدر الحقيقة المركزي الذي يربط الواجهة، محرك الكتب، المصادر المهنية، والمحرك المحاسبي/المراجعي. كل إجابة مهنية يجب أن تعرف: الدولة + الفترة + سلطة المصدر + موضع الكتاب/الدليل + قرار الإنسان.',
          [['fact', 'Source of Truth'], ['source', 'Official-first'], ['human', 'Human approval']]
        ) +
        '<div id="kosif-brain-summary"><div class="v38-loading">تحميل خريطة النظام…</div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>⚡ ذاكرة المعرفة السريعة</h3><span class="hint">PDF لا يُقرأ بالكامل عند كل سؤال: يُحلل مرة ويُفهرس دلالياً</span></div>' +
          '<div id="kosif-brain-memory-status"><div class="v38-loading">فحص PostgreSQL / pgvector…</div></div>' +
          '<div class="v38-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:12px">' +
            '<div style="padding:12px;border:1px solid var(--v38-line);border-radius:14px"><b>إضافة كتاب PDF</b><div class="hint">LlamaParse يحافظ على الصفحات والجداول ثم تُخزن الأجزاء في pgvector.</div><input id="kosif-brain-pdf" type="file" accept="application/pdf,.pdf" style="width:100%;margin-top:10px"><button id="kosif-brain-upload-btn" class="v38-btn gold" style="margin-top:10px">تحليل وفهرسة الكتاب</button></div>' +
            '<div style="padding:12px;border:1px solid var(--v38-line);border-radius:14px"><b>بحث دلالي سريع</b><div class="hint">يسترجع فقط المقاطع الأقرب للسؤال مع الصفحة والمصدر.</div><input id="kosif-brain-search-q" type="search" placeholder="مثال: ما متطلبات الاعتراف بالإيراد؟" style="width:100%;margin-top:10px"><button id="kosif-brain-search-btn" class="v38-btn gold" style="margin-top:10px">ابحث في عقل النظام</button></div>' +
          '</div><div id="kosif-brain-memory-msg" style="margin-top:12px"></div><div id="kosif-brain-memory-results" style="margin-top:12px"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>طبقات السلطة المهنية</h3><span class="hint">الأعلى يحكم الأدنى عند التعارض</span></div><div id="kosif-brain-authority"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>كتب المعرفة داخل KOSIF</h3><span class="hint">الكتاب يحتفظ بدوره المهني ولا يتحول تلقائياً إلى مصدر إلزامي</span><span class="v38-spacer"></span><a class="v38-btn sm gold" href="/wealth/reader.html">فتح القارئ الموحد</a></div><div id="kosif-brain-books" class="v38-grid"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>المصادر الرسمية الحالية</h3><span class="hint">نافذ ≠ مشروع للتعليق</span></div><div id="kosif-brain-sources"><div class="v38-loading">تحميل السجل الرسمي…</div></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>رحلة المراجعة الموحدة</h3><span class="hint">كل مرحلة تأخذ مدخلات محددة وتنتج مخرجات قابلة للتتبع</span></div><div id="kosif-brain-workflow"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>مجلس المراجعين</h3><span class="hint">مهمة فردية أو مهمة للمجلس ككل</span></div><div id="kosif-brain-council"></div></div>';

        initFastMemory();

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
          const target = V.$('#kosif-brain-summary');
          if (target) target.innerHTML = '<div class="v38-note danger"><span>⛔</span><span>' + esc(e.message) + '</span></div>';
        });
      }
    });

    if (V.views['v38-brain']) V.views['v38-brain'].__kosifBrainV2 = true;

    const ensureBrainEntry = () => {
      const brainView = V.views?.['v38-brain'];
      if (!brainView) return;
      const bar = V.$('#tabbar');
      if (bar && !bar.querySelector('.tab[data-go="v38-brain"]')) V.registerView(brainView);

      const hubSection = V.$('#view-v38');
      if (!hubSection) return;
      const grids = [...hubSection.querySelectorAll('.v38-grid')];
      const grid = grids.find(g => g.querySelector('[data-go="v38-core"]')) || grids[0];
      if (grid && !grid.querySelector('[data-go="v38-brain"]')) {
        const btn = document.createElement('button');
        btn.className = 'v38-tile kosif-brain-entry';
        btn.dataset.go = 'v38-brain';
        btn.innerHTML = '<span class="ic">🧠</span><b>عقل النظام</b><small>ذاكرة الكتب والمعايير: LlamaParse + PostgreSQL/pgvector + بحث دلالي سريع</small>';
        grid.prepend(btn);
      }
    };

    ensureBrainEntry();
    const observer = new MutationObserver(() => ensureBrainEntry());
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { ensureBrainEntry(); observer.disconnect(); }, 30000);
    return true;
  }

  if (bootSystemBrain()) return;
  let tries = 0;
  const retry = setInterval(() => {
    tries += 1;
    if (bootSystemBrain() || tries >= 100) clearInterval(retry);
  }, 100);
})();
