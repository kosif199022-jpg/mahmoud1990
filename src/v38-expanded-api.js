/*
 * KOSIF v38 — expansion API
 *
 * Adds a server-relayed OpenAI Realtime transport, a deterministic
 * financial-statement validation workbench, and a capability blueprint derived
 * from the approved KOSIF accounting/audit source pack.
 *
 * Privacy: the public repository stores structure, rules and synthetic fixtures
 * only. Client financial values remain request data and are not persisted here.
 */
import {
  DEFAULT_REALTIME_MODEL,
  createRealtimeCall,
  hangupRealtimeCall,
  realtimeConfigured
} from './v38-realtime.js';

const VOICES = ['marin', 'cedar', 'coral', 'alloy', 'ash', 'ballad', 'echo', 'sage', 'shimmer', 'verse'];
const MODELS = ['gpt-realtime', 'gpt-realtime-mini'];

export const ACCOUNTING_BLUEPRINT = Object.freeze({
  source: 'Unified Accounting & Audit Blueprint 1.0.0',
  targetSourceRepositories: 500,
  capabilityCounts: {
    coreAccounting: 21,
    accountsReceivable: 9,
    accountsPayable: 8,
    cashAndBank: 9,
    tax: 8,
    inventoryAssetsPayroll: 8,
    reporting: 12,
    auditAndAssurance: 27,
    automationAI: 9,
    governanceSecurity: 14
  },
  postingRules: [
    ['JRNL-001', 'balanced_entry', 'blocking'],
    ['JRNL-002', 'no_negative_debit_credit', 'blocking'],
    ['JRNL-003', 'single_side_per_line', 'blocking'],
    ['JRNL-004', 'posted_entries_immutable', 'blocking'],
    ['JRNL-005', 'period_lock', 'blocking'],
    ['JRNL-006', 'sequential_voucher_number', 'blocking'],
    ['JRNL-007', 'idempotent_source_posting', 'blocking'],
    ['JRNL-008', 'attachment_integrity', 'high']
  ].map(([id, name, severity]) => ({ id, name, severity })),
  auditAnalytics: {
    journalTests: [
      'weekend_or_holiday_postings', 'late_night_postings', 'manual_entries_to_revenue',
      'round_amount_entries', 'entries_just_below_approval_threshold',
      'new_or_rare_account_combinations', 'postings_by_privileged_users',
      'reversed_shortly_after_posting', 'duplicate_descriptions_or_amounts', 'period_end_spikes'
    ],
    dataTests: [
      'benford_first_digit', 'benford_second_digit', 'repeated_values', 'duplicate_invoice',
      'duplicate_payment', 'gap_sequence', 'three_way_match_exception',
      'bank_reconciliation_age', 'negative_inventory', 'unexpected_margin'
    ],
    sampling: [
      'simple_random', 'systematic', 'monetary_unit_sampling', 'stratified',
      'targeted_high_value', 'targeted_high_risk', 'bayesian_sampling'
    ]
  },
  workflows: ['sales_invoice', 'purchase_bill', 'bank_reconciliation', 'month_end_close', 'audit_engagement'],
  governance: {
    deterministicNumbers: true,
    humanApprovalForPosting: true,
    humanApprovalForAuditOpinion: true,
    immutablePostedEntries: true,
    periodLocks: true,
    evidenceHashing: true
  }
});

const REQUIRED_2025 = Object.freeze([
  'fp_ppe_net_2025', 'fp_projects_under_construction_2025', 'fp_cash_2025',
  'fp_prepaids_other_receivables_2025', 'fp_inventory_2025', 'fp_related_parties_receivable_2025',
  'fp_capital_2025', 'fp_statutory_reserve_2025', 'fp_retained_earnings_2025',
  'fp_related_parties_payable_2025', 'fp_end_service_provision_2025', 'fp_vacation_provision_2025',
  'fp_long_term_liabilities_2025', 'fp_accrued_other_payables_2025', 'fp_zakat_provision_2025',
  'is_revenue_2025', 'is_cost_of_revenue_2025', 'is_depreciation_2025',
  'is_admin_expenses_2025', 'is_profit_before_zakat_2025', 'is_zakat_expense_2025'
]);

