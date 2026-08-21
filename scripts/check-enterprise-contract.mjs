import fs from 'node:fs';
import { enterpriseReadiness } from '../src/enterprise-readiness-v45.mjs';

const read = (p) => fs.readFileSync(p, 'utf8');
const die = (m) => { throw new Error(`Enterprise contract gate: ${m}`); };
const must = (c, m) => { if (!c) die(m); };

const contract = JSON.parse(read('config/enterprise-contract-v45.json'));
must(contract.schema === 'kosif.enterprise-contract.v45', 'contract schema mismatch');
must(contract.version === '45.0.0', 'contract version mismatch');
must(contract.blueprint?.version === '3.0.0', 'blueprint version must remain 3.0.0');
must(contract.blueprint?.specVersion === '2026-08', 'blueprint spec version must remain 2026-08');
must(contract.blueprint?.deterministicNumbers === true, 'deterministic-number authority missing');
must(contract.blueprint?.aiNarrativeOnly === true, 'AI narrative-only boundary missing');
must(contract.openapi?.version === '3.1.0', 'OpenAPI version mismatch');
must(contract.openapi?.designVersion === '1.0.0-design', 'OpenAPI design version mismatch');
must(contract.openapi?.paths === 42, 'expected 42 OpenAPI paths');
must(contract.openapi?.operations === 55, 'expected 55 OpenAPI operations');
must(contract.openapi?.idempotentMutations === 38, 'expected 38 idempotent mutations');
must(contract.openapi?.auditEventMutations === 38, 'expected 38 mutation audit-event markers');
must(contract.openapi?.tenantIsolationOperations === 55, 'expected tenant isolation on all 55 operations');
must(contract.openapi?.authoritativeMoney === 'integer-minor-units-as-strings', 'minor-unit money contract missing');
for (const k of ['containsJournalEntries','containsJournalLines','containsApprovalDecisions','containsAuditEvents','containsIdempotency','containsOutbox','tenantSetting']) {
  must(contract.postgres?.[k] === true, `PostgreSQL capability missing: ${k}`);
}
must(contract.postgres?.tables === 16, 'expected 16 PostgreSQL core tables');
must(contract.postgres?.forUpdateLocks >= 4, 'row-lock concurrency coverage missing');
must(contract.cutover?.aiAuthority === 'advisory-only', 'AI authority boundary drifted');
must(contract.cutover?.humanApprovalRequired === true, 'human approval boundary missing');
for (const src of Object.values(contract.sourcePack || {})) {
  must(/^[a-f0-9]{64}$/.test(src.sha256 || ''), `invalid source SHA-256 for ${src.filename}`);
  must(Number(src.bytes) > 0, `invalid source byte count for ${src.filename}`);
}

const packageJson = JSON.parse(read('package.json'));
must(packageJson.scripts?.['enterprise-contract'], 'package.json must expose enterprise-contract gate');
must(String(packageJson.scripts?.check || '').includes('enterprise-contract'), 'npm run check must include enterprise-contract');
const edge = read('src/suite-edge-v43.js');
must(edge.includes("./enterprise-readiness-v45.mjs"), 'production wrapper must import enterprise readiness');
must(edge.includes("p==='/__enterprise'"), 'production wrapper must expose /__enterprise');

const cold = enterpriseReadiness({});
must(cold.financialPostgres.readyForAuthoritativePosting === false, 'financial authority must fail closed without configuration');
const configuredOnly = enterpriseReadiness({KOSIF_FINANCIAL_DATABASE_URL:'postgres://configured',KOSIF_FINANCIAL_SCHEMA_VERSION:'1.0.0'});
must(configuredOnly.financialPostgres.readyForAuthoritativePosting === false, 'configuration without verified migration must fail closed');
const verified = enterpriseReadiness({KOSIF_FINANCIAL_DATABASE_URL:'postgres://configured',KOSIF_FINANCIAL_SCHEMA_VERSION:'1.0.0',KOSIF_FINANCIAL_MIGRATION_VERIFIED:'true'});
must(verified.financialPostgres.readyForAuthoritativePosting === true, 'verified enterprise migration contract should become ready');

console.log('KOSIF Enterprise Core v45 contract OK');
