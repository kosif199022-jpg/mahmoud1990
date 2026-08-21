/*
 * KOSIF v47 — Deterministic Audit Lifecycle
 *
 * This module turns the engagement into an explicit professional workflow without
 * delegating accounting conclusions or approval authority to an LLM. It is a pure
 * deterministic state evaluator: same state in -> same lifecycle/status out.
 */

export const AUDIT_LIFECYCLE_V47 = Object.freeze([
  { id: 'setup', view: 'settings', label: 'المنشأة والارتباط', weight: 8 },
  { id: 'data', view: 'tb', label: 'البيانات وصحتها', weight: 16 },
  { id: 'risk', view: 'analytics', label: 'المخاطر والتخطيط', weight: 14 },
  { id: 'pbc', view: 'pbc', label: 'الطلبات والأدلة', weight: 14 },
  { id: 'testing', view: 'rounds', label: 'إجراءات المراجعة', weight: 16 },
  { id: 'findings', view: 'rounds', label: 'النتائج والاستنتاجات', weight: 12 },
  { id: 'adjustments', view: 'outputs', label: 'التسويات والمراجعة', weight: 10 },
  { id: 'reporting', view: 'outputs', label: 'الإكمال والتقرير', weight: 10 }
]);

const FINAL_ADJUSTMENT_STATES = new Set(['approved', 'rejected', 'posted', 'accepted_by_client', 'not_required']);
const CLOSED_REQUEST_STATES = new Set(['done', 'complete', 'completed', 'closed', 'received', 'verified', 'verified_valid', 'تم', 'مكتمل', 'مستلم']);
const HUMAN_DECISION_STATES = new Set(['approved', 'rejected', 'reviewed', 'accepted', 'overridden']);

