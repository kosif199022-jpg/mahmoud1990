import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRequirementsControlPlane,
  KosifControlError,
  validateSchema,
  KOSIF_REQUIREMENTS_VERSION
} from '../src/requirements/v42-control-plane.mjs';

const fixedClock = () => new Date('2026-08-20T17:30:00.000Z');

function cp(extra = {}) {
  const c = createRequirementsControlPlane({ clock: fixedClock, buildId: 'test-build', gitSha: 'abc123', ...extra });
  c.setPermissions('reviewer', ['tb.write', 'report.approve']);
  c.setPermissions('viewer', ['tb.read']);
  return c;
}

test('v42 version is pinned', () => {
  assert.equal(KOSIF_REQUIREMENTS_VERSION, '42.0.0');
});

test('stable IDs are deterministic and namespace-scoped', async () => {
  const c = cp();
  const a = await c.stableId('account', { code: '1000', entity: 'X' });
  const b = await c.stableId('account', { entity: 'X', code: '1000' });
  const d = await c.stableId('finding', { code: '1000', entity: 'X' });
  assert.equal(a, b);
  assert.notEqual(a, d);
});

test('least privilege blocks unauthorized writes', () => {
  const c = cp();
  assert.throws(() => c.authorize({ role: 'viewer' }, 'tb.write'), err => err instanceof KosifControlError && err.code === 'PERMISSION_DENIED');
  assert.equal(c.authorize({ role: 'reviewer' }, 'tb.write'), true);
});

test('schema validation reports field-level errors', () => {
  const v = validateSchema({ amount: '10' }, { required: ['account'], properties: { amount: { type: 'number' } } });
  assert.equal(v.ok, false);
  assert.deepEqual(v.errors.map(x => x.code).sort(), ['FIELD_REQUIRED', 'FIELD_TYPE']);
});

test('human approval gate cannot be bypassed', () => {
  const c = cp();
  assert.throws(() => c.requireHumanApproval({ required: true, approved: false, stage: 'report' }), err => err.code === 'HUMAN_APPROVAL_REQUIRED');
});

test('AI cannot become authority for final financial numbers or fabricated citations', () => {
  const c = cp();
  assert.throws(() => c.validateAIClaim({ origin: 'ai', authoritativeFinancialNumber: true }), err => err.code === 'AI_NUMERIC_AUTHORITY_BLOCKED');
  assert.throws(() => c.validateAIClaim({ origin: 'ai', citesSource: true, sourceRefs: [] }), err => err.code === 'AI_SOURCE_FABRICATION_BLOCKED');
  assert.throws(() => c.validateAIClaim({ origin: 'ai', professionalConclusion: true, humanApproved: false }), err => err.code === 'HUMAN_APPROVAL_REQUIRED');
});

test('idempotency executes a sensitive handler once', async () => {
  const c = cp();
  let n = 0;
  const fn = () => ++n;
  const a = await c.withIdempotency('post-1', fn);
  const b = await c.withIdempotency('post-1', fn);
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(n, 1);
});

test('optimistic concurrency rejects stale writes', async () => {
  const c = cp();
  await c.versionedUpdate({ module: 'tb', entityId: 'A', expectedVersion: 0, actor: { id: 'u1' }, before: {}, after: { x: 1 } });
  await assert.rejects(() => c.versionedUpdate({ module: 'tb', entityId: 'A', expectedVersion: 0, actor: { id: 'u2' }, before: { x: 1 }, after: { x: 2 } }), err => err.code === 'CONCURRENCY_CONFLICT');
});

test('audit trail hash chain detects tampering', async () => {
  const c = cp();
  await c.appendAudit({ action: 'a', after: { x: 1 } });
  await c.appendAudit({ action: 'b', after: { y: 2 } });
  assert.equal((await c.verifyAuditChain()).ok, true);
  const tampered = c.exportAudit();
  tampered[1].after = { y: 999 };
  assert.equal((await c.verifyAuditChain(tampered)).ok, false);
});

test('pruned audit window stays verifiable and sequence is monotonic', async () => {
  const c = cp({ maxAudit: 100 });
  for (let i = 0; i < 105; i++) await c.appendAudit({ action: `a${i}`, after: { i } });
  assert.equal(c.audit.length, 100);
  assert.equal(c.audit[0].seq, 6);
  assert.equal(c.audit.at(-1).seq, 105);
  assert.equal((await c.verifyAuditChain()).ok, true);
});

test('official-source envelope requires provenance', () => {
  const c = cp();
  assert.throws(() => c.sourceEnvelope({ id: 'ifrs18' }), err => err.code === 'SOURCE_PROVENANCE_INCOMPLETE');
  const s = c.sourceEnvelope({ id: 'ifrs18', authority: 'SOCPA', title: 'IFRS 18', versionDate: '2025-12-24', effectiveFrom: '2027-01-01' });
  assert.equal(s.authority, 'SOCPA');
});

test('governed operation combines feature, auth, validation, approval, audit and metrics', async () => {
  const c = cp();
  c.setFeatureFlag('tb-posting', true, { updatedBy: 'test' });
  const result = await c.governedOperation({
    id: 'tb.post', action: 'tb.post', module: 'tb', featureFlag: 'tb-posting', actor: { id: 'u1', role: 'reviewer' }, permission: 'tb.write',
    input: { account: '1000', amount: 10 }, schema: { required: ['account', 'amount'], properties: { amount: { type: 'number' } } },
    approval: { required: true, approved: true, stage: 'post' }, idempotencyKey: 'tb-1', sourceRefs: ['src-1'], evidenceRefs: ['ev-1']
  }, async ({ input }) => ({ posted: true, amount: input.amount }));
  assert.equal(result.ok, true);
  assert.equal(c.audit.length, 1);
  assert.equal(c.metricSummary('tb.post').count, 1);
});

test('feature flags and offline policies fail visibly', async () => {
  const c = cp();
  const disabled = await c.governedOperation({ id: 'x', featureFlag: 'missing', actor: { role: 'reviewer' }, input: {} }, async () => 1);
  assert.equal(disabled.ok, false);
  assert.equal(disabled.code, 'FEATURE_DISABLED');
  c.setOfflinePolicy('sync', false, 'needs source verification');
  assert.throws(() => c.assertOffline('sync', false), err => err.code === 'ONLINE_REQUIRED');
});

test('pagination and health view are bounded and explicit', () => {
  const c = cp();
  const page = c.page([1,2,3,4], { cursor: 1, limit: 2 });
  assert.deepEqual([...page.items], [2,3]);
  assert.equal(page.nextCursor, 3);
  c.recordMetric('load', 10, true);
  c.recordMetric('load', 30, false);
  const health = c.health();
  assert.equal(health.version, '42.0.0');
  assert.equal(health.metrics[0].p95, 30);
});
