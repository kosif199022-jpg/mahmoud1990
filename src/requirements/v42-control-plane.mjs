/*
 * KOSIF v42 — Requirements Control Plane
 * Cross-cutting governance primitives used to enforce the 50,000-note master baseline.
 * This layer does NOT replace deterministic accounting engines or professional judgement.
 */
export const KOSIF_REQUIREMENTS_VERSION = '42.0.0';
export const KOSIF_REQUIREMENTS_BUILD = '2026.08.20-v42-50000-control-plane';

const DEFAULT_PRIORITY = Object.freeze([
  'numeric_correctness',
  'security_privacy',
  'professional_compliance',
  'source_authority',
  'data_integrity',
  'accessibility_mobile',
  'capability_preservation',
  'visual_consistency',
  'performance'
]);

const DEFAULT_SEVERITIES = Object.freeze(['info', 'warning', 'high', 'critical']);

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

async function sha256(text) {
  const data = new TextEncoder().encode(String(text));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function nowIso(clock) {
  const n = clock?.();
  return n instanceof Date ? n.toISOString() : new Date(n ?? Date.now()).toISOString();
}

function percentile(sorted, q) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1));
  return sorted[idx];
}

export class KosifControlError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'KosifControlError';
    this.code = code;
    this.meta = Object.freeze({ ...meta });
  }
}

export function resultEnvelope({
  ok,
  code = ok ? 'OK' : 'FAILED',
  data = null,
  errors = [],
  warnings = [],
  explain = null,
  sources = [],
  evidence = [],
  correlationId = null,
  version = KOSIF_REQUIREMENTS_VERSION
} = {}) {
  return Object.freeze({
    ok: Boolean(ok),
    code: String(code),
    data,
    errors: Object.freeze(errors.map(x => Object.freeze({ ...x }))),
    warnings: Object.freeze(warnings.map(x => Object.freeze({ ...x }))),
    explain,
    sources: Object.freeze(sources.map(x => Object.freeze({ ...x }))),
    evidence: Object.freeze(evidence.map(x => Object.freeze({ ...x }))),
    correlationId,
    version
  });
}

export function validateSchema(payload, schema = {}) {
  const errors = [];
  const input = payload && typeof payload === 'object' ? payload : {};
  for (const key of schema.required || []) {
    const v = input[key];
    if (v === undefined || v === null || v === '') {
      errors.push({ code: 'FIELD_REQUIRED', field: key, message: `الحقل ${key} مطلوب` });
    }
  }
  for (const [key, rule] of Object.entries(schema.properties || {})) {
    const value = input[key];
    if (value == null) continue;
    if (rule.type === 'array' && !Array.isArray(value)) errors.push({ code: 'FIELD_TYPE', field: key, expected: 'array' });
    else if (rule.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) errors.push({ code: 'FIELD_TYPE', field: key, expected: 'object' });
    else if (rule.type && !['array', 'object'].includes(rule.type) && typeof value !== rule.type) errors.push({ code: 'FIELD_TYPE', field: key, expected: rule.type });
    if (rule.enum && !rule.enum.includes(value)) errors.push({ code: 'FIELD_ENUM', field: key, allowed: [...rule.enum] });
    if (typeof value === 'string' && Number.isInteger(rule.maxLength) && value.length > rule.maxLength) errors.push({ code: 'FIELD_TOO_LONG', field: key, maxLength: rule.maxLength });
  }
  return { ok: errors.length === 0, errors };
}

export class RequirementsControlPlane {
  constructor(options = {}) {
    this.buildId = String(options.buildId || KOSIF_REQUIREMENTS_BUILD);
    this.gitSha = String(options.gitSha || 'unknown');
    this.clock = options.clock || (() => new Date());
    this.priority = Object.freeze([...(options.priority || DEFAULT_PRIORITY)]);
    this.severities = Object.freeze([...(options.severities || DEFAULT_SEVERITIES)]);
    this.permissions = new Map();
    this.featureFlags = new Map();
    this.rollback = new Map();
    this.audit = [];
    this.idempotency = new Map();
    this.metrics = new Map();
    this.entityVersions = new Map();
    this.events = [];
    this.alerts = [];
    this.retention = new Map();
    this.offlinePolicy = new Map();
    this.maxAudit = Math.max(100, Number(options.maxAudit || 5000));
    this.auditSeq = 0;
    this.maxMetricSamples = Math.max(50, Number(options.maxMetricSamples || 1000));
  }

  async stableId(namespace, payload) {
    const hash = await sha256(`${String(namespace)}\n${canonical(payload)}`);
    return `${String(namespace).replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}_${hash.slice(0, 24)}`;
  }

