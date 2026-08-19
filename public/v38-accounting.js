/*
 * KOSIF v38 — الحاسبات المحاسبية المهنية
 * نسب مالية، إهلاك، ضريبة قيمة مضافة (ZATCA)، زكاة، أعمار ديون،
 * تسوية بنكية، ونقطة تعادل — الضريبة والزكاة عبر النواة الحتمية في الخادم.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  const numOf = v => { const n = Number(String(v ?? '0').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };
  const r2 = x => Math.round((Number(x) || 0) * 100) / 100;
  const fmt = n => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const pct = x => (Number.isFinite(x) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(x) + '%' : '—');

  function liveState() {
    try { if (typeof state !== 'undefined' && state?.tb) return state; } catch {}
    try { return JSON.parse(localStorage.getItem('tamhees_v1') || 'null') || null; } catch { return null; }
  }
  function classifyAccounts(st) {
    const accs = Array.isArray(st?.tb?.accounts) ? st.tb.accounts : [];
    const sum = (pred) => accs.filter(pred).reduce((a, x) => a + Math.abs(numOf(x.dr) - numOf(x.cr)), 0);
    const isCode = (a, prefixes) => prefixes.some(p => String(a.code ?? a.no ?? '').startsWith(p));
    return {
      count: accs.length,
      assets: sum(a => isCode(a, ['1'])),
      liabilities: sum(a => isCode(a, ['2'])),
      equity: sum(a => isCode(a, ['3'])),
      revenue: sum(a => isCode(a, ['4'])),
      expenses: sum(a => isCode(a, ['5']))
    };
  }

  const TABS = [
    ['ratios', 'النسب المالية'],
    ['depreciation', 'الإهلاك'],
    ['vat', 'ضريبة القيمة المضافة'],
    ['zakat', 'الزكاة'],
    ['aging', 'أعمار الديون'],
    ['bankrec', 'التسوية البنكية'],
    ['breakeven', 'نقطة التعادل']
  ];

  function tabBtn(id, label, active) { return '<button class="v38-tab-btn' + (active ? ' on' : '') + '" data-v38tab="' + id + '">' + label + '</button>'; }

  V.registerView({
    id: 'v38-accounting', title: 'حاسبات v38', icon: '∛', order: 930,
    render(sec) {
      sec.innerHTML =
        V.hero('الحاسبات المحاسبية المهنية', 'سبع حاسبات تشغيلية تعمل بمنطق مهني ثابت؛ الضريبة والزكاة تُحسبان عبر النواة الحتمية في الخادم بالوحدات الصغرى.', [['fact', 'حسابات قابلة للتتبع'], ['source', 'ZATCA 15%']]) +
        '<div class="v38-card v38-no-print"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px" id="v38-acc-tabs">' + TABS.map((t, i) => tabBtn(t[0], t[1], i === 0)).join('') + '</div><div id="v38-acc-body"></div></div>';
      const body = V.$('#v38-acc-body');
      const show = id => {
        V.$$('.v38-tab-btn', sec).forEach(b => b.classList.toggle('on', b.dataset.v38tab === id));
        body.innerHTML = '<div class="v38-loading">تحميل الحاسبة…</div>';
        RENDER[id](body);
      };
      V.$$('.v38-tab-btn', sec).forEach(b => b.onclick = () => show(b.dataset.v38tab));
      show('ratios');
    }
  });

  const RENDER = {};

  /* ——— النسب المالية ——— */
  RENDER.ratios = el => {
    const c = classifyAccounts(liveState());
    el.innerHTML =
      '<div class="v38-note info"><span>📊</span><span>تُصنَّف الحسابات تلقائيًا من دليل الميزان المعتمد (1 أصول، 2 التزامات، 3 حقوق ملكية، 4 إيرادات، 5 مصروفات). عدّل القيم يدويًا عند اختلاف الدليل.</span></div>' +
      '<div class="v38-form-grid">' +
      '<div class="v38-field"><label>الأصول المتداولة</label><input id="v38-ra-ca" value="' + c.assets + '"></div>' +
      '<div class="v38-field"><label>الأصول غير المتداولة</label><input id="v38-ra-nca" value="0"></div>' +
      '<div class="v38-field"><label>الالتزامات المتداولة</label><input id="v38-ra-cl" value="' + c.liabilities + '"></div>' +
      '<div class="v38-field"><label>الالتزامات غير المتداولة</label><input id="v38-ra-ncl" value="0"></div>' +
      '<div class="v38-field"><label>المخزون</label><input id="v38-ra-inv" value="0"></div>' +
      '<div class="v38-field"><label>الإيرادات</label><input id="v38-ra-rev" value="' + c.revenue + '"></div>' +
      '<div class="v38-field"><label>تكلفة المبيعات</label><input id="v38-ra-cogs" value="0"></div>' +
      '<div class="v38-field"><label>صافي الربح</label><input id="v38-ra-ni" value="' + r2(c.revenue - c.expenses) + '"></div>' +
      '</div><div style="margin-top:12px"><button class="v38-btn gold" id="v38-ra-go">احسب النسب</button></div><div id="v38-ra-out" style="margin-top:14px"></div>';
    V.$('#v38-ra-go').onclick = () => {
      const g = id => numOf(V.$(id).value);
      const ca = g('#v38-ra-ca'), nca = g('#v38-ra-nca'), cl = g('#v38-ra-cl'), ncl = g('#v38-ra-ncl'),
        inv = g('#v38-ra-inv'), rev = g('#v38-ra-rev'), cogs = g('#v38-ra-cogs'), ni = g('#v38-ra-ni');
      const ta = ca + nca, tl = cl + ncl, eq = ta - tl;
      const rows = [
        ['السيولة الجارية', cl > 0 ? ca / cl : null, '≥ 1.5 مقبول عمومًا', ca / cl >= 1.5],
        ['السيولة السريعة', cl > 0 ? (ca - inv) / cl : null, '≥ 1.0 دون المخزون', cl > 0 && (ca - inv) / cl >= 1],
        ['النقدية النسبية', ca > 0 ? (ca - inv) / ca : null, 'جودة السيولة', null],
        ['الرفع المالي (التزامات/أصول)', ta > 0 ? tl / ta : null, '≤ 0.6 مرغوب', ta > 0 && tl / ta <= 0.6],
        ['حقوق الملكية إلى الأصول', ta > 0 ? eq / ta : null, '≥ 0.4 صمود أمان', ta > 0 && eq / ta >= 0.4],
        ['هامش الربح الصافي', rev > 0 ? ni / rev : null, 'مقارنة قطاعية', null],
        ['هامش الربح الإجمالي', rev > 0 ? (rev - cogs) / rev : null, 'كفاءة التسعير', null],
        ['دوران المخزون', inv > 0 ? cogs / inv : null, 'مرات في السنة', null],
        ['فترة التحصيل (يوم)', rev > 0 ? 365 / (rev / Math.max(1, ca - inv)) : null, 'تقديري', null]
      ];
      V.$('#v38-ra-out').innerHTML = '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>النسبة</th><th class="num">القيمة</th><th>الإطار المرجعي</th><th>القراءة</th></tr></thead><tbody>' +
        rows.map(r => '<tr><td>' + r[0] + '</td><td class="num">' + (r[1] == null ? '—' : pct(r[1] * (r[0].includes('يوم') ? 1 : 100))) + '</td><td>' + r[2] + '</td><td>' + (r[3] === null ? '—' : r[3] ? '<span class="v38-chip fact">سليم</span>' : '<span class="v38-chip risk-m">للفحص</span>') + '</td></tr>').join('') +
        '</tbody></table></div><div class="v38-note ai"><span>🤖</span><span>القراءة المرجعية إرشادية عامة؛ تفسير النسب للرأي المهني يبقى للمراجع حسب القطاع والظروف.</span></div>';
    };
  };

  /* ——— الإهلاك ——— */
  RENDER.depreciation = el => {
    el.innerHTML =
      '<div class="v38-form-grid">' +
      '<div class="v38-field"><label>الأصل</label><input id="v38-dp-name" placeholder="مثال: مضخة صناعية" value="أصل"></div>' +
      '<div class="v38-field"><label>التكلفة</label><input id="v38-dp-cost" value="480000"></div>' +
      '<div class="v38-field"><label>القيمة المتبقية</label><input id="v38-dp-salv" value="40000"></div>' +
      '<div class="v38-field"><label>العمر الإنتاجي (سنوات)</label><input id="v38-dp-life" value="8"></div>' +
      '<div class="v38-field"><label>الطريقة</label><select id="v38-dp-method"><option value="sl">القسط الثابت</option><option value="ddb">المتناقص المضاعف</option><option value="syd">مجموع أرقام السنوات</option><option value="units">وحدات الإنتاج</option></select></div>' +
      '<div class="v38-field"><label>وحدات متوقعة (لطريقة الوحدات)</label><input id="v38-dp-units" value="100000"></div>' +
      '<div class="v38-field"><label>وحدات السنة الأولى</label><input id="v38-dp-u1" value="13000"></div>' +
      '</div><div style="margin-top:12px"><button class="v38-btn gold" id="v38-dp-go">أنشئ جدول الإهلاك</button></div><div id="v38-dp-out" style="margin-top:14px"></div>';
    V.$('#v38-dp-go').onclick = () => {
      const cost = numOf(V.$('#v38-dp-cost').value), salv = numOf(V.$('#v38-dp-salv').value);
      const life = Math.max(1, Math.round(numOf(V.$('#v38-dp-life').value))), m = V.$('#v38-dp-method').value;
      const units = Math.max(1, numOf(V.$('#v38-dp-units').value)), u1 = numOf(V.$('#v38-dp-u1').value);
      const rows = []; let nbv = cost, acc = 0, syd = life * (life + 1) / 2;
      for (let y = 1; y <= life; y++) {
        let dep = 0;
        if (m === 'sl') dep = (cost - salv) / life;
        else if (m === 'ddb') dep = Math.min(nbv - salv, nbv * (2 / life));
        else if (m === 'syd') dep = (cost - salv) * ((life - y + 1) / syd);
        else dep = (cost - salv) * (y === 1 ? u1 / units : (units - u1) / (units - u1 || 1) / (life - 1));
        dep = r2(dep); if (dep < 0) dep = 0;
        if (y === life && m !== 'units') dep = r2(cost - acc - salv);
        acc = r2(acc + dep); nbv = r2(cost - acc);
        rows.push([y, dep, acc, nbv]);
      }
      V.$('#v38-dp-out').innerHTML = '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>السنة</th><th class="num">قسط الإهلاك</th><th class="num">مجمع الإهلاك</th><th class="num">القيمة الدفترية</th></tr></thead><tbody>' +
        rows.map(r => '<tr><td>' + r[0] + '</td><td class="num">' + fmt(r[1]) + '</td><td class="num">' + fmt(r[2]) + '</td><td class="num">' + fmt(r[3]) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="v38-note warn"><span>📕</span><span>العرض وفق منهج IAS 16 — اختيار الطريقة يعكس نمط استهلاك المنافع الاقتصادية؛ مراجعة العمر والقيمة المتبقية سنويًا (اختبار الانخفاض IAS 36 عند المؤشرات).</span></div>';
    };
  };

  /* ——— ضريبة القيمة المضافة ——— */
  RENDER.vat = el => {
    el.innerHTML =
      '<div class="v38-form-grid">' +
      '<div class="v38-field"><label>التوريدات الخاضعة (15%)</label><input id="v38-vt-std" value="1150000"></div>' +
      '<div class="v38-field"><label>التوريدات صفرية النسبة</label><input id="v38-vt-zero" value="0"></div>' +
      '<div class="v38-field"><label>التوريدات المعفاة</label><input id="v38-vt-ex" value="0"></div>' +
      '<div class="v38-field"><label>ضريبة المدخلات</label><input id="v38-vt-in" value="69000"></div>' +
      '<div class="v38-field"><label>النسبة %</label><input id="v38-vt-rate" value="15"></div>' +
      '</div><div style="margin-top:12px"><button class="v38-btn gold" id="v38-vt-go">احسب عبر النواة الحتمية</button></div><div id="v38-vt-out" style="margin-top:14px"></div>';
    V.$('#v38-vt-go').onclick = async () => {
      try {
        const r = await V.api('/api/kosif/v38/accounting/vat', { method: 'POST', body: { taxableSupplies: numOf(V.$('#v38-vt-std').value), zeroRated: numOf(V.$('#v38-vt-zero').value), exempt: numOf(V.$('#v38-vt-ex').value), inputVat: numOf(V.$('#v38-vt-in').value), ratePct: numOf(V.$('#v38-vt-rate').value) } });
        V.$('#v38-vt-out').innerHTML =
          '<div class="v38-kpis">' + V.kpi('ضريبة المخرجات', fmt(r.outputVat / 100), 'على التوريدات الخاضعة', true) + V.kpi('ضريبة المدخلات', fmt(r.inputVat / 100), 'القابلة للخصم') + V.kpi(r.direction === 'payable' ? 'صافي مستحق للسداد' : 'صافي قابل للاسترداد', fmt(Math.abs(r.netPayable) / 100), 'صافي الفترة') + '</div>' +
          '<div class="v38-note ok"><span>⚙️</span><span>حُسبت بالوحدات الصغرى في نواة v38 — ' + V.esc(r.method) + '</span></div>';
      } catch (e) { V.toast(e.message, 'error'); }
    };
  };

  /* ——— الزكاة ——— */
  RENDER.zakat = el => {
    el.innerHTML =
      '<div class="v38-form-grid">' +
      '<div class="v38-field"><label>وعاء الزكاة التقديري</label><input id="v38-zk-base" value="10000000"></div>' +
      '<div class="v38-field"><label>النسبة %</label><input id="v38-zk-rate" value="2.5"></div>' +
      '</div><div style="margin-top:12px"><button class="v38-btn gold" id="v38-zk-go">قدّر الزكاة</button></div><div id="v38-zk-out" style="margin-top:14px"></div>';
    V.$('#v38-zk-go').onclick = async () => {
      try {
        const r = await V.api('/api/kosif/v38/accounting/zakat', { method: 'POST', body: { basis: numOf(V.$('#v38-zk-base').value), ratePct: numOf(V.$('#v38-zk-rate').value) } });
        V.$('#v38-zk-out').innerHTML = '<div class="v38-kpis">' + V.kpi('الزكاة التقديرية', fmt(r.estimatedZakat / 100), 'على الوعاء المعطى (' + r.ratePct + '% — ' + r.calendar + ')', true) + '</div>' +
          '<div class="v38-note warn"><span>⚖️</span><span>' + V.esc(r.disclaimer) + '</span></div>';
      } catch (e) { V.toast(e.message, 'error'); }
    };
  };

  /* ——— أعمار الديون ——— */
  RENDER.aging = el => {
    el.innerHTML =
      '<div class="v38-note info"><span>📥</span><span>الصق كشف أعمار الديون (عميل، رصيد، أيام متأخرة) بفواصل جدولة أو فواصل، أو عدّل النموذج الافتراضي.</span></div>' +
      '<textarea id="v38-ag-in" style="width:100%;min-height:130px;border:1px solid var(--v38-line2);border-radius:10px;padding:10px;font-family:inherit" placeholder="' + 'عميل	رصيد	أيام&#10;شركة الرياض التجارية	185000	12&#10;مؤسسة جدة للمقاولات	95000	68&#10;شركة الدمام الصناعية	61000	95"></textarea>' +
      '<div style="margin-top:10px"><button class="v38-btn gold" id="v38-ag-go">حلل الأعمار والمخصص</button></div><div id="v38-ag-out" style="margin-top:14px"></div>';
    V.$('#v38-ag-go').onclick = () => {
      const lines = V.$('#v38-ag-in').value.split(/\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return V.toast('أدخل بيانات عملاء', 'error');
      const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d120: 0 };
      const rates = { current: 0.01, d30: 0.05, d60: 0.15, d90: 0.35, d120: 0.70 };
      const rows = []; let total = 0, provision = 0;
      for (const line of lines.slice(1)) {
        const parts = line.split(/\t|,|;/).map(s => s.trim());
        if (parts.length < 3) continue;
        const name = parts[0], bal = numOf(parts[1]), days = Math.max(0, Math.round(numOf(parts[2])));
        const b = days <= 0 ? 'current' : days <= 30 ? 'd30' : days <= 60 ? 'd60' : days <= 90 ? 'd90' : 'd120';
        buckets[b] += bal; total += bal;
        const p = r2(bal * rates[b]); provision += p;
        rows.push({ name, bal, days, b, p });
      }
      const L = { current: 'غير مستحق', d30: '1–30 يومًا', d60: '31–60 يومًا', d90: '61–90 يومًا', d120: 'أكثر من 90' };
      V.$('#v38-ag-out').innerHTML =
        '<div class="v38-kpis">' + V.kpi('إجمالي الذمم', fmt(total), String(rows.length) + ' عميلًا') + V.kpi('مخصص الديون المشكوك فيها', fmt(provision), 'بنسب تحفظ تصاعدية', true) + V.kpi('النسبة المئونة', pct(total > 0 ? provision / total : 0), 'من إجمالي الذمم') + '</div>' +
        '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>الفئة العمرية</th><th class="num">الرصيد</th><th class="num">النسبة</th><th class="num">نسبة التحفظ</th><th class="num">المخصص</th></tr></thead><tbody>' +
        Object.keys(buckets).map(k => '<tr><td>' + L[k] + '</td><td class="num">' + fmt(buckets[k]) + '</td><td class="num">' + pct(total > 0 ? buckets[k] / total : 0) + '</td><td class="num">' + pct(rates[k] * 100) + '</td><td class="num">' + fmt(r2(buckets[k] * rates[k])) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div class="v38-note warn"><span>📕</span><span>نسب التحفظ افتراضية مهنية قابلة للتعديل وفق سياسة الكيان وخسائر ائتمانية متوقعة (IFRS 9 — النموذج المتوقع). العميل مسؤول عن اعتماد السياسة.</span></div>';
    };
  };

  /* ——— التسوية البنكية ——— */
  RENDER.bankrec = el => {
    el.innerHTML =
      '<div class="v38-form-grid">' +
      '<div class="v38-field"><label>رصيد الكتاب (الميزان)</label><input id="v38-br-book" value="482650"></div>' +
      '<div class="v38-field"><label>رصيد كشف البنك</label><input id="v38-br-bank" value="471300"></div>' +
      '<div class="v38-field"><label>شيكات في الطريق (مُصدرة لم تُصرف)</label><input id="v38-br-out" value="14500"></div>' +
      '<div class="v38-field"><label>إيداعات في الطريق</label><input id="v38-br-in" value="26800"></div>' +
      '<div class="v38-field"><label>رسوم بنكية غير مسجلة</label><input id="v38-br-fee" value="350"></div>' +
      '<div class="v38-field"><label>إيراد فوائد غير مسجل</label><input id="v38-br-int" value="1200"></div>' +
      '</div><div style="margin-top:12px"><button class="v38-btn gold" id="v38-br-go">اعمل التسوية</button></div><div id="v38-br-out" style="margin-top:14px"></div>';
    V.$('#v38-br-go').onclick = () => {
      const g = id => numOf(V.$(id).value);
      const adjBook = g('#v38-br-book') - g('#v38-br-fee') + g('#v38-br-int');
      const adjBank = g('#v38-br-bank') + g('#v38-br-in') - g('#v38-br-out');
      const diff = r2(adjBook - adjBank);
      V.$('#v38-br-out').innerHTML =
        '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>الجانب</th><th class="num">الرصيد</th><th class="num">التسوية</th><th class="num">بعد التسوية</th></tr></thead><tbody>' +
        '<tr><td>رصيد الكتاب</td><td class="num">' + fmt(g('#v38-br-book')) + '</td><td class="num">' + fmt(-g('#v38-br-fee') + g('#v38-br-int')) + '</td><td class="num">' + fmt(adjBook) + '</td></tr>' +
        '<tr><td>رصيد البنك</td><td class="num">' + fmt(g('#v38-br-bank')) + '</td><td class="num">' + fmt(g('#v38-br-in') - g('#v38-br-out')) + '</td><td class="num">' + fmt(adjBank) + '</td></tr>' +
        '</tbody></table></div>' +
        (Math.abs(diff) < 0.005 ? '<div class="v38-note ok"><span>✅</span><span>الطرفان متطابقان — التسوية سليمة.</span></div>' : '<div class="v38-note danger"><span>⛔</span><span>فرق غير مفسر بمقدار ' + fmt(Math.abs(diff)) + ' يتطلب فحص بنود إضافية قبل الاعتماد.</span></div>');
    };
  };

  /* ——— نقطة التعادل ——— */
  RENDER.breakeven = el => {
    el.innerHTML =
      '<div class="v38-form-grid">' +
      '<div class="v38-field"><label>السعر للوحدة</label><input id="v38-be-p" value="220"></div>' +
      '<div class="v38-field"><label>التكلفة المتغيرة للوحدة</label><input id="v38-be-v" value="130"></div>' +
      '<div class="v38-field"><label>التكاليف الثابتة</label><input id="v38-be-f" value="540000"></div>' +
      '<div class="v38-field"><label>هدف الربح</label><input id="v38-be-t" value="200000"></div>' +
      '</div><div style="margin-top:12px"><button class="v38-btn gold" id="v38-be-go">احسب نقطة التعادل</button></div><div id="v38-be-out" style="margin-top:14px"></div>';
    V.$('#v38-be-go').onclick = () => {
      const p = numOf(V.$('#v38-be-p').value), v = numOf(V.$('#v38-be-v').value), f = numOf(V.$('#v38-be-f').value), t = numOf(V.$('#v38-be-t').value);
      const cm = p - v;
      if (cm <= 0) { V.$('#v38-be-out').innerHTML = '<div class="v38-note danger"><span>⛔</span><span>هامش المساهمة غير موجب — كل وحدة تزيد الخسارة؛ راجع التسعير أو التكلفة.</span></div>'; return; }
      const q = Math.ceil(f / cm), qt = Math.ceil((f + t) / cm);
      V.$('#v38-be-out').innerHTML = '<div class="v38-kpis">' +
        V.kpi('نقطة التعادل', new Intl.NumberFormat('en-US').format(q) + ' وحدة', 'قيمة: ' + fmt(q * p), true) +
        V.kpi('وحدات هدف الربح', new Intl.NumberFormat('en-US').format(qt) + ' وحدة', 'قيمة: ' + fmt(qt * p)) +
        V.kpi('هامش المساهمة', pct(cm / p * 100), 'لكل وحدة: ' + fmt(cm)) + '</div>';
    };
  };
})();
