/*
 * KOSIF v38 — واجهة نسيق ذكاء المصادر (Source Intelligence Fabric)
 * سجل بطبقات ثقة، فحص تغيّر مقنّن، وتاريخ إصدارات محدود لكل مصدر.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;
  const TIER_LABEL = { A: 'A — رسمي معياري أول', B: 'B — جهة تنظيمية/مرجعية', C: 'C — بحثي/مزود', D: 'D — مخصص (بيانات وصفية فقط)' };

  V.registerView({
    id: 'v38-sources', title: 'ذكاء المصادر', icon: '🌐', order: 960,
    render(sec) {
      sec.innerHTML =
        V.hero('نسيق ذكاء المصادر — Source Intelligence Fabric', 'سجل مصادر رسمي-أولًا بطبقات ثقة، مع فحص تغيّر مقنّن: HTTPS فقط، عينة 256KB، بلا بيانات اعتماد، وبلا تكرار عدواني — والكشف لا يعني النفاذ المعياري.', [['source', 'رسمي أولًا'], ['fact', 'كشف تغيّر محدود']]) +
        '<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>فحص التغيّر</h3><span class="hint">≤20 هدفًا للطلب · تزامن 4 · لا يفتح المصادر المخصصة للسحب الكامل</span><span class="v38-spacer"></span>' +
        '<button class="v38-btn gold sm" id="v38-sf-refresh">فحص المصادر الأساسية الآن</button>' +
        '<button class="v38-btn ghost sm" id="v38-sf-status">سجل الحالة</button></div>' +
        '<div id="v38-sf-out" style="margin-top:10px"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>السجل الأساسي</h3><span class="hint">IFRS/IAASB/SOCPA/ZATCA/NCA/SDAIA/NIST/W3C + مزودو AI وبحث</span></div><div id="v38-sf-registry"><div class="v38-loading">تحميل السجل…</div></div></div>';

      const paintRegistry = core => {
        V.$('#v38-sf-registry').innerHTML = '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>الطبقة</th><th>المصدر</th><th>النطاق</th><th>الرابط</th></tr></thead><tbody>' +
          core.map(s => '<tr><td><span class="v38-chip ' + (s.tier === 'A' ? 'fact' : s.tier === 'B' ? 'source' : 'ai') + '">' + s.tier + '</span></td><td>' + V.esc(s.title) + '</td><td>' + V.esc(s.kind) + '</td><td><a href="' + V.esc(s.url) + '" target="_blank" rel="noopener" style="font-size:11px;direction:ltr;unicode-bidi:embed">' + V.esc(s.url.replace(/^https?:\/\//, '').slice(0, 34)) + '…</a></td></tr>').join('') +
          '</tbody></table></div><div class="v38-note info"><span>🛡️</span><span>' + V.esc('الطبقات: ' + Object.values(TIER_LABEL).join(' · ')) + '</span></div>';
      };
      V.api('/api/kosif/v38/capabilities').then(c => paintRegistry(c.coreSources || [])).catch(e => { V.$('#v38-sf-registry').innerHTML = '<div class="v38-note danger">' + V.esc(e.message) + '</div>'; });

      V.$('#v38-sf-refresh').onclick = async () => {
        const out = V.$('#v38-sf-out');
        out.innerHTML = '<div class="v38-loading">فحص المقنن جارٍ (قد يستغرق حتى دقيقة)…</div>';
        try {
          const r = await V.api('/api/kosif/v38/sources/refresh', { method: 'POST', body: { ids: [] } });
          out.innerHTML = '<div class="v38-kpis">' + V.kpi('أهداف مفحوصة', String(r.refreshed), 'ضمن حد الطلب', true) +
            V.kpi('تغيّرات مكتشفة', String(r.results.filter(x => x.changed).length), 'بمقارنة بصمة SHA-256') +
            V.kpi('فشل/محجوب', String(r.results.filter(x => !x.ok).length), 'روابط غير آمنة أو تعذر وصول') + '</div>' +
            '<div class="v38-scroll" style="margin-top:10px"><table class="v38-table"><thead><tr><th>المصدر</th><th>الحالة</th><th>التغيّر</th><th>إصدارات محفوظة</th><th>شبهة حقن</th></tr></thead><tbody>' +
            r.results.map(x => '<tr><td>' + V.esc(x.title) + '</td><td>' + (x.ok ? '<span class="v38-chip fact">فُحص</span>' : '<span class="v38-chip risk-m">' + V.esc(x.error || 'محجوب') + '</span>') + '</td><td>' + (x.changed ? '<span class="v38-chip risk-h">تغيّر</span>' : 'مستقر') + '</td><td class="num">' + x.versionsStored + '</td><td>' + (x.injectionSuspected ? '<span class="v38-chip risk-h">مراجعة يدوية</span>' : '—') + '</td></tr>').join('') +
            '</tbody></table></div>';
        } catch (e) { out.innerHTML = '<div class="v38-note danger">' + (e.status === 401 ? 'فحص التغيّر يتطلب جلسة المالك.' : V.esc(e.message)) + '</div>'; }
      };
      V.$('#v38-sf-status').onclick = async () => {
        const out = V.$('#v38-sf-out');
        out.innerHTML = '<div class="v38-loading">قراءة سجل الحالة…</div>';
        try {
          const r = await V.api('/api/kosif/v38/sources/status');
          out.innerHTML = (r.entries || []).length ? '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>المصدر</th><th class="num">إصدارات محفوظة</th><th>آخر فحص</th><th>بصمة المحتوى</th></tr></thead><tbody>' +
            r.entries.map(x => '<tr><td>' + V.esc(x.id) + '</td><td class="num">' + x.versions + '</td><td>' + (x.last ? V.esc(String(x.last.checkedAt).slice(0, 19).replace('T', ' ')) : '—') + '</td><td class="num" style="font-size:10px">' + (x.last ? V.esc(String(x.last.contentHash).slice(0, 16)) + '…' : '—') + '</td></tr>').join('') +
            '</tbody></table></div>' : V.empty('لا سجل بعد', 'شغّل فحص التغيّر أولًا لبناء سجل الإصدارات');
        } catch (e) { out.innerHTML = '<div class="v38-note danger">' + V.esc(e.message) + '</div>'; }
      };
    }
  });
})();
