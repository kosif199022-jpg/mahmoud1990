# KOSIF Engineering Suite v2

KOSIF Engineering Suite is the fail-closed engineering control plane for KOSIF. It coordinates numeric integrity, source integrity, design quality, browser testing, accessibility, security, performance, observability and production release safety.

## Operating model

Priority is fixed: numeric integrity, security, compliance, source integrity, quality, then performance. A mandatory gate failure prevents the release sentinel from becoming green.

## Agents and responsibilities

- Orchestrator: coordinates all gates and stops unsafe release.
- Design Director: governs RTL, typography, spacing, responsive layout and visual consistency.
- UI Engineer: converts approved interface decisions into maintainable implementation.
- Visual QA: detects overflow, clipping, broken modals, layout drift and mobile regressions.
- Browser Tester: exercises the UI in Chromium across iPhone, tablet and desktop viewports.
- Code Auditor: rejects obvious unsafe repository conditions and secret files.
- Numeric Integrity Agent: runs deterministic golden tests against `src/engine/v38-core.mjs`.
- Source Integrity Agent: validates `config/source-registry.json` and required provenance markers in standards/runtime sources.
- Accessibility Inspector: runs axe-core and blocks serious/critical accessibility violations.
- Performance Engineer: enforces Lighthouse performance, accessibility, best-practice and Web Vitals budgets.
- Dependency Scout: produces a CycloneDX SBOM and blocks HIGH/CRITICAL Trivy findings across vulnerability, secret and misconfiguration scanners.
- Product Analytics Agent: can publish suite outcomes to PostHog when the repository secret is configured.
- Issue Router: can create a Linear issue automatically after a failed suite run when the repository secret/team variable are configured.
- Production Sentinel: independently watches the Cloudflare deployment workflow and can roll back the new Worker version when deployment succeeded but live verification failed.
- Release Sentinel: becomes green only after every mandatory engineering gate succeeds.

## Automated gates

`.github/workflows/kosif-engineering-suite.yml` runs:

1. Repository and HTML integrity.
2. Obvious secret-file rejection.
3. Deterministic accounting golden tests: Arabic number parsing, precision, double-entry enforcement, hash-chain integrity, trial balance, adjusted trial balance, materiality, misstatement aggregation, reproducible sampling, effective-date guards and Saudi VAT integer math.
4. Standards/source provenance validation with SHA-256 evidence artifacts.
5. Chromium browser smoke across three viewport sizes and horizontal-overflow checks.
6. axe-core accessibility scanning on iPhone and desktop dimensions.
7. Screenshot collection and pixel-based visual-regression comparison when approved baselines exist. If a baseline is missing, the current image is emitted as a baseline candidate artifact rather than silently becoming authoritative.
8. Lighthouse budgets for performance, accessibility, best practices, LCP, CLS and TBT.
9. CycloneDX SBOM generation and Trivy HIGH/CRITICAL filesystem scanning.
10. Final fail-closed release sentinel.
11. Optional PostHog event and Linear failure issue routing when CI credentials are configured.

## Production safety

`.github/workflows/kosif-production-sentinel.yml` watches the existing `Deploy Kosif to Cloudflare` workflow. It distinguishes a build/deploy failure from the specific dangerous case where the deploy step succeeded but the live verification step failed. Only in that latter case does it select the previous deployment's Worker version and execute `wrangler rollback`, then verify `/__health` after rollback and record the incident in the deployment-status issue.

The rollback is intentionally not triggered when build or deployment itself failed, avoiding an unnecessary rollback of a production version that was never replaced.

## Integration configuration

The code is wired for PostHog and Linear but repository credentials are not embedded in source. To activate CI reporting, configure `POSTHOG_PROJECT_API_KEY` and `LINEAR_API_KEY` as GitHub Actions secrets, plus `POSTHOG_HOST` and `LINEAR_TEAM_ID` as repository variables. Missing integration credentials do not weaken mandatory engineering gates; only the external notification is skipped.

## Visual baseline policy

Approved visual baselines live under `tests/visual-baselines/`. The first run without baselines produces candidate PNGs under the workflow artifact. A candidate must be intentionally approved and committed before pixel-diff blocking becomes active for that screenshot. The default maximum changed-pixel ratio is 2%.

## Policy and provenance files

- `config/engineering-suite.json`: machine-readable control policy and thresholds.
- `config/source-registry.json`: governed source inventory and professional-use classification.
- `artifacts/source-provenance.json`: generated hashes and marker-validation evidence.

No external professional standard is treated as authoritative solely because it appears in application code; the source registry explicitly requires official-source verification before a professional conclusion.

## Remaining platform-dependent extensions

Safari/WebKit coverage on a compatible runner and CI credential activation for PostHog/Linear remain environment-level extensions. The gates themselves are now implemented in source and GitHub Actions.
