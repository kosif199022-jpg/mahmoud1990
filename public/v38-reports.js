/*
 * KOSIF v38 — governed engagement reports
 * Monetary totals come only from the deterministic server summary. The report
 * never infers an audit opinion and always exposes completion/human gates.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  function liveState() {
    try { if (typeof state !== 'undefined' && state?.tb) return state; } catch {}
    try { return JSON.parse(localStorage.getItem('tamhees_v1') || 'null') || null; } catch { return null; }
  }
  const accCode = a => String(a?.code ?? a?.no ?? '');
  const accName = a => String(a?.name ?? '');
  const minor = (value, exp = 2) => V.fmtMinor(String(value ?? '0'), exp);
  const present = value => String(value ?? '').trim().length > 0;

  function severity(value) {
    const s = String(value || '').toLowerCase();
    if (/high|critical|material|جوهري|مرتفع|حرج/.test(s)) return 'high';
    if (/medium|moderate|متوسط/.test(s)) return 'medium';
    return 'low';
  }

  function collectFindings(st) {
    const rows = [];
    for (const round of Array.isArray(st?.rounds) ? st.rounds : []) {
      for (const f of Array.isArray(round?.parsed?.findings) ? round.parsed.findings : []) {
        rows.push({
          severity: severity(f?.severity ?? f?.sev ?? f?.risk),
          title: String(f?.title ?? f?.finding ?? f?.issue ?? 'ملاحظة مراجعة').slice(0, 300),
          note: String(f?.detail ?? f?.note ?? f?.description ?? f?.recommendation ?? '').slice(0, 1800),
          ref: Array.isArray(f?.refs) ? f.refs.join('، ') : String(f?.ref ?? f?.standard ?? '').slice(0, 180),
          source: 'round-' + String(round?.no ?? '')
        });
      }
    }
    const unresolved = st?.report?.unresolved;
    const unresolvedRows = Array.isArray(unresolved) ? unresolved : present(unresolved) ? [unresolved] : [];
    for (const item of unresolvedRows) {
      const obj = item && typeof item === 'object' ? item : { title: item };
      rows.push({
        severity: severity(obj.severity || 'medium'),
        title: String(obj.title ?? obj.issue ?? obj.description ?? 'أمر غير محسوم').slice(0, 300),
        note: String(obj.note ?? obj.effect ?? obj.description ?? '').slice(0, 1800),
        ref: String(obj.ref ?? obj.standard ?? '').slice(0, 180),
        source: 'draft-unresolved'
      });
    }
    return rows.slice(0, 80);
  }

  function gate(label, state, note) { return { label, state, note }; }

  /* Presentation-only SVGs derived from the same exact server summary. */
  const svgEsc = value => V.esc(String(value ?? ''));
  const asMinor = value => {
    try { return BigInt(String(value ?? '0')); } catch { return 0n; }
  };
  const absMinor = value => { const n = asMinor(value); return n < 0n ? -n : n; };

  function chartBars(topDr, exp) {
    const rows = (topDr || []).slice(0, 8);
    if (!rows.length) return '';
    const values = rows.map(a => {
      const dr = absMinor(a?.dr), cr = absMinor(a?.cr);
      return dr >= cr ? dr : cr;
    });
    const max = values.reduce((best, value) => value > best ? value : best, 1n);
    const rowH = 36, barRight = 438, barMax = 292, height = rows.length * rowH + 6;
    const parts = rows.map((account, index) => {
      const y = index * rowH + 4;
      const scaled = Number((values[index] * BigInt(barMax * 1000)) / max) / 1000;
      const width = Math.max(scaled, 3);
      const name = String(account?.name || accName(account) || '—');
      const short = name.length > 26 ? name.slice(0, 25) + '…' : name;
      const code = accCode(account);
      const displayed = absMinor(account?.dr) >= absMinor(account?.cr) ? account?.dr : account?.cr;
      return '<text x="' + (barRight + 6) + '" y="' + (y + 13) + '" text-anchor="start" font-size="11.5" fill="currentColor">' + svgEsc(short + (code ? ' (' + code + ')' : '')) + '</text>' +
        '<rect x="' + (barRight - width) + '" y="' + y + '" width="' + width.toFixed(1) + '" height="17" rx="3" fill="' + (index === 0 ? '#0F766E' : '#2563EB') + '" opacity="' + (index === 0 ? '1' : '0.78') + '"/>' +
        '<text x="' + (barRight - width - 7) + '" y="' + (y + 13) + '" text-anchor="end" font-size="10.5" font-weight="700" fill="currentColor" direction="ltr">' + svgEsc(minor(displayed, exp)) + '</text>';
    }).join('');
    return '<svg class="v38-chart-bars" viewBox="0 0 720 ' + height + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="أعلى الأرصدة بحسب القيمة المطلقة">' + parts + '</svg>';
  }

  function chartSeverity(findings) {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const finding of findings || []) counts[finding?.severity === 'high' || finding?.severity === 'medium' ? finding.severity : 'low'] += 1;
    const total = counts.high + counts.medium + counts.low;
    if (!total) return '';
    const circumference = 402.12, radius = 64, cx = 95, cy = 95;
    const segments = [
      { color: '#E4573D', count: counts.high, label: 'مرتفع' },
      { color: '#D8A51D', count: counts.medium, label: 'متوسط' },
      { color: '#0F766E', count: counts.low, label: 'منخفض' }
    ].filter(segment => segment.count > 0);
    let offset = 0;
    const arcs = segments.map(segment => {
      const length = (segment.count / total) * circumference;
      const circle = '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="' + segment.color + '" stroke-width="22" stroke-dasharray="' + Math.max(length - 2, 0.5).toFixed(2) + ' ' + (circumference + 4).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
      offset += length;
      return circle;
    }).join('');
    const svg = '<svg viewBox="0 0 190 190" width="172" height="172" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="توزيع النتائج حسب الشدة"><g transform="rotate(-90 ' + cx + ' ' + cy + ')">' + arcs + '</g>' +
      '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="27" font-weight="800" fill="currentColor">' + total + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="10.5" fill="currentColor" opacity="0.7">' + (total === 1 ? 'نتيجة' : 'نتائج') + '</text></svg>';
    const legend = '<ul class="v38-donut-legend">' + segments.map(segment => '<li><i style="background:' + segment.color + '"></i>' + segment.label + ' — <b>' + segment.count + '</b></li>').join('') + '</ul>';
    return '<div class="v38-donut-row">' + svg + legend + '</div>';
  }

  function visualsSection(model) {
    const hasBars = Array.isArray(model.tb?.topDr) && model.tb.topDr.length > 0;
    const hasDonut = model.findings.length > 0;
    if (!hasBars && !hasDonut) return '';
    return '<div class="v38-report-section v38-report-visuals"><h4>القراءة البصرية الحتمية</h4><div class="v38-report-charts">' +
      (hasBars ? '<div class="v38-chart-block"><div class="v38-chart-title">أعلى الأرصدة<small>الأطوال نسبية؛ النص يعرض القيمة الدقيقة</small></div>' + chartBars(model.tb.topDr, model.tb.exp) + '</div>' : '') +
      (hasDonut ? '<div class="v38-chart-block donut"><div class="v38-chart-title">توزيع النتائج حسب الشدة</div>' + chartSeverity(model.findings) + '</div>' : '') +
      '</div><div class="v38-note info"><span>⚙️</span><span>الرسوم مشتقة من ملخص الميزان الحتمي وعدّ النتائج المسجلة. لا تضيف تقديرات ولا تغيّر أي حكم محاسبي أو مراجعي.</span></div></div>';
  }

  async function buildReportModel() {
    const st = liveState();
    const accounts = Array.isArray(st?.tb?.accounts) ? st.tb.accounts : [];
    const reportDraft = st?.report && typeof st.report === 'object' ? st.report : null;
    const model = {
      generatedAt: new Date().toISOString(),
      entity: st?.entity ? {
        name: st.entity.name || '—', period: st.entity.period || '—', currency: st.entity.currency || 'ريال سعودي',
        activity: st.entity.activity || '—',
        framework: st.entity.framework === 'sme' ? 'IFRS for SMEs كما اعتمدته SOCPA' : 'معايير IFRS كما اعتمدتها SOCPA',
        listed: st.entity.listed || 'غير محدد'
      } : { name: '—', period: '—', currency: 'ريال سعودي', activity: '—', framework: '—', listed: '—' },
      tb: { count: 0, dr: '0', cr: '0', difference: '0', absoluteDifference: '0', balanced: null, topDr: [], topCr: [], exp: 2, precision: 'minor-unit-bigint', method: 'exact-sum' },
      materiality: null,
      materialityConfig: st?.mat ? { basis: String(st.mat.basis || ''), pct: String(st.mat.pct ?? '') } : null,
      findings: collectFindings(st),
      rounds: Array.isArray(st?.rounds) ? st.rounds.length : 0,
      proposedAdjustments: Array.isArray(reportDraft?.adjusting_entries) ? reportDraft.adjusting_entries.length : 0,
      executiveDraft: String(reportDraft?.executive_summary || '').slice(0, 8000),
      hasReportDraft: !!reportDraft,
      version: V.version,
      gates: []
    };

    if (accounts.length) {
      model.tb = await V.api('/api/kosif/v38/accounting/trial-balance-summary', {
        method: 'POST',
        body: {
          exp: 2,
          accounts: accounts.map(a => ({
            code: accCode(a), name: accName(a),
            dr: a?.dr ?? a?.debit ?? '0', cr: a?.cr ?? a?.credit ?? '0'
          }))
        }
      });
    }

    // Only the raw, user-entered basis is eligible. `mat.value` is a legacy,
    // precomputed display field and must never be promoted back into a source.
    const materialityAmount = st?.mat?.val ?? '';
    if (present(materialityAmount)) {
      const r = await V.api('/api/kosif/v38/accounting/materiality', {
        method: 'POST',
        body: { basis: st.mat.basis || 'profit', amount: String(materialityAmount), riskProfile: st.mat.riskProfile || 'medium', exp: 2 }
      });
      if (r.ok) model.materiality = {
        overall: r.overall, performance: r.performance, trivial: r.clearlyTrivial,
        exp: r.exp, label: r.basisLabel, method: r.method
      };
    }

    model.gates = [
      gate('بيانات المنشأة والفترة', present(model.entity.name) && model.entity.name !== '—' && present(model.entity.period) && model.entity.period !== '—' ? 'pass' : 'open', 'يلزم اسم المنشأة وفترة التقرير.'),
      gate('ميزان مراجعة محمّل', model.tb.count > 0 ? 'pass' : 'open', model.tb.count ? model.tb.count + ' حسابًا' : 'لم يُحمّل ميزان بعد.'),
      gate('توازن الميزان الحتمي', model.tb.balanced === true ? 'pass' : model.tb.balanced === false ? 'fail' : 'open', model.tb.balanced === false ? 'فرق دقيق: ' + minor(model.tb.absoluteDifference, model.tb.exp) : 'الجمع بوحدات BigInt الصغرى.'),
      gate('الأهمية النسبية الحتمية', model.materiality ? 'pass' : 'open', model.materiality ? model.materiality.label : 'الإعداد النسبي وحده لا يكفي؛ أدخل قيمة أساس حتمية.'),
      gate('مسودة تقرير موجودة', model.hasReportDraft ? 'pass' : 'open', model.hasReportDraft ? 'المسودة موجودة وتبقى خاضعة للتحقق والتحرير البشري.' : 'يلزم إنشاء مسودة تقرير داخل ملف الارتباط.'),
      gate('إجراءات وجولات موثقة', model.rounds > 0 ? 'pass' : 'open', model.rounds ? model.rounds + ' جولة' : 'لا توجد جولات موثقة.'),
      gate('معالجة الأمور المفتوحة', model.hasReportDraft && model.findings.length === 0 && model.rounds > 0 ? 'pass' : 'open', model.findings.length ? model.findings.length + ' نتيجة/أمر يحتاج تتبعًا.' : model.hasReportDraft ? 'لم تسجل المسودة أمورًا مفتوحة؛ يلزم تحقق المراجع.' : 'لا توجد مسودة كافية للحكم.'),
      gate('اعتماد المراجع والشريك', 'human', 'لا يمكن للنظام أو الذكاء الاصطناعي اجتياز هذه البوابة.')
    ];
    model.readyForHumanReview = model.gates.filter(g => g.state !== 'human').every(g => g.state === 'pass');
    return model;
  }

  function gateHtml(g) {
    const icon = g.state === 'pass' ? '✓' : g.state === 'fail' ? '!' : g.state === 'human' ? '👤' : '○';
    const label = g.state === 'pass' ? 'مكتمل' : g.state === 'fail' ? 'مانع' : g.state === 'human' ? 'بشري' : 'مفتوح';
    return '<div class="v38-report-gate ' + g.state + '"><span class="mark">' + icon + '</span><div><b>' + V.esc(g.label) + '</b><small>' + V.esc(g.note) + '</small></div><span class="state">' + label + '</span></div>';
  }

  function reportHtml(m) {
    const sev = s => ({ high: 'h', medium: 'm', low: 'l' }[s] || 'l');
    const mat = m.materiality;
    const systemGates = m.gates.filter(g => g.state !== 'human');
    const passedGates = systemGates.filter(g => g.state === 'pass').length;
    const readiness = systemGates.length ? Math.round((passedGates / systemGates.length) * 100) : 0;
    return '' +
      '<div class="v38-report-cover" id="v38-report-top"><div class="seal">KOSIF</div>' +
      '<span class="v38-report-kicker">حزمة إكمال الارتباط</span><h1>تقرير مراجعة — مسودة عمل محكومة</h1>' +
      '<div class="sub">ملخص قابل للتتبع من بيانات الملف الفعلية. لا يمثل رأيًا نظاميًا ولا يتجاوز بوابات الاعتماد البشري.</div>' +
      '<div class="meta"><div>المنشأة<b>' + V.esc(m.entity.name) + '</b></div><div>الفترة المالية<b>' + V.esc(m.entity.period) + '</b></div>' +
      '<div>الإطار<b>' + V.esc(m.entity.framework) + '</b></div><div>تاريخ التوليد<b dir="ltr">' + V.esc(new Date(m.generatedAt).toLocaleString('ar-SA')) + '</b></div></div></div>' +

      '<div class="v38-report-section"><h4>بوابات الجاهزية والإكمال</h4>' +
      '<div class="v38-report-status ' + (m.readyForHumanReview ? 'ready' : 'not-ready') + '"><b>' + (m.readyForHumanReview ? 'جاهز للعرض على المراجع المسؤول' : 'غير جاهز للاعتماد النهائي') + '</b><span>تبقى موافقة المراجع والشريك إجراءً بشريًا مستقلًا في جميع الحالات.</span></div>' +
      '<div class="v38-report-readiness"><div class="v38-readiness-ring" style="--p:' + readiness + '" role="img" aria-label="نسبة اكتمال بوابات النظام ' + readiness + ' بالمئة"><b>' + readiness + '%</b></div><div class="v38-readiness-copy"><b>' + passedGates + ' من ' + systemGates.length + ' بوابات نظامية مكتملة</b><span>هذه نسبة اكتمال للبيانات والإجراءات فقط، وليست رأيًا أو درجة جودة ولا تتجاوز الاعتماد البشري.</span></div></div>' +
      '<div class="v38-report-gates">' + m.gates.map(gateHtml).join('') + '</div></div>' +

      '<div class="v38-report-section"><h4>الملخص التنفيذي الكمي</h4><div class="v38-kpis">' +
      V.kpi('حسابات الميزان', String(m.tb.count), 'من ملف الارتباط', true) +
      V.kpi('إجمالي المدين', minor(m.tb.dr, m.tb.exp), 'جمع دقيق بالوحدات الصغرى') +
      V.kpi('إجمالي الدائن', minor(m.tb.cr, m.tb.exp), 'جمع دقيق بالوحدات الصغرى') +
      V.kpi('توازن الميزان', m.tb.balanced == null ? '—' : (m.tb.balanced ? 'متوازن ✓' : 'غير متوازن ✗'), m.tb.balanced == null ? 'لا ميزان معتمدًا بعد' : 'الفرق: ' + minor(m.tb.absoluteDifference, m.tb.exp)) +
      (mat ? V.kpi('الأهمية النسبية الكلية', minor(mat.overall, mat.exp), mat.label) : '') +
      V.kpi('النتائج المفتوحة', String(m.findings.length), 'من الجولات ومسودة الإكمال') +
      '</div><div class="v38-note info"><span>⚙️</span><span>إجماليات الميزان صادرة من <b>exact-sum / minor-unit-bigint</b>؛ لا يستخدم التقرير فواصل عائمة أو تسامحًا تقريبيًا للحكم بالتوازن.</span></div></div>' +

      visualsSection(m) +

      (m.executiveDraft ? '<div class="v38-report-section"><h4>ملخص المسودة الموجود في الملف</h4><p class="v38-report-prose">' + V.esc(m.executiveDraft) + '</p><div class="v38-note ai"><span>🤖</span><span>نص مساعد مستورد من مسودة الملف؛ يحتاج تحققًا بالأدلة وتحريرًا واعتمادًا بشريًا قبل أي استخدام خارجي.</span></div></div>' : '') +

      (mat ? '<div class="v38-report-section"><h4>الأهمية النسبية — ISA 320</h4><div class="v38-scroll"><table class="v38-table"><thead><tr><th>المستوى</th><th class="num">القيمة</th><th>الاستخدام</th></tr></thead><tbody>' +
      '<tr><td>الأهمية الكلية</td><td class="num">' + minor(mat.overall, mat.exp) + '</td><td>تقييم التحريفات على القوائم ككل</td></tr>' +
      '<tr><td>أهمية الأداء</td><td class="num">' + minor(mat.performance, mat.exp) + '</td><td>تخفيض خطر تجاوز التحريفات غير المكتشفة للمستوى الكلي</td></tr>' +
      '<tr><td>حد الواضح التافه</td><td class="num">' + minor(mat.trivial, mat.exp) + '</td><td>حد التجميع وفق السياسة المعتمدة</td></tr></tbody></table></div>' +
      '<div class="v38-note warn"><span>⚙️</span><span>القيم حتمية من نواة KOSIF ولا يعدّلها الذكاء الاصطناعي. الأساس: ' + V.esc(mat.label) + '.</span></div></div>' :
      '<div class="v38-report-section"><h4>الأهمية النسبية — بيانات ناقصة</h4><div class="v38-note warn"><span>○</span><span>يوجد إعداد نسبي' + (m.materialityConfig?.pct ? ' (' + V.esc(m.materialityConfig.pct) + '%)' : '') + '، لكن لا توجد قيمة أساس حتمية قابلة للتتبع؛ لذلك لم يعرض التقرير رقمًا تقديريًا أو قديمًا.</span></div></div>') +

      (m.findings.length ? '<div class="v38-report-section"><h4>سجل النتائج والأمور غير المحسومة</h4>' + m.findings.map(f =>
        '<div class="v38-finding"><span class="sev ' + sev(f.severity) + '">' + (f.severity === 'high' ? 'مرتفع' : f.severity === 'medium' ? 'متوسط' : 'منخفض') + '</span><div><b>' + V.esc(f.title) + '</b>' +
        (f.ref ? ' <span class="v38-chip source">' + V.esc(f.ref) + '</span>' : '') + '<div class="v38-finding-note">' + V.esc(f.note || 'يحتاج توثيق الإجراء والنتيجة والدليل.') + '</div><small>المصدر: ' + V.esc(f.source) + '</small></div></div>').join('') + '</div>' : '') +

      (m.tb.count ? '<div class="v38-report-section"><h4>أعلى الأرصدة المدينة</h4><div class="v38-scroll"><table class="v38-table"><thead><tr><th>الحساب</th><th>الاسم</th><th class="num">مدين</th><th class="num">دائن</th></tr></thead><tbody>' +
      m.tb.topDr.map(a => '<tr><td class="num" style="text-align:start">' + V.esc(accCode(a)) + '</td><td>' + V.esc(accName(a)) + '</td><td class="num">' + minor(a.dr, m.tb.exp) + '</td><td class="num">' + minor(a.cr, m.tb.exp) + '</td></tr>').join('') +
      '</tbody></table></div><p class="hint">أعلى ثمانية حسابات فقط؛ القائمة الكاملة تبقى في ملف الارتباط.</p></div>' : '') +

      '<div class="v38-report-section"><h4>خواتم الاعتماد</h4><div class="v38-signoff"><div class="v38-sign"><b>أعدّه</b>KOSIF — مسودة نظامية غير معتمدة</div>' +
      '<div class="v38-sign"><b>راجعه</b>المراجع المسؤول — الاسم والتوقيع والتاريخ</div><div class="v38-sign"><b>اعتمده</b>شريك الارتباط — الاسم والتوقيع والتاريخ</div></div>' +
      '<div class="v38-note warn"><span>🔐</span><span>لا يصدر النظام رأيًا، ولا يعتمد تسوية، ولا يرحّل قيدًا آليًا. أي صياغة رأي أو اعتماد نهائي فعل بشري مرخص وموثق.</span></div></div>';
  }

  function standaloneHtml(m) {
    const css = `:root{--v38-navy:#2F1C10;--v38-navy-2:#3B2618;--v38-gold:#F5A623;--v38-gold-2:#A96508;--v38-goldsoft:#FFF1CF;--v38-goldline:#E7C574;--v38-ink:#1A1610;--v38-muted:#5A4A3A;--v38-line:#E8D9B8;--v38-surface:#FFFDF7;--v38-info:#3F5D63;--v38-infosoft:#E9EFEC;--v38-warn:#8B5718;--v38-warnsoft:#FFF0D7;--v38-ai:#6B4257;--v38-aisoft:#F3E7EC}*{box-sizing:border-box}body{font-family:"IBM Plex Sans Arabic",Tahoma,system-ui,sans-serif;background:#FBF4E1;color:var(--v38-ink);line-height:1.75;padding:28px;max-width:1040px;margin:auto}.v38-report-cover{background:linear-gradient(145deg,#2F1C10,#4A2C18);color:#FFF8E7;border-radius:22px;padding:40px 34px;position:relative;margin-bottom:16px}.v38-report-cover h1{font-size:28px;margin:6px 0;color:#fff}.v38-report-cover .sub{color:#E6D5BB}.v38-report-cover .seal{position:absolute;inset-inline-end:32px;top:30px;border:2px solid var(--v38-gold);border-radius:99px;padding:12px;color:var(--v38-gold);font-weight:900}.v38-report-cover .meta{display:flex;gap:24px;flex-wrap:wrap;margin-top:24px;color:#D4C0A5;font-size:12px}.v38-report-cover .meta b{display:block;color:#fff}.v38-report-kicker{color:var(--v38-gold);font-weight:800}.v38-report-section{background:var(--v38-surface);border:1px solid var(--v38-line);border-radius:22px;padding:24px;margin-bottom:14px}.v38-report-section h4{border-inline-start:4px solid var(--v38-gold);padding-inline-start:10px;margin:0 0 16px}.v38-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px}.v38-kpi{border:1px solid var(--v38-line);border-radius:15px;padding:13px}.v38-kpi .l,.v38-kpi .s{font-size:11px;color:var(--v38-muted)}.v38-kpi .v{font-size:20px;font-weight:900;direction:ltr;text-align:end}.v38-report-gates{display:grid;gap:8px}.v38-report-gate{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:9px;border:1px solid var(--v38-line);border-radius:14px;padding:10px}.v38-report-gate small{display:block;color:var(--v38-muted)}.v38-report-gate .state{font-size:11px;font-weight:800}.v38-report-gate.pass .mark{color:#4E6B33}.v38-report-gate.fail .mark{color:#A8542E}.v38-report-status{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-radius:14px;padding:12px;margin-bottom:12px;background:var(--v38-warnsoft);color:var(--v38-warn)}.v38-report-status.ready{background:#EDF0E2;color:#4E6B33}.v38-report-readiness{display:grid;grid-template-columns:100px 1fr;gap:16px;align-items:center;padding:14px;border:1px solid var(--v38-line);border-radius:16px;margin:12px 0}.v38-readiness-ring{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#0F766E calc(var(--p)*1%),var(--v38-line) 0);position:relative}.v38-readiness-ring:before{content:"";position:absolute;inset:9px;border-radius:50%;background:var(--v38-surface)}.v38-readiness-ring b{position:relative;z-index:1}.v38-readiness-copy b,.v38-readiness-copy span{display:block}.v38-readiness-copy span{color:var(--v38-muted);font-size:11px}.v38-note{border:1px solid;border-radius:12px;padding:10px 12px;margin:12px 0;display:flex;gap:8px}.v38-note.info{background:var(--v38-infosoft);color:var(--v38-info)}.v38-note.warn{background:var(--v38-warnsoft);color:var(--v38-warn)}.v38-note.ai{background:var(--v38-aisoft);color:var(--v38-ai)}.v38-report-charts{display:grid;grid-template-columns:1.55fr 1fr;gap:16px}.v38-chart-block{min-width:0;padding:12px;border:1px solid var(--v38-line);border-radius:14px}.v38-chart-title{font-weight:800;margin-bottom:8px}.v38-chart-title small{display:block;color:var(--v38-muted);font-weight:500}.v38-chart-bars{width:100%;height:auto}.v38-donut-row{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}.v38-donut-legend{list-style:none;margin:0;padding:0;display:grid;gap:7px}.v38-donut-legend li{display:flex;align-items:center;gap:7px}.v38-donut-legend i{width:10px;height:10px;border-radius:50%}table{width:100%;border-collapse:collapse;font-size:12.5px}th{background:#F6EACF;text-align:start}th,td{padding:8px;border-bottom:1px solid var(--v38-line)}.num{direction:ltr;text-align:end;font-variant-numeric:tabular-nums}.v38-finding{display:flex;gap:10px;border:1px solid var(--v38-line);border-radius:14px;padding:12px;margin:8px 0}.sev{height:max-content;border-radius:9px;padding:5px;font-size:10px;font-weight:800}.sev.h{background:#F7E7DC;color:#A8542E}.sev.m{background:#FFF0D7;color:#8B5718}.sev.l{background:#E9EFEC;color:#3F5D63}.v38-finding-note{color:var(--v38-muted);margin-top:4px}.v38-chip{font-size:10px;border:1px solid var(--v38-line);border-radius:99px;padding:2px 6px}.v38-signoff{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}.v38-sign{border-top:2px solid #2F1C10;padding-top:8px;color:var(--v38-muted);font-size:11px}.v38-sign b{display:block;color:#2F1C10;margin-bottom:28px}@media(max-width:720px){body{padding:12px}.v38-report-charts{grid-template-columns:1fr}.v38-chart-block{overflow:auto}.v38-report-readiness{grid-template-columns:82px 1fr}}@media print{body{background:#fff;padding:0}.v38-report-cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}.v38-report-section{break-inside:avoid}.v38-report-visuals{break-inside:avoid}}`;
    return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مسودة تقرير KOSIF</title><style>' + css + '</style></head><body>' + reportHtml(m) + '</body></html>';
  }

  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  V.registerView({
    id: 'v38-reports', title: 'تقارير v38', icon: '▤', order: 910,
    render(sec) {
      sec.innerHTML =
        V.hero('التقارير المحكومة', 'حزمة مهنية نابضة وواضحة: أرقام حتمية، قراءة بصرية قابلة للتتبع، بوابات إكمال، واعتماد بشري صريح.', [['fact', 'BigInt دقيق'], ['safe', 'بوابات إكمال'], ['human', 'الاعتماد بشري']]) +
        '<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>إجراءات التقرير</h3><span class="v38-spacer"></span>' +
        '<button class="v38-btn gold sm" id="v38-rep-print">🖨 طباعة / PDF</button><button class="v38-btn primary sm" id="v38-rep-html">⬇ HTML مستقل</button>' +
        '<button class="v38-btn ghost sm" id="v38-rep-json">⬇ JSON قابل للتتبع</button><button class="v38-btn ghost sm" id="v38-rep-refresh">↻ تحديث</button></div></div>' +
        '<div id="v38-rep-body"><div class="v38-loading">يجري بناء التقرير من ملف الارتباط…</div></div>';
      let current = null;
      const paint = m => { const body = V.$('#v38-rep-body'); if (body) body.innerHTML = reportHtml(m); };
      const refresh = async () => { current = await buildReportModel(); paint(current); };
      V.$('#v38-rep-refresh').onclick = () => refresh().then(() => V.toast('حُدّث التقرير من بيانات الملف', 'ok')).catch(e => V.toast(e.message, 'error'));
      V.$('#v38-rep-print').onclick = () => { V.$('#v38-report-top')?.scrollIntoView({ behavior: 'smooth' }); setTimeout(() => window.print(), 300); };
      V.$('#v38-rep-json').onclick = () => { if (current) downloadFile('kosif-report-' + Date.now() + '.json', JSON.stringify(current, null, 2), 'application/json'); };
      V.$('#v38-rep-html').onclick = () => { if (current) { downloadFile('kosif-report-' + Date.now() + '.html', standaloneHtml(current), 'text/html;charset=utf-8'); V.toast('نُزّلت النسخة المستقلة', 'ok'); } };
      refresh().catch(e => { const body = V.$('#v38-rep-body'); if (body) body.innerHTML = '<div class="v38-note danger">تعذر بناء التقرير: ' + V.esc(e.message) + '</div>'; });
    }
  });
})();