export const FINANCIAL_TEMPLATE = Object.freeze({
  id: 'aghnam_alwadi_financials_2025_structure',
  name: 'هيكل القوائم المالية 2025',
  language: 'ar',
  direction: 'rtl',
  currency: 'SAR',
  periods: ['2025', '2024'],
  pageCount: 19,
  fieldCount: 440,
  inputFieldCount: 352,
  calculatedFieldCount: 88,
  activeCalculationCount: 89,
  calculationIssueCount: 0,
  privacy: 'structure-only-no-client-values',
  requiredInputs2025: REQUIRED_2025,
  sections: [
    ['report_info', 'بيانات التقرير والمنشأة', 4],
    ['financial_position', 'قائمة المركز المالي', 46],
    ['income_statement', 'قائمة الدخل والدخل الشامل الآخر', 18],
    ['equity_changes', 'قائمة التغير في حقوق الملكية', 36],
    ['cash_flows', 'قائمة التدفقات النقدية', 44],
    ['note_ppe', 'إيضاح 4 - الممتلكات والآلات والمعدات', 70],
    ['note_cash_receivables', 'إيضاحا 5 و6 - النقد والأرصدة المدينة', 16],
    ['note_related_parties', 'إيضاح 7 - الأطراف ذات العلاقة', 18],
    ['note_capital', 'إيضاح 8 - رأس المال والمساهمون', 30],
    ['note_provisions_payables', 'إيضاحات 9 إلى 12 - المخصصات والالتزامات', 32],
    ['note_zakat', 'إيضاح 14 - الزكاة الشرعية', 40],
    ['note_revenue_costs', 'إيضاحات 15 إلى 17أ - الإيرادات وتكلفة الإيرادات', 46],
    ['note_admin_expenses', 'إيضاح 17 - المصروفات العمومية والإدارية', 40]
  ].map(([id, title, fields]) => ({ id, title, fields }))
});

const FORMULAS = Object.freeze([
  ['fp_total_noncurrent_assets_2025', ['fp_ppe_net_2025', 'fp_projects_under_construction_2025']],
  ['fp_total_current_assets_2025', ['fp_cash_2025', 'fp_prepaids_other_receivables_2025', 'fp_inventory_2025', 'fp_related_parties_receivable_2025']],
  ['fp_total_assets_2025', ['fp_total_noncurrent_assets_2025', 'fp_total_current_assets_2025']],
  ['fp_total_equity_2025', ['fp_capital_2025', 'fp_statutory_reserve_2025', 'fp_retained_earnings_2025']],
  ['fp_total_noncurrent_liabilities_2025', ['fp_related_parties_payable_2025', 'fp_end_service_provision_2025', 'fp_vacation_provision_2025', 'fp_long_term_liabilities_2025']],
  ['fp_total_current_liabilities_2025', ['fp_accrued_other_payables_2025', 'fp_zakat_provision_2025']],
  ['fp_total_liabilities_2025', ['fp_total_noncurrent_liabilities_2025', 'fp_total_current_liabilities_2025']],
  ['fp_total_equity_liabilities_2025', ['fp_total_equity_2025', 'fp_total_liabilities_2025']],
  ['is_gross_income_2025', ['is_revenue_2025', 'is_cost_of_revenue_2025']],
  ['is_operating_income_2025', ['is_gross_income_2025', 'is_depreciation_2025', 'is_admin_expenses_2025']],
  ['is_comprehensive_income_2025', ['is_profit_before_zakat_2025', 'is_zakat_expense_2025']]
]);

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-kosif-v38-expansion': 'true'
    }
  });
}

function err(code, message, status = 400, extra = {}) {
  return json({ error: code, message: message || code, ...extra }, status);
}

async function readBody(req) {
  try { return await req.clone().json(); } catch { return null; }
}

function companyId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9._:-]{1,80}$/.test(id) ? id : '';
}

function toMinor(value) {
  if (value === null || value === undefined || value === '') throw new Error('MISSING_MONEY');
  if (typeof value === 'bigint') return value;
  const raw = String(value).trim()
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const parenNegative = /^\(.*\)$/.test(raw);
  const normalized = raw.replace(/[٬,\s]/g, '').replace('٫', '.').replace(/[()]/g, '');
  const explicitNegative = normalized.startsWith('-');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('INVALID_MONEY');
  const unsigned = normalized.replace('-', '');
  const [whole, frac = ''] = unsigned.split('.');
  const minor = BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
  return parenNegative || explicitNegative ? -minor : minor;
}

function fromMinor(value) {
  const neg = value < 0n;
  const s = (neg ? -value : value).toString().padStart(3, '0');
  const out = s.slice(0, -2) + '.' + s.slice(-2);
  return (neg ? '-' : '') + out;
}

