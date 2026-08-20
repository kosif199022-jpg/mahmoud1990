/*
 * KOSIF v38 — مجلس المراجعين v3 (Audit Council)
 * خمسة مقاعد: OpenAI + Claude + Gemini + مزود عام/محلي + مراجع بشري.
 * جولة عمياء مستقلة لكل عضو، ثم مصفوفة توافق/تعارض/فجوات أدلة حتمية
 * تُحسب في الخادم، ثم قرار بشري موثق. لا يتحول توافق النماذج إلى اعتماد.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  const MEMBERS = [
    { key: 'openai', name: 'OpenAI', icon: 'OA', cls: '' },
    { key: 'anthropic', name: 'Claude', icon: 'CL', cls: '' },
    { key: 'gemini', name: 'Gemini', icon: 'GM', cls: '' },
    { key: 'public-local', name: 'مزود عام/محلي', icon: 'PU', cls: '' },
    { key: 'human', name: 'المراجع البشري', icon: '👤', cls: 'human' }
  ];

  V.registerView({
    id: 'v38-council', title: 'مجلس v3', icon: '⚖', order: 950,
    render(sec) {
      sec.innerHTML =
        V.hero('مجلس المراجعين v3 — Audit Council', 'كل عضو AI يستلم نفس مهمة الأدلة مستقلًا (جولة عمياء)، تُجرَّد مخرجاته من حقول السلطة، ثم تبني النواة مصفوفة توافق وتعارض وفجوات أدلة — والاعتماد النهائي بشري دائمًا.', [['ai', 'أربعة نماذج'], ['human', 'قرار نهائي موثق']]) +
        '<div class="v38-council-steps" aria-label="مسار عمل مجلس المراجعين"><div class="v38-council-step"><i>1</i><b>جولة عمياء</b><small>نفس السؤال يصل لكل نموذج دون إظهار آراء المقاعد الأخرى.</small></div><div class="v38-council-step"><i>2</i><b>مصفوفة حتمية</b><small>تجمع النواة التوافق والتعارض وفجوات الأدلة دون منح النماذج سلطة.</small></div><div class="v38-council-step human"><i>3</i><b>قرار بشري</b><small>المراجع وحده يقبل أو يطعن أو يرفض مع توثيق الأساس المهني.</small></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>مقاعد المجلس</h3><span class="hint">الأعضاء لا يرون آراء بعضهم في الجولة العمياء</span></div>' +
        '<div class="v38-members">' + MEMBERS.map(m => '<div class="v38-member ' + m.cls + '" data-seat="' + m.key + '" data-state="idle"><div class="avatar">' + m.icon + '</div><b>' + m.name + '</b><small>' + (m.key === 'human' ? 'الاعتماد والرفض الموثق' : 'تحليل استشاري فقط') + '</small><span class="seat-state">' + (m.key === 'human' ? 'بوابة القرار' : 'جاهز') + '</span></div>').join('') + '</div></div>' +

        '<div class="v38-card"><div class="v38-cardh"><h3>مهمة المجلس</h3><span class="hint">وصف مهمة الأدلة كما ستُرسل للجميع بالتساوي</span></div>' +
        '<div class="v38-council-presets" aria-label="قوالب مهام مراجعية"><button type="button" data-preset="revenue">الإيرادات</button><button type="button" data-preset="evidence">كفاية الأدلة</button><button type="button" data-preset="estimates">التقديرات</button><button type="button" data-preset="going">الاستمرارية</button></div>' +
        '<div class="v38-field"><label>نص المهمة / السؤال المراجعي</label><textarea id="v38-cc-task" style="min-height:110px" placeholder="مثال: قيّم كفاية الأدلة على اكتشاف الإيرادات وفق IFRS 15 لحسابات 4101 و4103 في ميزان 2026، وحدد فجوات الأدلة والتحريفات المحتملة مع الإشارة للمعايير."></textarea></div>' +
        '<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="v38-btn gold" id="v38-cc-run">▶ بدء الجولة العمياء</button>' +
        '<button class="v38-btn ghost" id="v38-cc-challenge">🔁 جولة طعن (بلا هويات)</button>' +
        '</div><div id="v38-cc-status" role="status" aria-live="polite" style="margin-top:12px"></div></div>' +

        '<div class="v38-card" id="v38-cc-matrix-card" style="display:none"><div class="v38-cardh"><h3>مصفوفة التوافق الحتمية</h3><span class="hint">تُحسب في الخادم ولا يمكن لأي نموذج التأثير فيها</span><span class="v38-spacer"></span><span class="v38-badge" id="v38-cc-count"></span></div><div id="v38-cc-matrix"></div></div>' +

        '<div class="v38-card"><div class="v38-cardh"><h3>قرار المراجع البشري</h3><span class="hint">يُوثَّق في رسم الأدلة كقرار بشري مرتبط بالمهمة</span></div>' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>القرار</label><select id="v38-cc-decision"><option value="accept">قبول مع مسؤولية موثقة</option><option value="challenge">إعادة الجولة بأسئلة إضافية</option><option value="reject">رفض الاستنتاجات</option><option value="pending">تأجيل لاستكمال أدلة</option></select></div>' +
        '<div class="v38-field"><label>الأساس والمبرر</label><input id="v38-cc-why" placeholder="أساس القرار المهني والمراجع"></div>' +
        '</div><div style="margin-top:10px"><button class="v38-btn primary" id="v38-cc-record" disabled aria-disabled="true">✍ توثيق القرار</button></div><div id="v38-cc-dec-out" role="status" aria-live="polite" style="margin-top:10px"></div></div>';

      let currentTaskId = null;
      const runButton = V.$('#v38-cc-run');
      const recordButton = V.$('#v38-cc-record');
      const taskField = V.$('#v38-cc-task');
      const presets = {
        revenue: 'قيّم مخاطر الاعتراف بالإيراد واكتمال أدلته وفق IFRS 15 ومعايير المراجعة ذات الصلة. حدّد الادعاءات المتأثرة، الأدلة الناقصة، مؤشرات التحريف، والإجراءات المقترحة مع مراجع المصدر.',
        evidence: 'قيّم كفاية وملاءمة أدلة المراجعة وفق ISA 500 للمسألة المحددة. افصل بين الحقائق والاستنتاجات، وحدد فجوات الأدلة والتعارضات والإجراءات الإضافية اللازمة.',
        estimates: 'قيّم التقديرات المحاسبية وعدم التأكد ومخاطر تحيز الإدارة وفق ISA 540. حدد البيانات والافتراضات الحساسة، الاختبارات البديلة، وفجوات التوثيق دون إصدار رأي نهائي.',
        going: 'قيّم مؤشرات الاستمرارية وخطة الإدارة والأدلة الداعمة وفق ISA 570. ميّز بين المؤشرات والأحكام، وحدد السيناريوهات وفجوات الأدلة والإفصاحات التي تحتاج مراجعة.'
      };
      V.$$('.v38-council-presets button').forEach(button => {
        button.onclick = () => { taskField.value = presets[button.dataset.preset] || ''; taskField.focus(); };
      });

      function seatState(key, state, label) {
        const seat = V.$('.v38-member[data-seat="' + key + '"]');
        if (!seat) return;
        seat.dataset.state = state;
        const output = V.$('.seat-state', seat); if (output) output.textContent = label;
      }

      function resetDecisionGate() {
        recordButton.disabled = true;
        recordButton.setAttribute('aria-disabled', 'true');
        V.$('#v38-cc-dec-out').innerHTML = '';
      }

      /* توزيع مهمة واحدة على مقاعد AI — عبر مسار الذكاء الاصطناعي الموثوق القائم
         (مفتاح + نموذج محفوظان في إعدادات المنصة) دون كشف هوية الأعضاء لبعضهم. */
      async function runMember(memberKey, taskText) {
        const settings = (() => { try { return JSON.parse(localStorage.getItem('kosif_ai_settings_v1') || '{}'); } catch { return {}; } })();
        const modelByProvider = { openai: 'gpt-5.6', anthropic: 'claude-sonnet-4', gemini: 'gemini-3.6-flash', 'public-local': 'public-env' };
        if (memberKey === 'public-local') {
          const r = await V.api('/api/kosif/v38/public-ai', { method: 'POST', body: { prompt: taskText } }).catch(e => { throw e; });
          return { provider: 'public-local', model: 'server-configured', opinion: parseOpinion(r.text) };
        }
        const model = settings.model && settings.provider === memberKey ? settings.model : modelByProvider[memberKey];
        const r = await V.api('/api/kosif/ai', { method: 'POST', body: { provider: memberKey, model, prompt: taskText, json: true, maxTokens: 1400, agent: { jurisdiction: settings.jurisdiction || 'saudi', industry: settings.industry || 'عام' } } });
        const text = r.text || r.content || JSON.stringify(r).slice(0, 4000);
        return { provider: memberKey, model, opinion: parseOpinion(text) };
      }
      function parseOpinion(text) {
        let o = {};
        try { o = JSON.parse(String(text).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch { o = {}; }
        return {
          findings: Array.isArray(o.findings) ? o.findings.slice(0, 30).map(f => ({
            ref: String(f.ref || f.id || f.account || ''), view: String(f.view || f.stance || f.conclusion || ''),
            severity: String(f.severity || 'medium'), note: String(f.note || f.rationale || '').slice(0, 400),
            evidence: f.evidence == null ? [] : (Array.isArray(f.evidence) ? f.evidence : [f.evidence])
          })) : [],
          conclusion: String(o.conclusion || o.summary || String(text).slice(0, 600))
        };
      }

      runButton.onclick = async () => {
        const task = taskField.value.trim();
        if (task.length < 15) return V.toast('اكتب مهمة مراجعية أوضح (15 حرفًا على الأقل)', 'error');
        currentTaskId = 'T-' + Date.now().toString(36);
        const status = V.$('#v38-cc-status');
        const aiSeats = MEMBERS.filter(m => m.key !== 'human');
        const members = [];
        resetDecisionGate();
        runButton.disabled = true;
        V.$('#v38-cc-matrix-card').style.display = 'none';
        status.innerHTML = '<div class="v38-note info"><span>◉</span><span>الجولة العمياء تعمل الآن. كل مقعد يحلل المهمة مستقلًا…</span></div>';
        aiSeats.forEach(seat => seatState(seat.key, 'running', 'قيد التحليل'));
        try {
          const results = await Promise.allSettled(aiSeats.map(seat => runMember(seat.key, task)));
          results.forEach((res, i) => {
            const seat = aiSeats[i];
            if (res.status === 'fulfilled') {
              members.push(res.value);
              seatState(seat.key, 'done', 'اكتمل');
            } else {
              members.push({ provider: seat.key, model: '—', opinion: { findings: [], conclusion: 'تعذر الحصول على رد: ' + String(res.reason?.message || res.reason).slice(0, 200) } });
              seatState(seat.key, 'error', 'تعذر الرد');
            }
          });
          status.innerHTML = '<div class="v38-note ok"><span>✅</span><span>أكمل ' + members.filter(m => m.opinion.findings.length || m.opinion.conclusion).length + ' من ' + aiSeats.length + ' مقاعد AI الجولة العمياء. يجري بناء المصفوفة الحتمية…</span></div>';
          const r = await V.api('/api/kosif/v38/council/matrix', { method: 'POST', body: { taskId: currentTaskId, members } });
          paintMatrix(r.matrix);
          V.toast('بُنيت مصفوفة التوافق', 'ok');
        } catch (e) {
          status.innerHTML = '<div class="v38-note danger"><span>⛔</span><span>' + V.esc(e.status === 401 ? 'افتح قفل المالك واختبر مفاتيح المزودين أولًا.' : e.message) + '</span></div>';
          V.toast(e.status === 401 ? 'افتح قفل المالك واختبر مفاتيح المزودين أولًا' : e.message, 'error');
        } finally { runButton.disabled = false; }
      };
      V.$('#v38-cc-challenge').onclick = () => {
        const prior = taskField.value.trim();
        taskField.value = 'جولة طعن عمياء: اختبر الاستنتاجات المتوقعة للمهمة التالية نقديًا، وابحث عن أدلة ناقضة وبدائل وفجوات لم تُفحص. لا تفترض صحة أي رأي سابق ولا تصدر اعتمادًا نهائيًا.\n\n' + prior;
        currentTaskId = null;
        resetDecisionGate();
        V.$('#v38-cc-matrix-card').style.display = 'none';
        taskField.focus();
        V.toast('أُعدّت صياغة طعن مستقلة. راجعها ثم ابدأ الجولة.', 'info');
      };

      function paintMatrix(m) {
        const card = V.$('#v38-cc-matrix-card'); card.style.display = '';
        V.$('#v38-cc-count').textContent = (m.findings || []).length + ' نتيجة';
        const cell = f => f.state === 'agreement' ? '<span class="v38-matrix-cell agree">توافق ' + Math.round(f.agreementRate * 100) + '%</span>' : '<span class="v38-matrix-cell conflict">تعارض</span>';
        V.$('#v38-cc-matrix').innerHTML =
          (m.findings || []).length ? '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>المرجع</th><th>الحالة</th><th class="num">عدد الآراء</th><th>فجوة دليل</th><th>أعلى شدة مذكورة</th></tr></thead><tbody>' +
          m.findings.map(f => {
            const sev = f.views.map(v => v.severity).includes('high') ? 'مرتفعة' : f.views.map(v => v.severity).includes('medium') ? 'متوسطة' : 'منخفضة';
            return '<tr><td class="num" style="text-align:start">' + V.esc(f.ref) + '</td><td>' + cell(f) + '</td><td class="num">' + f.views.length + '</td><td>' + (f.evidenceGap ? '<span class="v38-matrix-cell gap">نقص أدلة</span>' : '—') + '</td><td>' + sev + '</td></tr>';
          }).join('') + '</tbody></table></div>' : V.empty('لا نتائج مطابقة', 'لم تُرجع النماذج نتائج منظمة — جرّب صياغة مهمة أوضح') +
          '<div class="v38-note warn"><span>⚖️</span><span>' + V.esc(m.governance.reason) + ' الحقول المحجوبة: ' + (m.governance.forbiddenFieldsStripped || []).join('، ') + '.</span></div>' +
          ((m.conflicts || []).length ? '<div class="v38-note danger"><span>⚡</span><span>تعارضات تتطلب فصلًا بشريًا: ' + m.conflicts.map(f => V.esc(f.ref)).join('، ') + '</span></div>' : '') +
          ((m.evidenceGaps || []).length ? '<div class="v38-note warn"><span>🔎</span><span>فجوات أدلة: ' + m.evidenceGaps.map(f => V.esc(f.ref)).join('، ') + '</span></div>' : '');
        recordButton.disabled = false;
        recordButton.setAttribute('aria-disabled', 'false');
        seatState('human', 'ready', 'بانتظار قرارك');
      }

      recordButton.onclick = async () => {
        const decision = V.$('#v38-cc-decision').value, why = V.$('#v38-cc-why').value.trim();
        if (!currentTaskId) return V.toast('أكمل الجولة والمصفوفة قبل توثيق القرار', 'error');
        if (!why) return V.toast('الأساس المهني مطلوب لتوثيق القرار', 'error');
        try {
          const gid = 'hd-' + Date.now().toString(36);
          await V.api('/api/kosif/v38/evidence-graph', { method: 'POST', body: { company: V.company(), op: 'node', node: { id: gid, type: 'human_decision', label: 'قرار: ' + ({ accept: 'قبول', challenge: 'إعادة جولة', reject: 'رفض', pending: 'تأجيل' }[decision]), detail: why, attrs: { decision, taskId: currentTaskId || '' } } } });
          if (currentTaskId) await V.api('/api/kosif/v38/evidence-graph', { method: 'POST', body: { company: V.company(), op: 'edge', edge: { from: currentTaskId, to: gid, kind: decision === 'reject' ? 'rejects' : 'approves' } } }).catch(() => {});
          V.$('#v38-cc-dec-out').innerHTML = '<div class="v38-note ok"><span>✅</span><span>وُثّق القرار البشري في رسم الأدلة (' + V.esc(gid) + ') مع أساسه — النظام لا يصدر رأيًا بدلًا عنك.</span></div>';
          seatState('human', 'done', 'قرار موثق');
        } catch (e) { V.toast(e.status === 401 ? 'افتح قفل المالك لتوثيق القرار' : e.message, 'error'); }
      };
    }
  });
})();