function arr(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? '').trim(); }
function lower(value) { return text(value).toLowerCase(); }
function bool(value) { return value === true || value === 1 || lower(value) === 'true'; }
function firstArray(state, keys) {
  for (const key of keys) if (Array.isArray(state?.[key])) return state[key];
  return [];
}
function hasValue(value) { return text(value).length > 0; }
function isClosedRequest(item) { return CLOSED_REQUEST_STATES.has(lower(item?.status || item?.state || item?.fulfillmentStatus)); }
function isFinalAdjustment(item) { return FINAL_ADJUSTMENT_STATES.has(lower(item?.status || item?.state)); }
function isHumanDecision(item) {
  return item?.source === 'human' || item?.actorType === 'human' || HUMAN_DECISION_STATES.has(lower(item?.status || item?.decision));
}
function materialAmount(item) {
  const n = Number(item?.amount ?? item?.misstatementAmount ?? item?.value ?? 0);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

export function inspectAuditState(input = {}) {
  const state = input && typeof input === 'object' ? input : {};
  const entity = state.entity && typeof state.entity === 'object' ? state.entity : {};
  const accounts = firstArray(state, ['tb', 'accounts', 'trialBalance', 'rows']);
  const rounds = firstArray(state, ['rounds', 'auditRounds']);
  const requests = firstArray(state, ['pbc', 'requests', 'documentsRequired']);
  const risks = firstArray(state, ['risks', 'riskRegister', 'riskItems']);
  const findings = firstArray(state, ['findings', 'issues', 'auditFindings']);
  const evidence = firstArray(state, ['evidence', 'documents', 'auditEvidence']);
  const adjustments = firstArray(state, ['adjustments', 'ajes', 'adjustingEntries']);
  const decisions = firstArray(state, ['humanDecisions', 'reviewDecisions', 'approvals']);
  const aiOpinions = firstArray(state, ['aiOpinions', 'councilOpinions', 'modelOpinions']);
  const materiality = Number(state.materiality?.overall ?? state.materiality?.overallMateriality ?? state.overallMateriality ?? 0);
  const pendingRequests = requests.filter(item => !isClosedRequest(item));
  const unresolvedAdjustments = adjustments.filter(item => !isFinalAdjustment(item));
  const governedAi = aiOpinions.filter(item => bool(item?.humanApproved) || hasValue(item?.humanDecisionId) || decisions.some(d => text(d?.opinionId) === text(item?.id) && isHumanDecision(d)));
  const materialUnresolvedAdjustments = unresolvedAdjustments.filter(item => materiality > 0 && materialAmount(item) >= materiality);

  return Object.freeze({
    state,
    entity,
    accounts,
    rounds,
    requests,
    risks,
    findings,
    evidence,
    adjustments,
    decisions,
    aiOpinions,
    materiality,
    pendingRequests,
    unresolvedAdjustments,
    materialUnresolvedAdjustments,
    ungovernedAiOpinions: aiOpinions.filter(item => !governedAi.includes(item)),
    hasEntity: hasValue(entity.name || state.companyName || state.clientName),
    hasPeriod: hasValue(entity.period || entity.fiscalYear || state.period || state.fiscalYear),
    hasFramework: hasValue(entity.framework || state.framework || state.accountingFramework),
    hasData: accounts.length > 0,
    tbBalanced: state.tbBalanced !== false && state.trialBalanceBalanced !== false,
    hasRiskWork: risks.length > 0 || bool(state.riskAssessmentCompleted),
    hasEvidence: evidence.length > 0 || requests.some(isClosedRequest),
    hasTesting: rounds.length > 0 || bool(state.testingCompleted),
    hasFindingsReview: findings.length > 0 || bool(state.findingsReviewed) || bool(state.noFindingsConclusion),
    hasAdjustmentsReview: adjustments.length === 0 ? bool(state.noAdjustmentsConclusion) : unresolvedAdjustments.length === 0,
    hasHumanConclusion: decisions.some(isHumanDecision) || bool(state.humanApproval) || bool(state.partnerApproval),
    hasReport: Boolean(state.report || state.finalReport || state.opinion || state.reportDraft)
  });
}

function stageStatus(id, s) {
  switch (id) {
    case 'setup':
      return s.hasEntity && s.hasPeriod && s.hasFramework ? 'complete' : s.hasEntity ? 'in_progress' : 'blocked';
    case 'data':
      if (!s.hasEntity) return 'blocked';
      return s.hasData && s.tbBalanced ? 'complete' : s.hasData ? 'in_progress' : 'blocked';
    case 'risk':
      if (!s.hasData) return 'blocked';
      return s.hasRiskWork ? 'complete' : 'in_progress';
    case 'pbc':
      if (!s.hasRiskWork) return 'blocked';
      if (!s.requests.length && !s.hasEvidence) return 'in_progress';
      return s.pendingRequests.length === 0 && s.hasEvidence ? 'complete' : 'in_progress';
    case 'testing':
      if (!s.hasData) return 'blocked';
      return s.hasTesting ? 'complete' : 'in_progress';
    case 'findings':
      if (!s.hasTesting) return 'blocked';
      return s.hasFindingsReview ? 'complete' : 'in_progress';
    case 'adjustments':
      if (!s.hasFindingsReview) return 'blocked';
      return s.hasAdjustmentsReview ? 'complete' : 'in_progress';
    case 'reporting':
      if (!s.hasFindingsReview) return 'blocked';
      if (s.ungovernedAiOpinions.length || s.materialUnresolvedAdjustments.length || !s.hasHumanConclusion) return 'blocked';
      return s.hasReport ? 'complete' : 'in_progress';
    default:
      return 'blocked';
  }
}

function blockersFor(s) {
  const blockers = [];
  if (!s.hasEntity) blockers.push({ code: 'ENTITY_REQUIRED', severity: 'high', message: 'يجب تحديد المنشأة قبل بدء أعمال المراجعة.' });
  if (s.hasData && !s.tbBalanced) blockers.push({ code: 'TB_OUT_OF_BALANCE', severity: 'critical', message: 'ميزان المراجعة غير متوازن ولا يجوز تجاوزه إلى الاستنتاج.' });
  if (s.ungovernedAiOpinions.length) blockers.push({ code: 'AI_HUMAN_REVIEW_REQUIRED', severity: 'high', count: s.ungovernedAiOpinions.length, message: 'توجد آراء ذكاء اصطناعي لم تعتمد أو ترفض بواسطة مراجع بشري.' });
  if (s.materialUnresolvedAdjustments.length) blockers.push({ code: 'MATERIAL_AJE_UNRESOLVED', severity: 'critical', count: s.materialUnresolvedAdjustments.length, message: 'توجد تسويات غير محسومة تساوي أو تتجاوز الأهمية النسبية المحددة للارتباط.' });
  if (s.pendingRequests.length && s.hasReport) blockers.push({ code: 'PBC_OPEN_AT_REPORTING', severity: 'medium', count: s.pendingRequests.length, message: 'توجد طلبات مستندات مفتوحة عند مرحلة التقرير.' });
  return blockers;
}

export function evaluateAuditLifecycle(input = {}) {
  const s = inspectAuditState(input);
  const stages = AUDIT_LIFECYCLE_V47.map(stage => ({ ...stage, status: stageStatus(stage.id, s) }));
  const completedWeight = stages.reduce((sum, stage) => sum + (stage.status === 'complete' ? stage.weight : 0), 0);
  const inProgress = stages.find(stage => stage.status === 'in_progress');
  const blocked = stages.find(stage => stage.status === 'blocked');
  const current = inProgress || blocked || stages[stages.length - 1];
  const blockers = blockersFor(s);
  const reportingReady = stages.find(stage => stage.id === 'reporting')?.status !== 'blocked' && blockers.filter(b => ['critical', 'high'].includes(b.severity)).length === 0;

  return Object.freeze({
    version: '47.0.0',
    deterministic: true,
    stages,
    completionPercent: Math.max(0, Math.min(100, completedWeight)),
    currentStage: current,
    recommendedAction: { view: current.view, stageId: current.id, label: current.label },
    blockers,
    reportingReady,
    governance: {
      aiIsAdvisory: true,
      humanApprovalRequired: true,
      accountingMathMustRemainDeterministic: true
    },
    counts: {
      accounts: s.accounts.length,
      risks: s.risks.length,
      requests: s.requests.length,
      pendingRequests: s.pendingRequests.length,
      evidence: s.evidence.length,
      findings: s.findings.length,
      adjustments: s.adjustments.length,
      unresolvedAdjustments: s.unresolvedAdjustments.length,
      aiOpinions: s.aiOpinions.length,
      ungovernedAiOpinions: s.ungovernedAiOpinions.length
    }
  });
}

export function validateFindingChain(finding = {}) {
  const source = lower(finding.source || 'human');
  const links = finding.links && typeof finding.links === 'object' ? finding.links : {};
  const missing = [];
  const required = [
    ['accountId', links.accountId],
    ['assertion', links.assertion],
    ['riskId', links.riskId],
    ['procedureId', links.procedureId],
    ['evidenceIds', arr(links.evidenceIds).length ? links.evidenceIds : null],
    ['standardRefs', arr(links.standardRefs).length ? links.standardRefs : null]
  ];
  for (const [key, value] of required) if (!value || (typeof value === 'string' && !hasValue(value))) missing.push(key);
  const misstatement = Number(finding.misstatementAmount ?? 0);
  if (!Number.isFinite(misstatement)) missing.push('misstatementAmount');
  if (source === 'ai' && !hasValue(finding.humanDecisionId) && !HUMAN_DECISION_STATES.has(lower(finding.humanDecision))) missing.push('humanDecision');

  return Object.freeze({
    ok: missing.length === 0,
    missing,
    source,
    canAffectFinalOpinion: missing.length === 0 && (source !== 'ai' || hasValue(finding.humanDecisionId) || HUMAN_DECISION_STATES.has(lower(finding.humanDecision)))
  });
}
