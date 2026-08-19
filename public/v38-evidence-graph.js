/*
 * KOSIF v38 — واجهة رسم الأدلة (Evidence Graph)
 * شاشة من الدرجة الأولى: إضافة عقد وروابط، تصفح النسب، مؤشرات تغطية،
 * وربط النتائج بالأدلة والمعايير والقرارات البشرية.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  const NODE_TYPES = [
    ['account', 'حساب'], ['journal_entry', 'قيد'], ['journal_line', 'سطر قيد'], ['document', 'مستند'],
    ['evidence', 'دليل'], ['risk', 'خطر'], ['procedure', 'إجراء'], ['finding', 'نتيجة'],
    ['adjustment', 'تسوية'], ['control', 'ضابط'], ['standard_ref', 'مرجع معياري'],
    ['ai_opinion', 'رأي AI'], ['human_decision', 'قرار بشري'], ['pbc_request', 'طلب مستند']
  ];
  const TYPE_AR = Object.fromEntries(NODE_TYPES);
  const KIND_AR = {
    supports: 'يدعم', contradicts: 'يناقض', derives_from: 'مشتق من', adjusts: 'يسوّي',
    mitigates: 'يخفف', tests: 'يختبر', references: 'يحيل إلى', responds_to: 'يرد على',
    approves: 'يعتمد', rejects: 'يرفض', requested_by: 'مطلوب بواسطة', assigned_to: 'مكلّف إلى'
  };

  V.registerView({
    id: 'v38-graph', title: 'رسم الأدلة', icon: '🕸', order: 940,
    render(sec) {
      sec.innerHTML =
        V.hero('رسم الأدلة — Evidence Graph', 'شبكة واحدة تربط الحسابات والقيود والأدلة والمخاطر والإجراءات والنتائج ومراجع المعايير وآراء الذكاء الاصطناعي والقرارات البشرية؛ الحواف تُصفّ حتى يسجَّل طرفاها فلا يضيع رابط.', [['fact', 'تغطية قابلة للقياس'], ['human', 'القرار موثق المصدر']]) +
        '<div class="v38-card"><div class="v38-cardh"><h3>مؤشرات التغطية</h3><span class="hint">صحة ملف الأدلة بأرقام حتمية</span></div><div id="v38-gr-stats" class="v38-kpis"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>إضافة عقدة / رابط</h3><span class="hint">الرابط يُصف حتى ظهور طرفيه</span></div>' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>معرّف العقدة</label><input id="v38-gr-id" placeholder="مثال: ev-bank-1"></div>' +
        '<div class="v38-field"><label>النوع</label><select id="v38-gr-type">' + NODE_TYPES.map(t => '<option value="' + t[0] + '">' + t[1] + '</option>').join('') + '</select></div>' +
        '<div class="v38-field"><label>العنوان</label><input id="v38-gr-label" placeholder="مصادقة بنكية — الحساب الجاري"></div>' +
        '</div><div style="margin-top:10px"><button class="v38-btn primary" id="v38-gr-add">＋ إضافة عقدة</button></div>' +
        '<hr style="border:0;border-top:1px dashed var(--v38-line2);margin:16px 0">' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>من</label><input id="v38-gr-from" placeholder="ev-bank-1"></div>' +
        '<div class="v38-field"><label>إلى</label><input id="v38-gr-to" placeholder="fd-rev-1"></div>' +
        '<div class="v38-field"><label>نوع الرابط</label><select id="v38-gr-kind">' + Object.keys(KIND_AR).map(k => '<option value="' + k + '">' + KIND_AR[k] + '</option>').join('') + '</select></div>' +
        '</div><div style="margin-top:10px"><button class="v38-btn gold" id="v38-gr-link">🔗 ربط</button></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>مستكشف الرسم</h3><span class="hint">اختر عقدة لتتبع نسبها</span><span class="v38-spacer"></span><button class="v38-btn ghost sm" id="v38-gr-refresh">↻ تحديث</button></div>' +
        '<div class="v38-graph-wrap"><div class="v38-node-list" id="v38-gr-list"></div><div id="v38-gr-detail">' + V.empty('لا عقد محددة', 'أضف عقدًا أو اختر من القائمة') + '</div></div></div>';

      const co = () => V.company();
      const api = (op, payload) => V.api('/api/kosif/v38/evidence-graph', { method: 'POST', body: { company: co(), op, ...payload } });
      let nodes = [];

      async function refresh() {
        try {
          const r = await V.api('/api/kosif/v38/evidence-graph?company=' + encodeURIComponent(co()));
          nodes = r.sample || [];
          paintStats(r.stats);
          paintList();
        } catch (e) {
          paintStats(null);
          V.$('#v38-gr-list').innerHTML = '<div class="v38-note danger" style="margin:8px">' + (e.status === 401 ? 'يتطلب فتح قفل المالك (كلمة مرور AI) لتخزين الرسم.' : V.esc(e.message)) + '</div>';
        }
      }
      function meter(label, val) {
        return '<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>' + V.esc(label) + '</span><b>' + Math.round((val || 0) * 100) + '%</b></div><div class="v38-meter"><i style="width:' + Math.round((val || 0) * 100) + '%"></i></div></div>';
      }
      function paintStats(st) {
        const el = V.$('#v38-gr-stats');
        if (!st) { el.innerHTML = '<div class="v38-note info">المؤشرات تظهر بعد فتح قفل المالك وتوفر جلسة تخزين.</div>'; return; }
        el.innerHTML =
          V.kpi('العقد', String(st.totals.nodes), 'بكل الأنواع', true) +
          V.kpi('الروابط', String(st.totals.edges), st.totals.pendingEdges ? ' + ' + st.totals.pendingEdges + ' مصفّاة' : 'مكتملة التسجيل') +
          V.kpi('نتائج بلا دليل', String((st.findingsNoEvidence || []).length), 'تتطلب أدلة داعمة') +
          V.kpi('مخاطر بلا إجراء', String((st.risksNoProcedure || []).length), 'تتطلب استجابة') +
          V.kpi('آراء AI غير محوكمة', String((st.aiOpinionsNoHuman || []).length), 'بانتظار قرار بشري') +
          '<div style="grid-column:1/-1;display:grid;gap:10px;margin-top:6px">' +
          meter('تغطية النتائج بالأدلة', st.health.findingsEvidenceCoverage) +
          meter('تغطية المخاطر بالإجراءات', st.health.risksProcedureCoverage) +
          meter('حوكمة آراء AI بالقرارات', st.health.aiOpinionsGoverned) + '</div>';
      }
      function paintList() {
        const el = V.$('#v38-gr-list');
        if (!nodes.length) { el.innerHTML = '<div style="padding:14px;font-size:12.5px;color:var(--v38-muted)">' + V.esc('لا عقد بعد — أضف أول عقدة أعلاه.') + '</div>'; return; }
        el.innerHTML = nodes.map(n => '<div class="v38-node-item" data-v38node="' + V.esc(n.id) + '"><span class="v38-node-ic">' + (V.icons[n.type] || '•') + '</span><div><b style="font-size:12px">' + V.esc(n.label || n.id) + '</b><div style="font-size:10.5px;color:var(--v38-muted)">' + V.esc(TYPE_AR[n.type] || n.type) + ' · ' + V.esc(n.id) + '</div></div></div>').join('');
        V.$$('.v38-node-item', el).forEach(item => item.onclick = async () => {
          V.$$('.v38-node-item', el).forEach(x => x.classList.remove('active'));
          item.classList.add('active');
          try {
            const r = await api('neighbors', { id: item.dataset.v38node, direction: 'both' });
            const lin = await api('lineage', { id: item.dataset.v38node, depth: 3, direction: 'in' });
            const d = V.$('#v38-gr-detail');
            const nb = r.neighbors || [];
            d.innerHTML = '<h4 style="color:var(--v38-navy);margin-bottom:10px">' + V.esc(item.dataset.v38node) + '</h4>' +
              (nb.length ? '<div class="v38-scroll" style="margin-bottom:12px"><table class="v38-table"><thead><tr><th>الاتجاه</th><th>الرابط</th><th>العقدة المقابلة</th></tr></thead><tbody>' +
                nb.map(x => '<tr><td>' + (x.side === 'in' ? '← وارد' : 'صادر →') + '</td><td>' + V.esc(KIND_AR[x.kind] || x.kind) + '</td><td>' + V.esc(x.node ? (x.node.label || x.node.id) : x.other) + '</td></tr>').join('') +
                '</tbody></table></div>' : '<div class="v38-note info">لا روابط لهذه العقدة بعد.</div>') +
              (lin.ok && lin.total > 1 ? '<h4 style="color:var(--v38-navy);margin:14px 0 8px">سلسلة النسب (حتى 3 مستويات)</h4><div class="v38-lineage">' +
                lin.levels.slice(1).map(lv => lv.ids.map(id => '<span class="step">' + V.esc(id) + '</span>').join('<span class="arrow">←</span>')).join('<span class="arrow">｜</span>') + '</div>' : '');
          } catch (e) { V.toast(e.message, 'error'); }
        });
      }

      V.$('#v38-gr-add').onclick = async () => {
        try {
          const r = await api('node', { node: { id: V.$('#v38-gr-id').value.trim(), type: V.$('#v38-gr-type').value, label: V.$('#v38-gr-label').value.trim() || V.$('#v38-gr-id').value.trim() } });
          V.toast(r.created ? 'أُنشئت العقدة' : 'دُمجت مع عقدة قائمة', 'ok');
          refresh();
        } catch (e) { V.toast(e.status === 401 ? 'افتح قفل المالك أولًا' : e.message, 'error'); }
      };
      V.$('#v38-gr-link').onclick = async () => {
        try {
          const r = await api('edge', { edge: { from: V.$('#v38-gr-from').value.trim(), to: V.$('#v38-gr-to').value.trim(), kind: V.$('#v38-gr-kind').value } });
          V.toast(r.queued ? 'صُفّ الرابط حتى تسجيل الطرفين' : 'ارتبطت العقدتان', 'ok');
          refresh();
        } catch (e) { V.toast(e.status === 401 ? 'افتح قفل المالك أولًا' : e.message, 'error'); }
      };
      V.$('#v38-gr-refresh').onclick = refresh;
      refresh();
    }
  });
})();
