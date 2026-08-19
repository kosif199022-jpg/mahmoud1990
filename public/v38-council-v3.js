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
        V.hero('مجلس المراجعين v3 — Audit Council', 'كل عضو AI يستلم نفس مهمة الأدلة مستقلًا (جولة عمياء)، تُجرَّد مخرجاته من حقول السلطة، ثم تبني النواة مصفوفة تواتف وتعارض وفجوات أدلة — والاعتماد النهائي بشري دائمًا.', [['ai', 'أربعة نماذج'], ['human', 'قرار نهائي موثق']]) +
        '<div class="v38-card"><div class="v38-cardh"><h3>مقاعد المجلس</h3><span class="hint">الأعضاء لا يرون آراء بعضهم في الجولة العمياء</span></div>' +
        '<div class="v38-members">' + MEMBERS.map(m => '<div class="v38-member ' + m.cls + '"><div class="avatar">' + m.icon + '</div><b>' + m.name + '</b><small>' + (m.key === 'human' ? 'الاعتماد والرفض الموثق' : 'تحليل استشاري فقط') + '</small></div>').join('') + '</div></div>' +

        '<div class="v38-card"><div class="v38-cardh"><h3>مهمة المجلس</h3><span class="hint">وصف مهمة الأدلة كما ستُرسل للجميع بالتساوي</span></div>' +
        '<div class="v38-field"><label>نص المهمة / السؤال المراجعي</label><textarea id="v38-cc-task" style="min-height:110px" placeholder="مثال: قيّم كفاية الأدلة على اكتشاف الإيرادات وفق IFRS 15 لحسابات 4101 و4103 في ميزان 2026، وحدد فجوات الأدلة والتحريفات المحتملة مع الإشارة للمعايير."></textarea></div>' +
        '<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="v38-btn gold" id="v38-cc-run">▶ بدء الجولة العمياء</button>' +
        '<button class="v38-btn ghost" id="v38-cc-challenge">🔁 جولة طعن (بلا هويات)</button>' +
        '</div><div id="v38-cc-status" style="margin-top:12px"></div></div>' +

        '<div class="v38-card" id="v38-cc-matrix-card" style="display:none"><div class="v38-cardh"><h3>مصفوفة التوافق الحتمية</h3><span class="hint">تُحسب في الخادم ولا يمكن لأي نموذج التأثير فيها</span><span class="v38-spacer"></span><span class="v38-badge" id="v38-cc-count"></span></div><div id="v38-cc-matrix"></div></div>' +

        '<div class="v38-card"><div class="v38-cardh"><h3>قرار المراجع البشري</h3><span class="hint">يُوثَّق في رسم الأدلة كقرار بشري مرتبط بالمهمة</span></div>' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>القرار</label><select id="v38-cc-decision"><option value="accept">قبول مع مسؤولية موثقة</option><option value="challenge">إعادة الجولة بأسئلة إضافية</option><option value="reject">رفض الاستنتاجات</option><option value="pending">تأجيل لاستكمال أدلة</option></select></div>' +
        '<div class="v38-field"><label>الأساس والمبرر</label><input id="v38-cc-why" placeholder="أساس القرار المهني والمراجع"></div>' +
        '</div><div style="margin-top:10px"><button class="v38-btn primary" id="v38-cc-record">✍ توثيق القرار</button></div><div id="v38-cc-dec-out" style="margin-top:10px"></div></div>';

      let currentTaskId = null;

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

      V.$('#v38-cc-run').onclick = async () => {
        const task = V.$('#v38-cc-task').value.trim();
        if (task.length < 15) return V.toast('اكتب مهمة مراجعية أوضح (15 حرفًا على الأقل)', 'error');
        currentTaskId = 'T-' + Date.now().toString(36);
        const status = V.$('#v38-cc-status');
        const aiSeats = MEMBERS.filter(m => m.key !== 'human');
        const members = [];
        const results = await Promise.allSettled(aiSeats.map(seat => runMember(seat.key, task)));
        results.forEach((res, i) => {
          const seat = aiSeats[i];
          if (res.status === 'fulfilled') members.push(res.value);
          else members.push({ provider: seat.key, model: '—', opinion: { findings: [], conclusion: 'تعذر الحصول على رد: ' + String(res.reason?.message || res.reason).slice(0, 200) } });
        });
        status.innerHTML = '<div class="v38-note ' + (members.length ? 'ok' : 'danger') + '"><span>' + (members.length ? '✅' : '⛔') + '</span><span>أكمل ' + members.filter(m => m.opinion.findings.length || m.opinion.conclusion).length + ' من ' + aiSeats.length + ' مقاعد AI الجولة العمياء. أرسل النتائج للمصفوفة الحتمية…</span></div>';
        try {
          const r = await V.api('/api/kosif/v38/council/matrix', { method: 'POST', body: { taskId: currentTaskId, members } });
          paintMatrix(r.matrix);
          V.toast('بُنيت مصفوفة التوافق', 'ok');
        } catch (e) { V.toast(e.status === 401 ? 'افتح قفل المالك واختبر مفاتيح المزودين أولًا' : e.message, 'error'); }
      };
      V.$('#v38-cc-challenge').onclick = () => V.toast('جولة الطعن تعيد المهمة بلا هويات الأعضاء وبطلب نقد استنتاجات الجولة السابقة — عبر زر البدء مع تعديل نص المهمة', 'info');

      function paintMatrix(m) {
        const card = V.$('#v38-cc-matrix-card'); card.style.display = '';
        V.$('#v38-cc-count').textContent = (m.findings || []).length;
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
      }

      V.$('#v38-cc-record').onclick = async () => {
        const decision = V.$('#v38-cc-decision').value, why = V.$('#v38-cc-why').value.trim();
        if (!why) return V.toast('الأساس المهني مطلوب لتوثيق القرار', 'error');
        try {
          const gid = 'hd-' + Date.now().toString(36);
          await V.api('/api/kosif/v38/evidence-graph', { method: 'POST', body: { company: V.company(), op: 'node', node: { id: gid, type: 'human_decision', label: 'قرار: ' + ({ accept: 'قبول', challenge: 'إعادة جولة', reject: 'رفض', pending: 'تأجيل' }[decision]), detail: why, attrs: { decision, taskId: currentTaskId || '' } } } });
          if (currentTaskId) await V.api('/api/kosif/v38/evidence-graph', { method: 'POST', body: { company: V.company(), op: 'edge', edge: { from: currentTaskId, to: gid, kind: decision === 'reject' ? 'rejects' : 'approves' } } }).catch(() => {});
          V.$('#v38-cc-dec-out').innerHTML = '<div class="v38-note ok"><span>✅</span><span>وُثّق القرار البشري في رسم الأدلة (' + V.esc(gid) + ') مع أساسه — النظام لا يصدر رأيًا بدلًا عنك.</span></div>';
        } catch (e) { V.toast(e.status === 401 ? 'افتح قفل المالك لتوثيق القرار' : e.message, 'error'); }
      };
    }
  });
})();