function deterministicFinancialValidation(input = {}) {
  const values = input.fields || input.values || {};
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return { ok: false, complete: false, errors: [{ error: 'FIELDS_OBJECT_REQUIRED' }], checks: [], derived: {} };
  }
  const entries = Object.entries(values).slice(0, 250);
  const minor = {};
  const errors = [];
  for (const [k, v] of entries) {
    if (v === '' || v === null || v === undefined) continue;
    try { minor[k] = toMinor(v); }
    catch { errors.push({ field: k, error: 'INVALID_MONEY' }); }
  }
  if (errors.length) return { ok: false, complete: false, errors, checks: [], derived: {} };

  const missingRequired = REQUIRED_2025.filter(k => !Object.prototype.hasOwnProperty.call(minor, k));
  const checks = [];
  const derived = {};

  for (const [target, deps] of FORMULAS) {
    const missing = deps.filter(key => !Object.prototype.hasOwnProperty.call(minor, key));
    if (missing.length) {
      checks.push({ id: 'FORMULA:' + target, target, status: 'incomplete', missing, dependencies: deps });
      continue;
    }
    const expected = deps.reduce((sum, key) => sum + minor[key], 0n);
    const provided = Object.prototype.hasOwnProperty.call(minor, target) ? minor[target] : null;
    minor[target] = expected;
    derived[target] = fromMinor(expected);
    checks.push({
      id: 'FORMULA:' + target,
      target,
      status: provided === null || provided === expected ? 'pass' : 'fail',
      expected: fromMinor(expected),
      provided: provided === null ? null : fromMinor(provided),
      difference: provided === null ? '0.00' : fromMinor(provided - expected),
      dependencies: deps
    });
  }

  if (Object.prototype.hasOwnProperty.call(minor, 'fp_total_assets_2025') && Object.prototype.hasOwnProperty.call(minor, 'fp_total_equity_liabilities_2025')) {
    const difference = minor.fp_total_assets_2025 - minor.fp_total_equity_liabilities_2025;
    checks.push({
      id: 'FS-EQUATION-2025',
      target: 'fp_total_assets_2025 = fp_total_equity_liabilities_2025',
      status: difference === 0n ? 'pass' : 'fail',
      difference: fromMinor(difference),
      severity: 'blocking'
    });
  } else {
    checks.push({ id: 'FS-EQUATION-2025', target: 'fp_total_assets_2025 = fp_total_equity_liabilities_2025', status: 'incomplete', severity: 'blocking' });
  }

  if (Object.prototype.hasOwnProperty.call(minor, 'cf_cash_ending_2025') && Object.prototype.hasOwnProperty.call(minor, 'fp_cash_2025')) {
    const difference = minor.cf_cash_ending_2025 - minor.fp_cash_2025;
    checks.push({
      id: 'FS-CASH-BRIDGE-2025',
      target: 'cf_cash_ending_2025 = fp_cash_2025',
      status: difference === 0n ? 'pass' : 'fail',
      difference: fromMinor(difference),
      severity: 'high'
    });
  }

  const failed = checks.filter(x => x.status === 'fail');
  const incomplete = checks.filter(x => x.status === 'incomplete');
  const complete = missingRequired.length === 0 && incomplete.length === 0;
  return {
    ok: failed.length === 0 && complete,
    complete,
    deterministic: true,
    currency: 'SAR',
    precision: 2,
    checks,
    failedCount: failed.length,
    incompleteCount: incomplete.length,
    missingRequired,
    derived,
    humanReviewRequired: failed.length > 0 || !complete,
    note: 'التحقق حتمي ولا يوقّع قوائم مالية ولا يعتمد رأيًا مهنيًا.'
  };
}

async function buildAdvisorContext(env, id) {
  const graphKey = `kosif:v38:co:${id}:graph`;
  let graph = null;
  try { graph = await env?.DATA?.get(graphKey, 'json'); } catch {}
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];

  const prefix = `kosif:v38:co:${id}:notes:`;
  const notes = [];
  try {
    const listed = await env?.DATA?.list({ prefix, limit: 100 });
    for (const item of listed?.keys || []) {
      const note = await env.DATA.get(item.name, 'json');
      if (note) notes.push(note);
    }
  } catch {}

  notes.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
  return {
    company: id,
    evidenceGraph: {
      nodes: nodes.length,
      edges: edges.length,
      evidenceNodes: nodes.filter(x => x?.type === 'evidence').length,
      findingNodes: nodes.filter(x => x?.type === 'finding').length,
      riskNodes: nodes.filter(x => x?.type === 'risk').length
    },
    reviewerNotes: {
      total: notes.length,
      open: notes.filter(x => String(x?.status || 'open') !== 'resolved').length,
      recent: notes.slice(0, 5).map(x => ({ id: x.id, type: x.type, ref: x.ref, status: x.status, text: String(x.text || '').slice(0, 240) }))
    },
    governance: ACCOUNTING_BLUEPRINT.governance
  };
}

