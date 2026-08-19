/*
 * KOSIF v38 — التقارير الاحترافية الجمالية
 * تقرير ارتباط متكامل: غلاف، ملخص تنفيذي، مؤشرات، مصفوفة نتائج،
 * تجميع تحريفات ISA 450، ميزان معدّل، وخواتم اعتماد — قابل للطباعة/PDF
 * وله نسخة HTML مستقلة قابلة للإرسال والأرشفة.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  function liveState() {
    try { if (typeof state !== 'undefined' && state?.tb) return state; } catch {}
    try { return JSON.parse(localStorage.getItem('tamhees_v1') || 'null') || null; } catch { return null; }
  }
  const accCode = a => String(a.code ?? a.no ?? '');
  const accName = a => String(a.name ?? '');
  const numOf = v => { const n = Number(String(v ?? '0').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
  const money = n => V.fmtMinor(Math.round((Number(n) || 0) * 100), 2);

  async function buildReportModel() {
    const st = liveState();
    const model = {
      generatedAt: new Date().toISOString(),
      entity: st?.entity ? { name: st.entity.name || '—', period: st.entity.period || '—', currency: st.entity.currency || 'ريال سعودي', activity: st.entity.activity || '—', framework: st.entity.framework === 'sme' ? 'IFRS for SMEs (كما اعتمدته الهيئة)' : 'المعايير الدولية الكاملة (كما اعتمدتها الهيئة)', listed: st.entity.listed || 'غير مدرجة' } : { name: '—', period: '—', currency: 'ريال سعودي', activity: '—', framework: '—', listed: '—' },
      tb: { count: 0, dr: 0, cr: 0, balanced: null, topDr: [], topCr: [] },
      materiality: null,
      misstatements: null,
      rounds: Array.isArray(st?.rounds) ? st.rounds.length : 0,
      hasReportDraft: !!st?.report,
      version: V.version
    };
    const accs = Array.isArray(st?.tb?.accounts) ? st.tb.accounts : [];
    let dr = 0, cr = 0;
    for (const a of accs) { dr += numOf(a.dr); cr += numOf(a.cr); }
    model.tb = {
      count: accs.length, dr, cr, balanced: accs.length ? Math.abs(dr - cr) < 0.005 : null,
      topDr: [...accs].sort((x, y) => numOf(y.dr) - numOf(x.dr)).slice(0, 8),
      topCr: [...accs].sort((x, y) => numOf(y.cr) - numOf(x.cr)).slice(0, 8)
    };
    if (st?.mat && Number(st.mat.val) > 0) {
      try {
        const r = await V.api('/api/kosif/v38/accounting/materiality', { method: 'POST', body: { basis: st.mat.basis || 'profit', amount: String(st.mat.val), riskProfile: 'medium' } });
        if (r.ok) model.materiality = { overall: money(r.overall / 100), performance: money(r.performance / 100), trivial: money(r.clearlyTrivial / 100), label: r.basisLabel };
      } catch {}
    }
    return model;
  }

  function reportHtml(m) {
    const sev = s => ({ high: 'h', medium: 'm', low: 'l' }[s] || 'l');
    const findings = (m.findings || []);
    return '' +
      '<div class="v38-report-cover" id="v38-report-top">' +
      '<div class="seal">K38</div>' +
      '<h1>تقرير مراجعة الحسابات — مسودة عمل</h1>' +
      '<div class="sub">KOSIF v38 · Trusted Audit Intelligence OS · وفق المعايير الدولية المعتمدة في المملكة (IFRS/SOCPA) ومعايير المراجعة الدولية ISA</div>' +
      '<div class="meta">' +
      '<div>المنشأة<b>' + V.esc(m.entity.name) + '</b></div>' +
      '<div>الفترة المالية<b>' + V.esc(m.entity.period) + '</b></div>' +
      '<div>النشاط<b>' + V.esc(m.entity.activity) + '</b></div>' +
      '<div>الإطار المحاسبي<b>' + V.esc(m.entity.framework) + '</b></div>' +
      '<div>تاريخ التوليد<b dir="ltr">' + V.esc(new Date(m.generatedAt).toLocaleString('ar-SA')) + '</b></div>' +
      '</div></div>' +

      '<div class="v38-report-section"><h4>الملخص التنفيذي</h4>' +
      '<div class="v38-kpis">' +
      V.kpi('حسابات الميزان', String(m.tb.count), 'حسابًا معتمدًا في الملف', true) +
      V.kpi('إجمالي المدين', money(m.tb.dr), 'بالوحدة النقدية للعرض') +
      V.kpi('إجمالي الدائن', money(m.tb.cr), 'بالوحدة النقدية للعرض') +
      V.kpi('توازن الميزان', m.tb.balanced == null ? '—' : (m.tb.balanced ? 'متوازن ✓' : 'غير متوازن ✗'), m.tb.balanced == null ? 'لا ميزان معتمدًا بعد' : 'فرق: ' + money(Math.abs(m.tb.dr - m.tb.cr))) +
      (m.materiality ? V.kpi('الأهمية النسبية الكلية', m.materiality.overall, m.materiality.label) : '') +
      (m.rounds ? V.kpi('جولات المراجعة', String(m.rounds), 'جولات موثقة في الملف') : '') +
      '</div>' +
      '<div class="v38-note info"><span>🧭</span><span>هذه مسودة عمل داخلية تولّدها المنصة لحزمة ملف الارتباط، ولا تمثل رأي مراجعة؛ إصدار الرأي فعل بشري مرخّص وفق نظام مراقبي الحسابات.</span></div>' +
      '</div>' +

      (m.materiality ? '<div class="v38-report-section"><h4>منهجية الأهمية النسبية (ISA 320)</h4>' +
      '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>المستوى</th><th class="num">القيمة</th><th>الاستخدام</th></tr></thead><tbody>' +
      '<tr><td>الأهمية الكلية</td><td class="num">' + m.materiality.overall + '</td><td>تقييم أثر التحريفات على القوائم ككل</td></tr>' +
      '<tr><td>الأهمية التنفيذية</td><td class="num">' + m.materiality.performance + '</td><td>تقليل خطر التحريفات غير المكتشفة (75%/65%/50%)</td></tr>' +
      '<tr><td>عتبة الوضوح التافه</td><td class="num">' + m.materiality.trivial + '</td><td>تجميع التحريفات الأدنى من 5% من الأهمية الكلية</td></tr>' +
      '</tbody></table></div><div class="v38-note warn"><span>⚙️</span><span>العتبات حتمية من نواة v38 ولا يعدّلها الذكاء الاصطناعي. الأساس: ' + V.esc(m.materiality.label) + '.</span></div></div>' : '') +

      (findings.length ? '<div class="v38-report-section"><h4>مصفوفة النتائج والملاحظات</h4>' +
      findings.map(f => '<div class="v38-finding"><span class="sev ' + sev(f.severity) + '">' + V.esc(f.severity === 'high' ? 'مرتفع' : f.severity === 'medium' ? 'متوسط' : 'منخفض') + '</span><div><b>' + V.esc(f.title) + '</b>' + (f.ref ? ' <span class="v38-chip source">' + V.esc(f.ref) + '</span>' : '') + '<div style="font-size:12.5px;margin-top:4px;color:var(--v38-muted)">' + V.esc(f.note || '') + '</div></div></div>').join('') +
      '</div>' : '') +

      (m.tb.count ? '<div class="v38-report-section"><h4>أبرز أرصدة الميزان</h4><div class="v38-scroll"><table class="v38-table"><thead><tr><th>الحساب</th><th>الاسم</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead><tbody>' +
      m.tb.topDr.map(a => '<tr><td class="num" style="text-align:start">' + V.esc(accCode(a)) + '</td><td>' + V.esc(accName(a)) + '</td><td class="num">' + money(numOf(a.dr)) + '</td><td class="num">' + money(numOf(a.cr)) + '</td></tr>').join('') +
      '</tbody></table></div><div class="hint" style="font-size:11.5px;color:var(--v38-muted);margin-top:8px">أعلى ثمانية حسابات مدينة؛ القائمة الكاملة في حزمة التصدير.</div></div>' : '') +

      '<div class="v38-report-section"><h4>خواتم الاعتماد</h4>' +
      '<div class="v38-signoff">' +
      '<div class="v38-sign"><b>أعدّه</b>مساعد المراجعة الإلكتروني Kosif v38</div>' +
      '<div class="v38-sign"><b>راجعه</b>المراجع المسؤول — الاسم والتوقيع والتاريخ</div>' +
      '<div class="v38-sign"><b>اعتمده</b>شريك الارتباط — الاسم والتوقيع والتاريخ</div>' +
      '</div>' +
      '<div class="v38-note" style="background:var(--v38-goldsoft);border-color:var(--v38-goldline);color:var(--v38-gold-2)"><span>🔐</span><span>الاعتماد النهائي بشري موثق؛ لا يصدر النظام رأيًا ولا يرحّل قيدًا اعتماديًا آليًا.</span></div>' +
      '</div>';
  }

  V.registerView({
    id: 'v38-reports', title: 'تقارير v38', icon: '▤', order: 910,
    render(sec) {
      sec.innerHTML =
        V.hero('التقارير الاحترافية', 'مسودة تقرير ارتباط جمالية موثقة تُبنى من ملف العمل الحالي — بغلاف رسمي ومؤشرات ومصفوفات وخواتم اعتماد.', [['fact', 'من بيانات الملف الفعلية'], ['human', 'الاعتماد بشري']]) +
        '<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>إجراءات التقرير</h3><span class="v38-spacer"></span>' +
        '<button class="v38-btn gold sm" id="v38-rep-print">🖨 طباعة / حفظ PDF</button>' +
        '<button class="v38-btn primary sm" id="v38-rep-html">⬇ نسخة HTML مستقلة</button>' +
        '<button class="v38-btn ghost sm" id="v38-rep-json">⬇ بيانات التقرير (JSON)</button>' +
        '<button class="v38-btn ghost sm" id="v38-rep-refresh">↻ تحديث من الملف</button></div></div>' +
        '<div id="v38-rep-body"><div class="v38-loading">يجري بناء التقرير من ملف الارتباط…</div></div>';

      const paint = m => { const b = V.$('#v38-rep-body'); if (b) b.innerHTML = reportHtml(m); };
      let current = null;
      const refresh = async () => { current = await buildReportModel(); paint(current); };
      V.$('#v38-rep-refresh').onclick = () => refresh().then(() => V.toast('حدّث التقرير من بيانات الملف', 'ok')).catch(e => V.toast(e.message, 'error'));
      V.$('#v38-rep-print').onclick = () => { const top = V.$('#v38-report-top'); if (top) top.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => window.print(), 350); };
      V.$('#v38-rep-json').onclick = () => {
        if (!current) return;
        downloadFile('kosif-v38-report-' + Date.now() + '.json', JSON.stringify(current, null, 2), 'application/json');
      };
      V.$('#v38-rep-html').onclick = () => {
        if (!current) return;
        downloadFile('kosif-v38-report-' + Date.now() + '.html', standaloneHtml(current), 'text/html;charset=utf-8');
        V.toast('نُزّلت النسخة المستقلة', 'ok');
      };
      refresh().catch(e => { const b = V.$('#v38-rep-body'); if (b) b.innerHTML = '<div class="v38-note danger">تعذر بناء التقرير: ' + V.esc(e.message) + '</div>'; });

      function downloadFile(name, content, mime) {
        const blob = new Blob([content], { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
      function standaloneHtml(m) {
        const inlineCss = `:root{--navy:#0A1F44;--navy2:#10294F;--navy3:#17325F;--gold:#C9A227;--gold2:#A98A1F;--goldsoft:#FBF6E3;--goldline:#E3CF8F;--ink:#0E1B2E;--muted:#5A6B82;--line:#DCE2EC;--ok:#1E6B4F;--oksoft:#E3F2EA;--danger:#A3281D;--dangersoft:#F9E8E5;--warn:#8F5310;--warnsoft:#FAEEDA;--info:#28527A;--infosoft:#E6EEF7}*{box-sizing:border-box;margin:0;padding:0}body{font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;background:#F4F6FA;color:var(--ink);line-height:1.8;padding:26px;max-width:980px;margin:auto}.cover{background:linear-gradient(150deg,var(--navy),var(--navy3));color:#EDF2FA;border-radius:16px;padding:38px 34px;position:relative;overflow:hidden;margin-bottom:16px}.cover h1{font-size:25px;color:#F6EFDB;margin-bottom:6px}.cover .sub{color:#AFC0DA;font-size:13px}.cover .meta{display:flex;gap:26px;flex-wrap:wrap;margin-top:24px;font-size:12px;color:#C6D2E6}.cover .meta b{display:block;color:#F0E9D4;margin-top:2px}.cover .seal{position:absolute;inset-inline-end:40px;top:40px;width:54px;height:54px;border:1.5px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:900}.sec{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:14px}.sec h4{color:var(--navy);border-inline-start:4px solid var(--gold);padding-inline-start:10px;margin-bottom:14px}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.kpi{border:1px solid var(--line);border-radius:12px;padding:12px 14px}.kpi .l{font-size:11.5px;color:var(--muted);font-weight:700}.kpi .v{font-size:20px;font-weight:900;color:var(--navy);direction:ltr;text-align:end}table{width:100%;border-collapse:collapse;font-size:12.5px}th{background:#EDF1F8;color:var(--navy);padding:8px;border-bottom:2px solid #C4CDDD;text-align:start}td{padding:7px 8px;border-bottom:1px solid var(--line)}.num{direction:ltr;text-align:end;font-variant-numeric:tabular-nums}.note{border-radius:10px;padding:10px 13px;font-size:12.5px;border:1px solid;margin:10px 0}.note.i{background:var(--infosoft);color:var(--info)}.note.w{background:var(--warnsoft);color:var(--warn)}.note.g{background:var(--goldsoft);color:var(--gold2)}.signoff{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px;margin-top:18px}.sign{border-top:2px solid var(--navy);padding-top:8px;font-size:11.5px;color:var(--muted)}.sign b{display:block;color:var(--navy);margin-bottom:26px;font-size:12.5px}@media print{body{background:#fff;padding:0}.cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
        const body = reportHtml(m).replace(/class="v38-report-cover"/, 'class="cover"').replace(/class="v38-report-section"/g, 'class="sec"').replace(/class="v38-kpi([^"]*)"/g, 'class="kpi"').replace(/class="v38-table"/g, '').replace(/class="v38-scroll"/g, '').replace(/class="v38-note info"/g, 'class="note i"').replace(/class="v38-note warn"/g, 'class="note w"').replace(/class="v38-signoff"/, 'class="signoff"').replace(/class="v38-sign"/g, 'class="sign"').replace(/class="v38-chip source"/g, 'b');
        return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير KOSIF v38</title><style>' + inlineCss + '</style></head><body>' + body + '</body></html>';
      }
    }
  });
})();
