import assert from 'node:assert/strict';
import { evaluateAuditLifecycle, validateFindingChain } from '../src/engine/audit-lifecycle-v47.mjs';

console.log('KOSIF v47 audit lifecycle tests');

const empty = evaluateAuditLifecycle({});
assert.equal(empty.deterministic, true);
assert.equal(empty.currentStage.id, 'setup');
assert.equal(empty.reportingReady, false);
assert.ok(empty.blockers.some(b => b.code === 'ENTITY_REQUIRED'));

const balanced = evaluateAuditLifecycle({
  entity: { name: 'شركة الاختبار', period: '2026', framework: 'SOCPA_IFRS' },
  tb: [{ code: '1001', debit: 100, credit: 0 }, { code: '2001', debit: 0, credit: 100 }],
  tbBalanced: true,
  risks: [{ id: 'R1' }],
  pbc: [{ id: 'P1', status: 'received' }],
  evidence: [{ id: 'E1' }],
  rounds: [{ id: 'ROUND-1' }],
  findingsReviewed: true,
  noAdjustmentsConclusion: true,
  humanApproval: true,
  reportDraft: { id: 'REP-1' }
});
assert.equal(balanced.reportingReady, true);
assert.equal(balanced.stages.find(s => s.id === 'reporting').status, 'complete');
assert.equal(balanced.completionPercent, 100);

const aiBlocked = evaluateAuditLifecycle({
  entity: { name: 'شركة الاختبار', period: '2026', framework: 'SOCPA_IFRS' },
  tb: [{ code: '1001' }],
  tbBalanced: true,
  risks: [{ id: 'R1' }],
  rounds: [{ id: 'ROUND-1' }],
  findingsReviewed: true,
  noAdjustmentsConclusion: true,
  aiOpinions: [{ id: 'AI-1', source: 'ai' }],
  reportDraft: { id: 'REP-1' }
});
assert.equal(aiBlocked.reportingReady, false);
assert.ok(aiBlocked.blockers.some(b => b.code === 'AI_HUMAN_REVIEW_REQUIRED'));

const materialBlocked = evaluateAuditLifecycle({
  entity: { name: 'شركة الاختبار', period: '2026', framework: 'SOCPA_IFRS' },
  tb: [{ code: '1001' }],
  tbBalanced: true,
  risks: [{ id: 'R1' }],
  rounds: [{ id: 'ROUND-1' }],
  findingsReviewed: true,
  overallMateriality: 500000,
  adjustments: [{ id: 'AJE-1', amount: 700000, status: 'proposed' }],
  humanApproval: true,
  reportDraft: { id: 'REP-1' }
});
assert.equal(materialBlocked.reportingReady, false);
assert.ok(materialBlocked.blockers.some(b => b.code === 'MATERIAL_AJE_UNRESOLVED'));

const invalidAiFinding = validateFindingChain({
  source: 'ai',
  misstatementAmount: 1000,
  links: {
    accountId: 'A1', assertion: 'existence', riskId: 'R1', procedureId: 'P1',
    evidenceIds: ['E1'], standardRefs: ['ISA 500']
  }
});
assert.equal(invalidAiFinding.ok, false);
assert.ok(invalidAiFinding.missing.includes('humanDecision'));
assert.equal(invalidAiFinding.canAffectFinalOpinion, false);

const governedFinding = validateFindingChain({
  source: 'ai',
  humanDecisionId: 'HD-1',
  misstatementAmount: 1000,
  links: {
    accountId: 'A1', assertion: 'existence', riskId: 'R1', procedureId: 'P1',
    evidenceIds: ['E1'], standardRefs: ['ISA 500']
  }
});
assert.equal(governedFinding.ok, true);
assert.equal(governedFinding.canAffectFinalOpinion, true);

console.log('AUDIT_LIFECYCLE_V47_OK');