  correlationId(seed = '') {
    const stamp = nowIso(this.clock).replace(/\D/g, '').slice(0, 17);
    const safe = String(seed || 'op').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'op';
    const entropy = globalThis.crypto?.randomUUID?.() || `${Math.random()}`.slice(2);
    return `kosif-${stamp}-${safe}-${entropy.slice(0, 12)}`;
  }

  setPermissions(role, permissions) {
    this.permissions.set(String(role), new Set(permissions || []));
  }

  authorize(actor, permission) {
    if (!permission) return true;
    const role = String(actor?.role || '');
    const granted = this.permissions.get(role);
    if (!granted || (!granted.has(permission) && !granted.has('*'))) {
      throw new KosifControlError('PERMISSION_DENIED', 'لا توجد صلاحية كافية لتنفيذ العملية', { role, permission });
    }
    return true;
  }

  setFeatureFlag(name, state, meta = {}) {
    const record = Object.freeze({
      name: String(name),
      enabled: Boolean(state),
      updatedAt: nowIso(this.clock),
      updatedBy: String(meta.updatedBy || 'system'),
      reason: String(meta.reason || '')
    });
    this.featureFlags.set(record.name, record);
    return record;
  }

  featureEnabled(name, fallback = false) {
    return this.featureFlags.get(String(name))?.enabled ?? Boolean(fallback);
  }

  registerRollback(release, target, meta = {}) {
    const key = String(release);
    const record = Object.freeze({
      release: key,
      target: String(target),
      strategy: String(meta.strategy || 'revert'),
      verified: Boolean(meta.verified),
      createdAt: nowIso(this.clock)
    });
    this.rollback.set(key, record);
    return record;
  }

  setRetention(scope, policy = {}) {
    const record = Object.freeze({
      activeDays: Number(policy.activeDays || 0),
      archiveDays: Number(policy.archiveDays || 0),
      legalHoldAware: policy.legalHoldAware !== false,
      deleteMode: String(policy.deleteMode || 'governed')
    });
    this.retention.set(String(scope), record);
    return record;
  }

  setOfflinePolicy(operation, allowed, reason = '') {
    const record = Object.freeze({ allowed: Boolean(allowed), reason: String(reason) });
    this.offlinePolicy.set(String(operation), record);
    return record;
  }

  assertOffline(operation, isOnline) {
    if (isOnline) return true;
    const policy = this.offlinePolicy.get(String(operation));
    if (!policy?.allowed) throw new KosifControlError('ONLINE_REQUIRED', 'هذه العملية تحتاج اتصالًا موثوقًا', { operation, reason: policy?.reason || '' });
    return true;
  }

  async appendAudit(event) {
    const previous = this.audit.at(-1)?.hash || 'GENESIS';
    const record = {
      seq: ++this.auditSeq,
      at: nowIso(this.clock),
      buildId: this.buildId,
      gitSha: this.gitSha,
      correlationId: String(event.correlationId || this.correlationId(event.action)),
      actorId: String(event.actorId || 'system'),
      action: String(event.action || 'unknown'),
      module: String(event.module || 'core'),
      entityId: event.entityId == null ? null : String(event.entityId),
      before: event.before ?? null,
      after: event.after ?? null,
      sourceRefs: Array.isArray(event.sourceRefs) ? [...event.sourceRefs] : [],
      evidenceRefs: Array.isArray(event.evidenceRefs) ? [...event.evidenceRefs] : [],
      prevHash: previous
    };
    record.hash = await sha256(previous + '\n' + canonical(record));
    const frozen = Object.freeze(record);
    this.audit.push(frozen);
    if (this.audit.length > this.maxAudit) this.audit.shift();
    return frozen;
  }

  async verifyAuditChain(records = this.audit) {
    let previous = records.length ? (records[0]?.prevHash || 'GENESIS') : 'GENESIS';
    for (const item of records) {
      if (item.prevHash !== previous) return { ok: false, seq: item.seq, code: 'AUDIT_PREV_HASH_MISMATCH' };
      const clone = { ...item };
      delete clone.hash;
      const expected = await sha256(previous + '\n' + canonical(clone));
      if (item.hash !== expected) return { ok: false, seq: item.seq, code: 'AUDIT_HASH_MISMATCH' };
      previous = item.hash;
    }
    return { ok: true, count: records.length, head: previous };
  }

  async withIdempotency(key, fn) {
    const id = String(key || '').trim();
    if (!id) throw new KosifControlError('IDEMPOTENCY_KEY_REQUIRED', 'مفتاح منع التكرار مطلوب');
    if (this.idempotency.has(id)) return this.idempotency.get(id);
    const promise = Promise.resolve().then(fn);
    this.idempotency.set(id, promise);
    try {
      const value = await promise;
      this.idempotency.set(id, Promise.resolve(value));
      return value;
    } catch (error) {
      this.idempotency.delete(id);
      throw error;
    }
  }

