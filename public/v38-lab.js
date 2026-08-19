/*
 * KOSIF v38 — مختبر التدقيق الاصطناعي (Synthetic Audit Lab)
 * يحمّل حزمة بيانات اصطناعية (بذرة 380019) ويشغّل تحققات حتمية:
 * توازن الميزان بالوحدات الصغرى، تجميع تحريفات، وأهمية نسبية،
 * مع متصفح سيناريوهات معياري قابل للتوسيع.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  V.registerView({
    id: 'v38-lab', title: 'مختبر v38', icon: '🧪', order: 990,
    render(sec) {
      sec.innerHTML =
        V.hero('مختبر التدقيق الاصطناعي — Synthetic Audit Lab', 'حزمة بيانات اصطناعية بالكامل (بذرة 380019): آلاف القيود المتوازنة وسادة بيانات وسيناريوهات معيارية — لاختبار المنصة وتدريب الفرق وتنفيذ الانحدارات دون أي بيانات حقيقية.', [['fact', 'بذرة ثابتة 380019'], ['source', 'لا بيانات حقيقية']]) +
        '<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>تحققات حتمية على الحزمة</h3><span class="hint">تُنفَّذ في متصفحك بالوحدات الصغرى</span><span class="v38-spacer"></span><button class="v38-btn gold sm" id="v38-lb-run">▶ تشغيل التحققات</button></div><div id="v38-lb-checks">' + V.empty('لم تُشغّل التحققات بعد', 'اضغط تشغيل لتحميل الميزان والقيود والتحريفات وفحصها') + '</div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>محتويات الحزمة</h3><span class="hint">مولدة محليًا عبر scripts/generate-v38-demo.mjs</span></div><div id="v38-lb-manifest"><div class="v38-loading">تحميل بيان الحزمة…</div></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>متصفح السيناريوهات المعيارية</h3><span class="hint">83 سيناريو اصطناعي عبر IFRS/IAS/ISA/ISQM/COSO ومحلي سعودي</span></div>' +
        '<input id="v38-lb-scn-q" placeholder="تصفية بالمرجع أو العنوان (IFRS 15، غش، ZATCA…)" style="width:100%;max-width:420px;border:1px solid var(--v38-line2);border-radius:10px;padding:9px 12px;margin-bottom:10px">' +
        '<div id="v38-lb-scenarios" style="max-height:340px;overflow:auto"></div></div>';

      let scenarios = [];
      const kindLabel = { accounting: 'محاسبي', 'accounting-future': 'محاسبي قادم', audit: 'مراجعة', quality: 'جودة', framework: 'إطار', 'local-tax': 'ضريبي سعودي', 'local-law': 'نظامي سعودي', 'local-security': 'أمن سعودي', 'local-privacy': 'خصوصية سعودية', sustainability: 'استدامة' };

      V.api('/demo/v38/manifest.json').then(m => {
        const d = m.datasets || {};
        V.$('#v38-lb-manifest').innerHTML =
          '<div class="v38-kpis">' + V.kpi('القيود', String(d.journals?.count || 0), 'قيود يومية متوازنة', true) + V.kpi('أسطر القيود', String(m.totals?.lines || 0), 'أسطر دفتر أستاذ') + V.kpi('الحسابات', String(d.accounts?.count || 0), 'دليل حسابات كامل') + V.kpi('إجمالي الميزان', V.fmtMinor(m.totals?.trialBalanceMinor || '0'), 'مدين = دائن ' + (m.totals?.balanced ? '✓' : '✗')) + '</div>' +
          '<div class="v38-scroll" style="margin-top:10px"><table class="v38-table"><thead><tr><th>مجموعة البيانات</th><th class="num">السجلات</th><th>مجموعة البيانات</th><th class="num">السجلات</th></tr></thead><tbody>' +
          (() => { const ent = Object.entries(d); const rows = []; for (let i = 0; i < ent.length; i += 2) rows.push('<tr><td>' + V.esc(ent[i][0]) + '</td><td class="num">' + ent[i][1].count + '</td><td>' + (ent[i + 1] ? V.esc(ent[i + 1][0]) : '') + '</td><td class="num">' + (ent[i + 1] ? ent[i + 1][1].count : '') + '</td></tr>'); return rows.join(''); })() +
          '</tbody></table></div><div class="v38-note warn"><span>🧪</span><span>' + V.esc(m.disclaimer || '') + '</span></div>';
        return V.api('/demo/v38/scenarios.json');
      }).then(sc => {
        scenarios = sc || [];
        paintScn('');
      }).catch(e => { V.$('#v38-lb-manifest').innerHTML = '<div class="v38-note danger">تعذر تحميل حزمة المختبر: ' + V.esc(e.message) + '</div>'; });

      function paintScn(q) {
        const t = q.trim().toLowerCase();
        const list = scenarios.filter(s => !t || (s.ref + ' ' + s.title + ' ' + (kindLabel[s.kind] || '')).toLowerCase().includes(t));
        V.$('#v38-lb-scenarios').innerHTML = list.length ? '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>المعرّف</th><th>المرجع</th><th>السيناريو</th><th>التصنيف</th><th class="num">إجراءات</th></tr></thead><tbody>' +
          list.slice(0, 120).map(s => '<tr><td class="num" style="text-align:start">' + V.esc(s.id) + '</td><td><b>' + V.esc(s.ref) + '</b></td><td>' + V.esc(s.title) + '</td><td><span class="v38-chip source">' + V.esc(kindLabel[s.kind] || s.kind) + '</span></td><td class="num">' + s.procedures + '</td></tr>').join('') +
          '</tbody></table></div>' : V.empty('لا نتائج للتصفية', 'جرّب مرجعًا آخر');
      }
      V.$('#v38-lb-scn-q').addEventListener('input', e => paintScn(e.target.value));

      V.$('#v38-lb-run').onclick = async () => {
        const out = V.$('#v38-lb-checks');
        out.innerHTML = '<div class="v38-loading">تحميل الميزان والقيود والتحريفات…</div>';
        try {
          const [accounts, journals, mis, findings] = await Promise.all([
            V.api('/demo/v38/accounts.json'), V.api('/demo/v38/journals.json'),
            V.api('/demo/v38/misstatements.json'), V.api('/demo/v38/findings.json')
          ]);
          let dr = 0n, cr = 0n, bad = 0;
          for (const j of journals) {
            let jd = 0n, jc = 0n;
            for (const l of j.lines) { if (l.dr) { jd += BigInt(l.dr); dr += BigInt(l.dr); } if (l.cr) { jc += BigInt(l.cr); cr += BigInt(l.cr); } }
            if (jd !== jc) bad++;
          }
          const tbTotal = dr;
          const om = tbTotal / 500n; // 0.2% من حركة الميزان كأساس مبسط للعرض
          let agg = null;
          try {
            const r = await V.api('/api/kosif/v38/accounting/misstatements', { method: 'POST', body: { basis: 'revenue', basisAmount: (om / 100n).toString(), riskProfile: 'medium', items: mis.map(m => ({ id: m.id, type: m.type, amount: m.amount, corrected: m.corrected })) } });
            agg = r;
          } catch {}
          out.innerHTML =
            '<div class="v38-kpis">' +
            V.kpi('توازن الميزان', dr === cr ? 'متوازن ✓' : 'غير متوازن ✗', 'إجمالي: ' + V.fmtMinor(tbTotal.toString()), true) +
            V.kpi('قيود غير متوازنة', String(bad), 'يجب أن تكون صفرًا') +
            V.kpi('حسابات مفحوصة', String(accounts.length), 'دليل كامل') +
            V.kpi('نتائج مزروعة', String(findings.length), 'سيناريوهات نتائج اصطناعية') +
            '</div>' +
            (agg ? '<div class="v38-scroll" style="margin-top:10px"><table class="v38-table"><thead><tr><th>فئة التحريف (ISA 450)</th><th class="num">القيمة</th></tr></thead><tbody>' +
              '<tr><td>تحريفات مؤكدة غير مصححة</td><td class="num">' + V.fmtMinor(agg.factual) + '</td></tr>' +
              '<tr><td>تحريفات تقديرية</td><td class="num">' + V.fmtMinor(agg.judgmental) + '</td></tr>' +
              '<tr><td>تحريفات مسقطة</td><td class="num">' + V.fmtMinor(agg.projected) + '</td></tr>' +
              '<tr><td>مصححة</td><td class="num">' + V.fmtMinor(agg.corrected) + '</td></tr>' +
              '<tr><td><b>الإجمالي غير المصحح</b></td><td class="num"><b>' + V.fmtMinor(agg.uncorrectedTotal) + '</b></td></tr>' +
              '</tbody></table></div>' +
              '<div class="v38-note ' + (agg.exceedsPerformanceMateriality ? 'danger' : 'ok') + '"><span>' + (agg.exceedsPerformanceMateriality ? '⛔' : '✅') + '</span><span>' + (agg.exceedsPerformanceMateriality ? 'يتجاوز الإجمالي غير المصحح الأهمية التنفيذية في نموذج العرض — يتطلب تقييمًا بشريًا موثقًا.' : 'الإجمالي غير المصحح دون الأهمية التنفيذية في نموذج العرض.') + '</span></div>' : '') +
            '<div class="v38-note ok"><span>⚙️</span><span>كل الأرقام أعلاه حُسبت بالوحدات الصغرى (BigInt) في متصفحك دون فواصل عائمة — نفس فلسفة نواة v38.</span></div>';
        } catch (e) { out.innerHTML = '<div class="v38-note danger">فشلت التحققات: ' + V.esc(e.message) + '</div>'; }
      };
    }
  });
})();
