/*
 * KOSIF v38 — واجهة نسيق ذكاء المصادر (Source Intelligence Fabric)
 * سجل بطبقات ثقة، فحص تغيّر مقنّن، وتاريخ إصدارات محدود لكل مصدر.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;
  const TIER_LABEL = { A: 'A — رسمي معياري أول', B: 'B — جهة تنظيمية/مرجعية', C: 'C — بحثي/مزود', D: 'D — مخصص (بيانات وصفية فقط)' };
  const statusBadge = s => {
    const status = String(s?.status || s?.sourceStatus || '').toLowerCase();
    if (status === 'exposure-draft') return '<span class="v38-chip risk-m">مشروع للتعليق — غير نافذ</span>';
    if (status === 'project') return '<span class="v38-chip source">مشروع / قيد التطوير</span>';
    if (status === 'effective') return '<span class="v38-chip fact">نافذ / مرجع حالي</span>';
    if (s?.tier === 'D') return '<span class="v38-chip ai">مخصص — metadata فقط</span>';
    return '<span class="v38-chip">مرجع أساسي</span>';
  };
  const safeUrl = s => String(s?.url || '');

  V.registerView({
    id: 'v38-sources', title: 'ذكاء المصادر', icon: '🌐', order: 960,
    render(sec) {
      sec.innerHTML =
        V.hero('نسيق ذكاء المصادر — Source Intelligence Fabric', 'سجل مصادر رسمي-أولًا بطبقات ثقة، مع فحص تغيّر مقنّن: HTTPS فقط، عينة 256KB، بلا بيانات اعتماد، وبلا تكرار عدواني. حالة «مشروع للتعليق» تظهر صراحة ولا تُعامل كمتطلب نافذ.', [['source', 'رسمي أولًا'], ['fact', 'كشف تغيّر محدود']]) +
        '<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>فحص التغيّر</h3><span class="hint">≤20 هدفًا للطلب · تزامن 4 · الأولوية للمصادر الرسمية/التنظيمية</span><span class="v38-spacer"></span>' +
        '<button class="v38-btn gold sm" id="v38-sf-refresh">فحص المصادر الأساسية الآن</button>' +
        '<button class="v38-btn ghost sm" id="v38-sf-status">سجل الحالة</button></div>' +
        '<div id="v38-sf-out" style="margin-top:10px"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>السجل الحاكم للمصادر</h3><span class="hint">كتالوج 2026 الرسمي + المصادر الأساسية + المصادر المخصصة Tier D</span></div><div id="v38-sf-registry"><div class="v38-loading">تحميل السجل…</div></div></div>';

      const paintRegistry = (sources, catalog) => {
        const rows = Array.isArray(sources) ? sources : [];
        V.$('#v38-sf-registry').innerHTML = '<div class="v38-kpis" style="margin-bottom:10px">' +
          V.kpi('مصادر في السجل', String(rows.length), 'مرتبة حسب سلطة المصدر', true) +
          V.kpi('كتالوج رسمي محمّل', String(catalog?.loaded || 0), catalog?.path || '—') +
          V.kpi('مشروعات غير نافذة', String(rows.filter(x => String(x.status || '').toLowerCase() === 'exposure-draft').length), 'لا تستخدم كمتطلب إلزامي') +
          '</div><div class="v38-scroll"><table class="v38-table"><thead><tr><th>الطبقة</th><th>المصدر</th><th>الحالة المهنية</th><th>النطاق</th><th>آخر تحقق</th><th>الرابط</th></tr></thead><tbody>' +
          rows.map(s => {
            const url = safeUrl(s);
            const verified = s.lastVerifiedAt || s.last_verified || '—';
            const context = s.effectiveContext ? '<div class="hint" style="margin-top:3px">' + V.esc(s.effectiveContext) + '</div>' : '';
            const due = s.commentsDue ? '<div class="hint" style="margin-top:3px">آخر تعليق: ' + V.esc(s.commentsDue) + '</div>' : '';
            return '<tr><td><span class="v38-chip ' + (s.tier === 'A' ? 'fact' : s.tier === 'B' ? 'source' : 'ai') + '">' + V.esc(s.tier || '—') + '</span></td><td><b>' + V.esc(s.title || s.id) + '</b>' + (s.issuer ? '<div class="hint">' + V.esc(s.issuer) + '</div>' : '') + '</td><td>' + statusBadge(s) + context + due + '</td><td>' + V.esc(s.kind || '—') + '</td><td class="num">' + V.esc(verified) + '</td><td>' + (url ? '<a href="' + V.esc(url) + '" target="_blank" rel="noopener" style="font-size:11px;direction:ltr;unicode-bidi:embed">' + V.esc(url.replace(/^https?:\/\//, '').slice(0, 34)) + (url.length > 42 ? '…' : '') + '</a>' : '—') + '</td></tr>';
          }).join('') +
          '</tbody></table></div><div class="v38-note info"><span>🛡️</span><span>' + V.esc('الطبقات: ' + Object.values(TIER_LABEL).join(' · ')) + '</span></div>';
      };

      V.api('/api/kosif/v38/sources/registry').then(r => {
        const reg = r.registry || {};
        paintRegistry([...(reg.core || []), ...(reg.custom || [])], reg.officialCatalog || {});
      }).catch(e => { V.$('#v38-sf-registry').innerHTML = '<div class="v38-note danger">' + V.esc(e.message) + '</div>'; });

      V.$('#v38-sf-refresh').onclick = async () => {
        const out = V.$('#v38-sf-out');
        out.innerHTML = '<div class="v38-loading">فحص المقنن جارٍ (قد يستغرق حتى دقيقة)…</div>';
        try {
          const r = await V.api('/api/kosif/v38/sources/refresh', { method: 'POST', body: { ids: [] } });
          const changed = r.results.filter(x => x.changed).length;
          const baselines = r.results.filter(x => x.baseline).length;
          out.innerHTML = '<div class="v38-kpis">' + V.kpi('أهداف مفحوصة', String(r.refreshed), 'ضمن حد الطلب', true) +
            V.kpi('تغيّرات حقيقية', String(changed), 'لا يُحسب أول فحص كتغيّر') +
            V.kpi('خط أساس جديد', String(baselines), 'أول بصمة محفوظة للمصدر') +
            V.kpi('فشل/محجوب', String(r.results.filter(x => !x.ok).length), 'روابط غير آمنة أو تعذر وصول') + '</div>' +
            '<div class="v38-scroll" style="margin-top:10px"><table class="v38-table"><thead><tr><th>المصدر</th><th>الحالة المهنية</th><th>الفحص</th><th>التغيّر</th><th>إصدارات محفوظة</th><th>شبهة حقن</th></tr></thead><tbody>' +
            r.results.map(x => '<tr><td>' + V.esc(x.title) + '</td><td>' + statusBadge(x) + '</td><td>' + (x.ok ? '<span class="v38-chip fact">فُحص</span>' : '<span class="v38-chip risk-m">' + V.esc(x.error || 'محجوب') + '</span>') + '</td><td>' + (x.baseline ? '<span class="v38-chip source">خط أساس</span>' : x.changed ? '<span class="v38-chip risk-h">تغيّر</span>' : 'مستقر') + '</td><td class="num">' + x.versionsStored + '</td><td>' + (x.injectionSuspected ? '<span class="v38-chip risk-h">مراجعة يدوية</span>' : '—') + '</td></tr>').join('') +
            '</tbody></table></div>';
        } catch (e) { out.innerHTML = '<div class="v38-note danger">' + (e.status === 401 ? 'فحص التغيّر يتطلب جلسة المالك.' : V.esc(e.message)) + '</div>'; }
      };
      V.$('#v38-sf-status').onclick = async () => {
        const out = V.$('#v38-sf-out');
        out.innerHTML = '<div class="v38-loading">قراءة سجل الحالة…</div>';
        try {
          const r = await V.api('/api/kosif/v38/sources/status');
          const entries = r.status?.entries || [];
          out.innerHTML = entries.length ? '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>المصدر</th><th class="num">إصدارات محفوظة</th><th>آخر فحص</th><th>بصمة المحتوى</th></tr></thead><tbody>' +
            entries.map(x => '<tr><td>' + V.esc(x.id) + '</td><td class="num">' + x.versions + '</td><td>' + (x.last ? V.esc(String(x.last.checkedAt).slice(0, 19).replace('T', ' ')) : '—') + '</td><td class="num" style="font-size:10px">' + (x.last ? V.esc(String(x.last.contentHash).slice(0, 16)) + '…' : '—') + '</td></tr>').join('') +
            '</tbody></table></div>' : V.empty('لا سجل بعد', 'شغّل فحص التغيّر أولًا لبناء سجل الإصدارات');
        } catch (e) { out.innerHTML = '<div class="v38-note danger">' + V.esc(e.message) + '</div>'; }
      };
    }
  });
})();
