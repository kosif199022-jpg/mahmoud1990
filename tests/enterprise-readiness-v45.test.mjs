import assert from 'node:assert/strict';
import test from 'node:test';
import { enterpriseReadiness } from '../src/enterprise-readiness-v45.mjs';

test('enterprise financial authority fails closed without PostgreSQL cutover', () => {
  const r = enterpriseReadiness({});
  assert.equal(r.financialPostgres.configured, false);
  assert.equal(r.financialPostgres.readyForAuthoritativePosting, false);
  assert.equal(r.currentRuntime.financialStorage, 'legacy-d1-kv-compatibility');
  assert.equal(r.authority.ai, 'advisory-only');
});

test('database configuration alone never claims authoritative posting', () => {
  const r = enterpriseReadiness({
    KOSIF_FINANCIAL_DATABASE_URL: 'postgres://server/db',
    KOSIF_FINANCIAL_SCHEMA_VERSION: '1.0.0'
  });
  assert.equal(r.financialPostgres.configured, true);
  assert.equal(r.financialPostgres.schemaMatches, true);
  assert.equal(r.financialPostgres.migrationVerified, false);
  assert.equal(r.financialPostgres.readyForAuthoritativePosting, false);
});

test('wrong schema version stays blocked even when migration flag is set', () => {
  const r = enterpriseReadiness({
    KOSIF_FINANCIAL_DATABASE_URL: 'postgres://server/db',
    KOSIF_FINANCIAL_SCHEMA_VERSION: '0.9.0',
    KOSIF_FINANCIAL_MIGRATION_VERIFIED: 'true'
  });
  assert.equal(r.financialPostgres.schemaMatches, false);
  assert.equal(r.financialPostgres.readyForAuthoritativePosting, false);
});

test('matching schema plus explicit verified migration unlocks readiness contract', () => {
  const r = enterpriseReadiness({
    KOSIF_FINANCIAL_DATABASE_URL: 'postgres://server/db',
    KOSIF_FINANCIAL_SCHEMA_VERSION: '1.0.0',
    KOSIF_FINANCIAL_MIGRATION_VERIFIED: 'verified'
  });
  assert.equal(r.financialPostgres.readyForAuthoritativePosting, true);
  assert.equal(r.currentRuntime.financialStorage, 'postgresql-financial-core');
  assert.equal(r.guardrails.postedEntriesImmutable, true);
  assert.equal(r.guardrails.idempotencyRequiredForMutations, true);
});
