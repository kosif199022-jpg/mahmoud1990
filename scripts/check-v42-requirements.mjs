import fs from 'node:fs';
import path from 'node:path';
import { REQUIREMENTS_BASELINE, PRIORITY_ORDER, REQUIRED_EVIDENCE_PATHS, DOMAIN_EVIDENCE } from '../src/requirements/v42-requirements-manifest.mjs';

const root = process.cwd();
const problems = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); };
const exists = p => fs.existsSync(path.join(root, p));

ok(REQUIREMENTS_BASELINE.totalItems === 50000, 'Baseline must preserve all 50,000 item IDs');
ok(REQUIREMENTS_BASELINE.uniqueRequirementTexts === 10010, 'Unique-text count drifted from the master baseline');
ok(REQUIREMENTS_BASELINE.repeatedAdvancedItems === 40000, 'Advanced repetition count drifted from the master baseline');
ok(Object.keys(DOMAIN_EVIDENCE).length === 53, 'All 53 master-note domains must be represented');
ok(PRIORITY_ORDER.join('|') === 'numeric_correctness|security_privacy|professional_compliance|source_authority|data_integrity|accessibility_mobile|capability_preservation|visual_consistency|performance', 'Priority order must not drift');

for (const p of REQUIRED_EVIDENCE_PATHS) ok(exists(p), `Missing required implementation evidence: ${p}`);
for (const [domain, evidence] of Object.entries(DOMAIN_EVIDENCE)) {
  ok(Array.isArray(evidence) && evidence.length > 0, `No evidence mapped for domain: ${domain}`);
  for (const p of evidence) ok(exists(p), `Mapped evidence does not exist (${domain}): ${p}`);
}

const plane = fs.readFileSync(path.join(root, 'src/requirements/v42-control-plane.mjs'), 'utf8');
for (const marker of [
  'AI_NUMERIC_AUTHORITY_BLOCKED', 'AI_SOURCE_FABRICATION_BLOCKED', 'HUMAN_APPROVAL_REQUIRED', 'CONCURRENCY_CONFLICT',
  'PERMISSION_DENIED', 'INPUT_VALIDATION_FAILED', 'FEATURE_DISABLED', 'ONLINE_REQUIRED', 'appendAudit', 'verifyAuditChain',
  'withIdempotency', 'sourceEnvelope', 'metricSummary', 'governedOperation'
]) ok(plane.includes(marker), `Control-plane invariant missing: ${marker}`);

const deploy = fs.readFileSync(path.join(root, '.github/workflows/deploy-cloudflare.yml'), 'utf8');
ok(deploy.includes('npm run check'), 'Cloudflare production deploy must execute the full check gate');
ok(/push:\s*\n\s*branches:\s*\[main\]/.test(deploy), 'Production workflow must remain attached to main');
ok(/Live verification|verify-live-site/.test(deploy), 'Production workflow must retain live verification');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
ok(String(packageJson.scripts?.check || '').includes('v42-requirements'), 'npm run check must include v42-requirements gate');
ok(packageJson.scripts?.['v42-requirements'] === 'node scripts/check-v42-requirements.mjs && node --test tests/v42-requirements-control-plane.test.mjs', 'v42-requirements script contract changed');

if (problems.length) {
  console.error('KOSIF_V42_REQUIREMENTS_GATE_FAILED');
  for (const p of problems) console.error('-', p);
  process.exit(1);
}
console.log('KOSIF_V42_REQUIREMENTS_GATE_OK', JSON.stringify({
  totalItems: REQUIREMENTS_BASELINE.totalItems,
  uniqueRequirementTexts: REQUIREMENTS_BASELINE.uniqueRequirementTexts,
  domains: Object.keys(DOMAIN_EVIDENCE).length,
  evidencePaths: REQUIRED_EVIDENCE_PATHS.length
}));