export async function handleV38Expansion(req, env, u, owner) {
  const p = u.pathname;

  if (p === '/api/kosif/v38/blueprint' && req.method === 'GET') {
    return json({ ok: true, blueprint: ACCOUNTING_BLUEPRINT });
  }

  if (p === '/api/kosif/v38/financials/template' && req.method === 'GET') {
    return json({ ok: true, template: FINANCIAL_TEMPLATE });
  }

  if (p === '/api/kosif/v38/financials/validate' && req.method === 'POST') {
    const b = await readBody(req);
    if (!b) return err('FINANCIALS_BAD_JSON', 'تعذر قراءة بيانات القوائم المالية.');
    const result = deterministicFinancialValidation(b);
    return json(result, result.ok ? 200 : 422);
  }

  if (p === '/api/kosif/v38/realtime/session' && req.method === 'POST') {
    return err('REALTIME_ROUTE_RETIRED', 'تم إيقاف مسار المفتاح داخل المتصفح. استخدم الاتصال الآمن عبر الخادم.', 410);
  }

  if (p === '/api/kosif/v38/realtime/config' && req.method === 'GET') {
    if (!owner) return err('OWNER_AUTH_REQUIRED', 'المراجع الصوتي يتطلب جلسة المالك.', 401);
    return json({
      ok: true,
      configured: realtimeConfigured(env),
      defaultModel: DEFAULT_REALTIME_MODEL,
      models: MODELS,
      voices: VOICES,
      keyExposure: 'none',
      transport: 'webrtc-server-relay',
      advisoryOnly: true
    });
  }

  if (p === '/api/kosif/v38/advisor/context' && req.method === 'GET') {
    if (!owner) return err('OWNER_AUTH_REQUIRED', 'سياق المراجع محمي بجلسة المالك.', 401);
    const id = companyId(u.searchParams.get('company'));
    if (!id) return err('COMPANY_ID_REQUIRED', 'حدد معرف الشركة.');
    return json({ ok: true, context: await buildAdvisorContext(env, id) });
  }

  if (p === '/api/kosif/v38/realtime/call' && req.method === 'POST') {
    if (!owner) return err('OWNER_AUTH_REQUIRED', 'بدء جلسة Realtime يتطلب جلسة المالك.', 401);
    const b = await readBody(req);
    if (!b) return err('REALTIME_BAD_JSON', 'تعذر قراءة طلب الجلسة.');
    const id = companyId(b.company) || 'default';
    const context = await buildAdvisorContext(env, id);
    const clientContext = String(b.context || '').slice(0, 900);
    const contextText = JSON.stringify({ ...context, clientContext });
    const r = await createRealtimeCall(env, {
      sdp: b.sdp,
      model: b.model,
      voice: b.voice,
      language: b.language || 'ar',
      company: id,
      context: contextText
    });
    return r.ok
      ? json({ ok: true, ...r, advisoryOnly: true })
      : err(r.error, r.message, r.error === 'REALTIME_NOT_CONFIGURED' ? 503 : 502, { upstreamStatus: r.upstreamStatus });
  }

  if (p === '/api/kosif/v38/realtime/hangup' && req.method === 'POST') {
    if (!owner) return err('OWNER_AUTH_REQUIRED', 'إنهاء جلسة Realtime يتطلب جلسة المالك.', 401);
    const b = await readBody(req);
    if (!b?.callId) return err('REALTIME_CALL_ID_REQUIRED', 'معرف جلسة Realtime مطلوب.');
    const r = await hangupRealtimeCall(env, b.callId);
    return r.ok ? json({ ok: true, ...r }) : err(r.error, r.message, r.error === 'REALTIME_NOT_CONFIGURED' ? 503 : 502, { upstreamStatus: r.upstreamStatus });
  }

  return null;
}

export const _test = { deterministicFinancialValidation, toMinor, fromMinor, buildAdvisorContext };
