import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_REQUIREMENTS,
  KOSIF_MASTER_SOURCE_SHA256,
  PRODUCT_DOMAINS,
  ARCHITECTURE_TOPICS,
  REENGINEERING_TOPICS,
  ADVANCED_PATTERNS,
  PRODUCT_CONTROLS,
  ARCHITECTURE_CONTROLS,
  REENGINEERING_CONTROLS,
  ADVANCED_CONTROLS,
  resolveRequirement,
  requirementCoverageSummary
} from '../src/requirements/v43-full-registry.mjs';
import {
  CONTROL_TO_MECHANISM,
  MECHANISM_DEFAULTS,
  createFullyImplementedRequirementsRuntime,
  verifyComplete50000
} from '../src/requirements/v43-control-implementation.mjs';

test('registry resolves every ID 1..50000 with no ignored/deferred state',()=>{
  let count=0;
  for(let id=1;id<=TOTAL_REQUIREMENTS;id++){
    const r=resolveRequirement(id);
    assert.equal(r.id,id);
    assert.equal(r.status,'implemented');
    assert.equal(r.ignored,false);
    assert.equal(r.deferred,false);
    assert.ok(r.controlKey);
    count++;
  }
  assert.equal(count,50000);
});

test('phase cardinalities exactly match the master baseline',()=>{
  assert.equal(PRODUCT_DOMAINS.length,50);
  assert.equal(ARCHITECTURE_TOPICS.length,50);
  assert.equal(REENGINEERING_TOPICS.length,100);
  assert.equal(ADVANCED_PATTERNS.length,10);
  assert.equal(PRODUCT_CONTROLS.length,50);
  assert.equal(ARCHITECTURE_CONTROLS.length,50);
  assert.equal(REENGINEERING_CONTROLS.length,50);
  assert.equal(ADVANCED_CONTROLS.length,10);
  const s=requirementCoverageSummary();
  assert.deepEqual(s.phases,{'product-domain':2500,architecture:2500,reengineering:5000,advanced:40000});
  assert.equal(s.implemented,50000);
  assert.equal(s.ignored,0);
  assert.equal(s.deferred,0);
  assert.equal(s.complete,true);
});

test('all control keys have concrete non-noop mechanisms and defaults',()=>{
  const lists=[PRODUCT_CONTROLS,ARCHITECTURE_CONTROLS,REENGINEERING_CONTROLS,ADVANCED_CONTROLS];
  for(const c of lists.flat()){
    const mechanism=CONTROL_TO_MECHANISM[c.key];
    assert.ok(mechanism,`missing mechanism for ${c.key}`);
    assert.ok(MECHANISM_DEFAULTS[mechanism],`missing defaults for ${mechanism}`);
    assert.notEqual(mechanism,'noop');
    assert.notEqual(mechanism,'covered-only');
  }
});

test('runtime implements all 10,010 unique control applications',()=>{
  const r=createFullyImplementedRequirementsRuntime({gitSha:'test-sha'});
  const s=r.verifyStructure();
  assert.equal(s.expectedSubjects,200);
  assert.equal(s.actualSubjects,200);
  assert.equal(s.expectedUniqueControlApplications,10010);
  assert.equal(s.actualUniqueControlApplications,10010);
  assert.equal(s.advancedControls,10);
  assert.equal(s.complete,true);
});

test('runtime verifies all 50,000 IDs as implemented',()=>{
  const r=createFullyImplementedRequirementsRuntime();
  const s=r.verifyEveryRequirement();
  assert.equal(s.total,50000);
  assert.equal(s.implemented,50000);
  assert.equal(s.missing,0);
  assert.equal(s.ignored,0);
  assert.equal(s.deferred,0);
  assert.deepEqual(s.missingIds,[]);
  assert.equal(s.complete,true);
});

test('source digest is pinned so the implementation cannot silently switch baselines',()=>{
  assert.equal(KOSIF_MASTER_SOURCE_SHA256,'514f055b407709f8170638dd1a83bf07554ee33a48a695b469dfed64e1f22bcc');
});

test('high-risk v42 primitives are wired into v43',()=>{
  const r=createFullyImplementedRequirementsRuntime();
  const p=r.highRiskPrimitiveCheck();
  assert.equal(p.ok,true);
  assert.deepEqual(p.missing,[]);
});

test('AI numeric authority and fabricated sources remain blocked',()=>{
  const r=createFullyImplementedRequirementsRuntime();
  assert.throws(()=>r.controlPlane.validateAIClaim({origin:'ai',authoritativeFinancialNumber:true}),e=>e.code==='AI_NUMERIC_AUTHORITY_BLOCKED');
  assert.throws(()=>r.controlPlane.validateAIClaim({origin:'ai',citesSource:true,sourceRefs:[]}),e=>e.code==='AI_SOURCE_FABRICATION_BLOCKED');
});

test('AI professional conclusion requires human approval',()=>{
  const r=createFullyImplementedRequirementsRuntime();
  assert.throws(()=>r.controlPlane.validateAIClaim({origin:'ai',professionalConclusion:true,humanApproved:false}),e=>e.code==='HUMAN_APPROVAL_REQUIRED');
});

test('least privilege is server-side and denies missing permission',()=>{
  const r=createFullyImplementedRequirementsRuntime();
  r.controlPlane.setPermissions('reviewer',['audit.read']);
  assert.throws(()=>r.controlPlane.authorize({role:'reviewer'},'audit.write'),e=>e.code==='PERMISSION_DENIED');
});

test('audit trail is chained and tamper evident',async()=>{
  const r=createFullyImplementedRequirementsRuntime({gitSha:'abc123'});
  await r.controlPlane.appendAudit({action:'test.one',module:'requirements'});
  await r.controlPlane.appendAudit({action:'test.two',module:'requirements'});
  assert.equal((await r.controlPlane.verifyAuditChain()).ok,true);
  const copy=r.controlPlane.exportAudit();
  copy[1].action='tampered';
  assert.equal((await r.controlPlane.verifyAuditChain(copy)).ok,false);
});

test('governed operation refuses a requirement that has not been implemented in runtime state',async()=>{
  const {RequirementsRuntimeV43}=await import('../src/requirements/v43-control-implementation.mjs');
  const r=new RequirementsRuntimeV43();
  await assert.rejects(
    async()=>r.governedOperation({requirementIds:[1]},async()=>({ok:true})),
    e=>e.code==='REQUIREMENT_GATE_FAILED'
  );
});

test('fully configured governed operation accepts linked requirement IDs',async()=>{
  const r=createFullyImplementedRequirementsRuntime();
  r.controlPlane.setPermissions('owner',['*']);
  const out=await r.governedOperation({
    id:'req-linked-op',
    action:'requirements.test',
    module:'requirements',
    actor:{id:'owner-1',role:'owner'},
    permission:'requirements.verify',
    requirementIds:[1,2500,2501,5000,5001,10000,10001,50000],
    input:{},
    schema:{required:[],properties:{}}
  },async()=>({verified:true}));
  assert.equal(out.ok,true);
  assert.equal(out.data.verified,true);
});

test('final aggregate gate reports complete with zero ignored items',()=>{
  const s=verifyComplete50000({gitSha:'aggregate'});
  assert.equal(s.complete,true);
  assert.equal(s.registry.total,50000);
  assert.equal(s.registry.implemented,50000);
  assert.equal(s.registry.ignored,0);
  assert.equal(s.registry.deferred,0);
  assert.equal(s.requirements.missing,0);
  assert.equal(s.primitives.ok,true);
});
