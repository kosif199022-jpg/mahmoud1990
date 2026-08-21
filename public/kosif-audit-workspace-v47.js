/* KOSIF v47 — Audit Workspace Lifecycle UI
 * Progressive enhancement only. It reads existing engagement state/DOM and never mutates
 * accounting balances, findings, adjustments, model outputs or human decisions.
 */
(() => {
  'use strict';
  if (window.__KOSIF_AUDIT_WORKSPACE_V47__) return;
  window.__KOSIF_AUDIT_WORKSPACE_V47__ = true;

  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const text = value => String(value ?? '').trim();
  const arr = value => Array.isArray(value) ? value : [];
  let timer = 0;

  const STAGES = [
    { id:'setup', view:'settings', label:'المنشأة والارتباط' },
    { id:'data', view:'tb', label:'البيانات وصحتها' },
    { id:'risk', view:'analytics', label:'المخاطر والتخطيط' },
    { id:'pbc', view:'pbc', label:'الطلبات والأدلة' },
    { id:'testing', view:'rounds', label:'إجراءات المراجعة' },
    { id:'findings', view:'rounds', label:'النتائج والاستنتاجات' },
    { id:'adjustments', view:'outputs', label:'التسويات والمراجعة' },
    { id:'reporting', view:'outputs', label:'الإكمال والتقرير' }
  ];

  function stateRef() {
    try { return typeof state !== 'undefined' && state && typeof state === 'object' ? state : {}; }
    catch (_) { return {}; }
  }
  function firstArray(s, keys) {
    for (const key of keys) if (Array.isArray(s?.[key])) return s[key];
    return [];
  }
  function isDone(value) { return /done|complete|completed|closed|received|verified|approved|rejected|posted|تم|مكتمل|مستلم/i.test(text(value)); }
  function model() {
    const s = stateRef();
    const entity = s.entity && typeof s.entity === 'object' ? s.entity : {};
    const accounts = firstArray(s,['tb','accounts','trialBalance','rows']);
    const risks = firstArray(s,['risks','riskRegister','riskItems']);
    const rounds = firstArray(s,['rounds','auditRounds']);
    const requests = firstArray(s,['pbc','requests','documentsRequired']);
    const evidence = firstArray(s,['evidence','documents','auditEvidence']);
    const findings = firstArray(s,['findings','issues','auditFindings']);
    const adjustments = firstArray(s,['adjustments','ajes','adjustingEntries']);
    const opinions = firstArray(s,['aiOpinions','councilOpinions','modelOpinions']);
    const decisions = firstArray(s,['humanDecisions','reviewDecisions','approvals']);

    const company = text(entity.name || s.companyName || $('#s-name')?.value || $('#pill-entity')?.textContent).replace(/\s+/g,' ');
    const hasEntity = Boolean(company && !/اختر|غير محدد|لم تُحد/i.test(company));
    const hasPeriod = Boolean(text(entity.period || entity.fiscalYear || s.period || s.fiscalYear || $('#s-period')?.value));
    const hasFramework = Boolean(text(entity.framework || s.framework || s.accountingFramework || $('#s-framework')?.value));
    const domAccounts = Number(text($('#kpi-accounts')?.textContent).replace(/[^0-9]/g,'')) || 0;
    const hasData = accounts.length > 0 || domAccounts > 0;
    const tbBalanced = s.tbBalanced !== false && s.trialBalanceBalanced !== false;
    const hasRisk = risks.length > 0 || s.riskAssessmentCompleted === true || Boolean($('#view-analytics .risk,#view-analytics [data-risk]'));
    const pendingPbc = requests.filter(item => !isDone(item?.status || item?.state || item?.fulfillmentStatus)).length;
    const hasEvidence = evidence.length > 0 || requests.some(item => isDone(item?.status || item?.state || item?.fulfillmentStatus));
    const hasTesting = rounds.length > 0 || s.testingCompleted === true || $$('#view-rounds .round').length > 0;
    const hasFindingsReview = findings.length > 0 || s.findingsReviewed === true || s.noFindingsConclusion === true;
    const unresolvedAdjustments = adjustments.filter(item => !isDone(item?.status || item?.state)).length;
    const hasAdjustmentsReview = adjustments.length === 0 ? s.noAdjustmentsConclusion === true : unresolvedAdjustments === 0;
    const humanConclusion = s.humanApproval === true || s.partnerApproval === true || decisions.length > 0;
    const ungovernedAi = opinions.filter(opinion => !opinion?.humanApproved && !text(opinion?.humanDecisionId) && !decisions.some(d => text(d?.opinionId) === text(opinion?.id))).length;
    const hasReport = Boolean(s.report || s.finalReport || s.opinion || s.reportDraft || $('#view-outputs .report'));

    const statuses = {
      setup: hasEntity && hasPeriod && hasFramework ? 'complete' : hasEntity ? 'in_progress' : 'blocked',
      data: !hasEntity ? 'blocked' : hasData && tbBalanced ? 'complete' : hasData ? 'in_progress' : 'blocked',
      risk: !hasData ? 'blocked' : hasRisk ? 'complete' : 'in_progress',
      pbc: !hasRisk ? 'blocked' : (hasEvidence && pendingPbc === 0 ? 'complete' : 'in_progress'),
      testing: !hasData ? 'blocked' : hasTesting ? 'complete' : 'in_progress',
      findings: !hasTesting ? 'blocked' : hasFindingsReview ? 'complete' : 'in_progress',
      adjustments: !hasFindingsReview ? 'blocked' : hasAdjustmentsReview ? 'complete' : 'in_progress',
      reporting: !hasFindingsReview || ungovernedAi || !humanConclusion ? 'blocked' : hasReport ? 'complete' : 'in_progress'
    };

    const blockers = [];
    if (!hasEntity) blockers.push('حدد المنشأة قبل بدء أعمال المراجعة.');
    if (hasData && !tbBalanced) blockers.push('ميزان المراجعة غير متوازن؛ لا يجوز تجاوزه إلى الاستنتاج.');
    if (ungovernedAi) blockers.push(`يوجد ${ungovernedAi} رأي ذكاء اصطناعي يحتاج قرار مراجع بشري.`);
    if (hasReport && pendingPbc) blockers.push(`يوجد ${pendingPbc} طلب مستندات مفتوح عند مرحلة التقرير.`);

    const completed = Object.values(statuses).filter(v => v === 'complete').length;
    const current = STAGES.find(stage => statuses[stage.id] === 'in_progress') || STAGES.find(stage => statuses[stage.id] === 'blocked') || STAGES[STAGES.length - 1];
    return { statuses, completion: Math.round((completed / STAGES.length) * 100), current, blockers, pendingPbc, ungovernedAi };
  }

  function go(view) {
    try {
      if (typeof window.go === 'function') { window.go(view); return; }
      const direct = $(`[data-kgo="${CSS.escape(view)}"]`);
      if (direct) { direct.click(); return; }
      const section = $(`#view-${CSS.escape(view)}`);
      section?.scrollIntoView({block:'start',behavior:'smooth'});
    } catch (_) {}
  }

  function statusLabel(status) {
    if (status === 'complete') return 'مكتمل';
    if (status === 'in_progress') return 'قيد العمل';
    return 'يتطلب إجراء';
  }

  function mount() {
    const overview = $('#view-overview');
    if (!overview) return;
    const data = model();
    let shell = $('#kw47-audit-lifecycle');
    if (!shell) {
      shell = document.createElement('section');
      shell.id = 'kw47-audit-lifecycle';
      shell.setAttribute('aria-label','مسار الارتباط المهني');
      const command = $('#kw42-command-center');
      if (command?.parentNode === overview) command.insertAdjacentElement('afterend',shell);
      else overview.prepend(shell);
    }

    const blockers = data.blockers.slice(0,3).map((item,i) => `<div class="kw47-blocker"><strong>${i + 1}.</strong><span>${escapeHtml(item)}</span></div>`).join('');
    shell.innerHTML = `
      <div class="kw47-head">
        <div>
          <h2>مسار الارتباط المهني</h2>
          <p>من البيانات إلى التقرير: الأرقام حتمية، الذكاء الاصطناعي استشاري، والاعتماد النهائي للمراجع البشري.</p>
        </div>
        <div class="kw47-progress" aria-label="نسبة تقدم المسار"><b>${data.completion}%</b><span>اكتمال المسار</span></div>
      </div>
      <div class="kw47-stage-grid" role="list">
        ${STAGES.map((stage,index) => `<button type="button" class="kw47-stage" role="listitem" data-kw47-view="${stage.view}" data-status="${data.statuses[stage.id]}" aria-label="${escapeHtml(stage.label)} — ${statusLabel(data.statuses[stage.id])}"><b>${index + 1} · ${escapeHtml(stage.label)}</b><span>${statusLabel(data.statuses[stage.id])}</span></button>`).join('')}
      </div>
      <div class="kw47-governance">
        <div class="kw47-guardrails" aria-label="ضوابط المراجعة">
          <span>الحسابات: محرك حتمي</span><span>AI: تحليل واقتراح</span><span>المعيار: مرجع موثق</span><span>القرار: مراجع بشري</span>
        </div>
        <button type="button" class="kw47-next" data-kw47-view="${data.current.view}">التالي: ${escapeHtml(data.current.label)}</button>
      </div>
      ${blockers ? `<div class="kw47-blockers" aria-label="عناصر تتطلب معالجة">${blockers}</div>` : ''}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-kw47-view]');
    if (!button) return;
    event.preventDefault();
    go(button.dataset.kw47View);
  });

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(mount,80);
  };
  window.addEventListener('kosif-view-change',schedule);
  document.addEventListener('change',schedule,true);
  document.addEventListener('input',schedule,true);
  document.addEventListener('click',event => {
    if (event.target.closest?.('#btn-save-entity,#btn-import,#btn-start-round,#btn-next-round,#btn-gen-report,#kosif-company-list [data-cid]')) setTimeout(mount,180);
  },true);

  function boot() {
    mount();
    const overview = $('#view-overview');
    if (overview && 'MutationObserver' in window) new MutationObserver(schedule).observe(overview,{childList:true,subtree:true});
  }
  if (document.readyState === 'complete') setTimeout(boot,0);
  else window.addEventListener('load',() => setTimeout(boot,0),{once:true});
})();
