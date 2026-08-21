/**
 * KOSIF Enterprise Core v45 readiness contract.
 *
 * This module does not make PostgreSQL authoritative by declaration. It exposes
 * the migration state truthfully so the current Worker cannot claim enterprise
 * posting authority before the financial database is configured and verified.
 */
export const KOSIF_ENTERPRISE_CONTRACT_VERSION = '45.0.0';
export const KOSIF_ENTERPRISE_SCHEMA_VERSION = '1.0.0';

const yes = (v) => ['1', 'true', 'yes', 'verified'].includes(String(v || '').trim().toLowerCase());
const text = (v) => String(v || '').trim();

export function enterpriseReadiness(env = {}) {
  const financialDatabaseConfigured = Boolean(text(env.KOSIF_FINANCIAL_DATABASE_URL));
  const schemaVersion = text(env.KOSIF_FINANCIAL_SCHEMA_VERSION) || null;
  const migrationVerified = yes(env.KOSIF_FINANCIAL_MIGRATION_VERIFIED);
  const schemaMatches = schemaVersion === KOSIF_ENTERPRISE_SCHEMA_VERSION;
  const readyForAuthoritativePosting = Boolean(
    financialDatabaseConfigured && schemaMatches && migrationVerified
  );

  return Object.freeze({
    ok: true,
    contractVersion: KOSIF_ENTERPRISE_CONTRACT_VERSION,
    schemaVersion: KOSIF_ENTERPRISE_SCHEMA_VERSION,
    contracts: Object.freeze({
      blueprint: 'KOSIF_Enterprise_Implementation_Blueprint.json',
      openapi: 'KOSIF_Enterprise_OpenAPI_v1.yaml',
      postgres: 'KOSIF_PostgreSQL_Financial_Core.sql',
      architectureReview: 'KOSIF_Enterprise_Master_Audit_and_Architecture_AR.md'
    }),
    authority: Object.freeze({
      numbers: 'deterministic-minor-unit-integers',
      ai: 'advisory-only',
      posting: 'human-authorized',
      auditOpinion: 'human-authorized'
    }),
    currentRuntime: Object.freeze({
      platform: 'cloudflare-worker',
      financialStorage: readyForAuthoritativePosting ? 'postgresql-financial-core' : 'legacy-d1-kv-compatibility',
      enterpriseCutoverComplete: readyForAuthoritativePosting
    }),
    financialPostgres: Object.freeze({
      configured: financialDatabaseConfigured,
      expectedSchemaVersion: KOSIF_ENTERPRISE_SCHEMA_VERSION,
      reportedSchemaVersion: schemaVersion,
      schemaMatches,
      migrationVerified,
      readyForAuthoritativePosting
    }),
    guardrails: Object.freeze({
      noFloatForAuthoritativeMoney: true,
      tenantIsolationRequired: true,
      idempotencyRequiredForMutations: true,
      auditEventRequiredForMutations: true,
      postedEntriesImmutable: true,
      reversalByNewEntry: true,
      optimisticConcurrencyRequired: true
    }),
    caveat: readyForAuthoritativePosting
      ? 'Enterprise cutover is marked verified by deployment configuration; database integration tests must remain green.'
      : 'Reference contracts are pinned, but the PostgreSQL financial core is not yet the authoritative production ledger.'
  });
}