  assertExpectedVersion(entityId, expectedVersion) {
    const current = this.entityVersions.get(String(entityId)) || 0;
    if (expectedVersion != null && Number(expectedVersion) !== current) {
      throw new KosifControlError('CONCURRENCY_CONFLICT', 'تم تعديل السجل بواسطة عملية أخرى؛ أعد تحميل أحدث نسخة', { entityId, expectedVersion, currentVersion: current });
    }
    return current;
  }

  async versionedUpdate({ module, entityId, expectedVersion, actor, before, after, sourceRefs = [], evidenceRefs = [] }) {
    const id = String(entityId || '').trim();
    if (!id) throw new KosifControlError('ENTITY_ID_REQUIRED', 'معرّف الكيان مطلوب');
    const current = this.assertExpectedVersion(id, expectedVersion);
    const version = current + 1;
    this.entityVersions.set(id, version);
    await this.appendAudit({
      action: 'entity.update',
      module,
      entityId: id,
      actorId: actor?.id,
      before,
      after,
      sourceRefs,
      evidenceRefs
    });
    this.emit('entity.updated', { module, entityId: id, version });
    return Object.freeze({ entityId: id, version, before, after });
  }

  validateAIClaim(claim = {}) {
    if (claim.origin !== 'ai') return { ok: true, advisory: false };
    if (claim.authoritativeFinancialNumber === true) {
      throw new KosifControlError('AI_NUMERIC_AUTHORITY_BLOCKED', 'لا يجوز اعتماد رقم مالي نهائي منشؤه نموذج لغوي');
    }
    if (claim.citesSource === true && !(claim.sourceRefs || []).length) {
      throw new KosifControlError('AI_SOURCE_FABRICATION_BLOCKED', 'لا يجوز إظهار مصدر غير مرتبط بمرجع فعلي');
    }
    if (claim.professionalConclusion === true && claim.humanApproved !== true) {
      throw new KosifControlError('HUMAN_APPROVAL_REQUIRED', 'الحكم المهني الناتج عن AI يظل استشاريًا حتى الاعتماد البشري');
    }
    return { ok: true, advisory: true };
  }

  requireHumanApproval(context = {}) {
    if (context.required && !context.approved) {
      throw new KosifControlError('HUMAN_APPROVAL_REQUIRED', 'هذه الخطوة تتطلب اعتمادًا بشريًا موثقًا', { stage: context.stage || null });
    }
    return true;
  }

  sourceEnvelope(source = {}) {
    const required = ['id', 'authority', 'title', 'versionDate'];
    const missing = required.filter(k => !String(source[k] ?? '').trim());
    if (missing.length) throw new KosifControlError('SOURCE_PROVENANCE_INCOMPLETE', 'بيانات مصدر الحقيقة غير مكتملة', { missing });
    return Object.freeze({
      id: String(source.id),
      authority: String(source.authority),
      title: String(source.title),
      jurisdiction: String(source.jurisdiction || ''),
      versionDate: String(source.versionDate),
      effectiveFrom: source.effectiveFrom == null ? null : String(source.effectiveFrom),
      retrievedAt: String(source.retrievedAt || nowIso(this.clock)),
      url: String(source.url || ''),
      hash: String(source.hash || ''),
      trainingOnly: Boolean(source.trainingOnly)
    });
  }

  explain({ ruleId, reason, inputs = [], sources = [], evidence = [], limitations = [] } = {}) {
    return Object.freeze({
      ruleId: String(ruleId || ''),
      reason: String(reason || ''),
      inputs: Object.freeze([...inputs]),
      sources: Object.freeze([...sources]),
      evidence: Object.freeze([...evidence]),
      limitations: Object.freeze([...limitations])
    });
  }

  recordMetric(name, durationMs, ok = true, meta = {}) {
    const key = String(name);
    const list = this.metrics.get(key) || [];
    list.push(Object.freeze({ durationMs: Math.max(0, Number(durationMs) || 0), ok: Boolean(ok), at: nowIso(this.clock), ...meta }));
    if (list.length > this.maxMetricSamples) list.splice(0, list.length - this.maxMetricSamples);
    this.metrics.set(key, list);
  }

  metricSummary(name) {
    const list = this.metrics.get(String(name)) || [];
    const times = list.map(x => x.durationMs).sort((a, b) => a - b);
    const failures = list.filter(x => !x.ok).length;
    return Object.freeze({
      name: String(name),
      count: list.length,
      failureRate: list.length ? failures / list.length : 0,
      p50: percentile(times, .50),
      p95: percentile(times, .95),
      p99: percentile(times, .99),
      max: times.at(-1) || 0
    });
  }

  emit(type, payload = {}) {
    const evt = Object.freeze({ type: String(type), at: nowIso(this.clock), payload: Object.freeze({ ...payload }) });
    this.events.push(evt);
    if (this.events.length > 2000) this.events.shift();
    return evt;
  }

  alert(severity, code, message, meta = {}) {
    if (!this.severities.includes(severity)) throw new KosifControlError('INVALID_SEVERITY', 'درجة التنبيه غير معتمدة', { severity });
    const item = Object.freeze({ severity, code: String(code), message: String(message), at: nowIso(this.clock), ...meta });
    this.alerts.push(item);
    if (this.alerts.length > 1000) this.alerts.shift();
    return item;
  }

  page(items, { cursor = 0, limit = 100, maxLimit = 1000 } = {}) {
    const safeLimit = Math.max(1, Math.min(maxLimit, Number(limit) || 100));
    const start = Math.max(0, Number(cursor) || 0);
    const slice = Array.from(items || []).slice(start, start + safeLimit);
    return Object.freeze({ items: Object.freeze(slice), cursor: start, nextCursor: start + slice.length < (items?.length || 0) ? start + slice.length : null, limit: safeLimit, total: items?.length || 0 });
  }

  async governedOperation(spec = {}, handler) {
    const started = globalThis.performance?.now?.() ?? Date.now();
    const correlationId = spec.correlationId || this.correlationId(spec.id || spec.action || 'op');
    let ok = false;
    try {
      if (spec.featureFlag && !this.featureEnabled(spec.featureFlag)) throw new KosifControlError('FEATURE_DISABLED', 'هذه القدرة غير مفعلة في هذا الإصدار', { featureFlag: spec.featureFlag });
      this.authorize(spec.actor, spec.permission);
      this.assertOffline(spec.id || spec.action, spec.isOnline !== false);
      const validation = validateSchema(spec.input, spec.schema);
      if (!validation.ok) throw new KosifControlError('INPUT_VALIDATION_FAILED', 'المدخلات غير صالحة', { errors: validation.errors });
      this.requireHumanApproval(spec.approval || {});
      if (spec.aiClaim) this.validateAIClaim(spec.aiClaim);
      const execute = async () => {
        const data = await handler({ ...spec, correlationId });
        ok = true;
        await this.appendAudit({
          correlationId,
          actorId: spec.actor?.id,
          action: spec.action || spec.id || 'operation',
          module: spec.module || 'core',
          entityId: spec.entityId,
          before: spec.before ?? null,
          after: data ?? null,
          sourceRefs: spec.sourceRefs || [],
          evidenceRefs: spec.evidenceRefs || []
        });
        return resultEnvelope({
          ok: true,
          data,
          correlationId,
          explain: spec.explain || null,
          sources: spec.sources || [],
          evidence: spec.evidence || []
        });
      };
      return spec.idempotencyKey ? await this.withIdempotency(spec.idempotencyKey, execute) : await execute();
    } catch (error) {
      const e = error instanceof KosifControlError ? error : new KosifControlError('UNEXPECTED_FAILURE', 'تعذر إكمال العملية بأمان', { cause: String(error?.message || error) });
      await this.appendAudit({
        correlationId,
        actorId: spec.actor?.id,
        action: `${spec.action || spec.id || 'operation'}.failed`,
        module: spec.module || 'core',
        entityId: spec.entityId,
        before: spec.before ?? null,
        after: { code: e.code }
      });
      return resultEnvelope({ ok: false, code: e.code, errors: [{ code: e.code, message: e.message, meta: e.meta }], correlationId });
    } finally {
      const ended = globalThis.performance?.now?.() ?? Date.now();
      this.recordMetric(spec.metric || spec.action || spec.id || 'operation', ended - started, ok, { module: spec.module || 'core' });
    }
  }

  health() {
    const metricSummaries = [...this.metrics.keys()].map(k => this.metricSummary(k));
    const critical = this.alerts.filter(x => x.severity === 'critical').length;
    return Object.freeze({
      ok: critical === 0,
      version: KOSIF_REQUIREMENTS_VERSION,
      buildId: this.buildId,
      gitSha: this.gitSha,
      priorities: this.priority,
      auditEvents: this.audit.length,
      featureFlags: this.featureFlags.size,
      rollbackTargets: this.rollback.size,
      activeAlerts: this.alerts.length,
      criticalAlerts: critical,
      metrics: Object.freeze(metricSummaries)
    });
  }

  exportAudit() {
    return this.audit.map(x => ({ ...x }));
  }
}

export function createRequirementsControlPlane(options = {}) {
  return new RequirementsControlPlane(options);
}
