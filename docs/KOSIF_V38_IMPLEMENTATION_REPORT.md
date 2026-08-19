# KOSIF v38 — Trusted Audit Intelligence OS

Build: `38.0.0` — `2026.08.19-v38-trusted-audit-os`

## What changed

KOSIF v38 turns the existing audit application into a layered audit/accounting intelligence system while retaining the existing Cloudflare Worker deployment model.

The governing rule is:

> Computation, posting guards, reconciliations, sampling inputs, materiality thresholds and accounting invariants are deterministic. AI may analyze, challenge, explain, extract and draft, but does not silently post a journal, calculate an accountable final amount, or issue the final audit opinion. Human approval remains required.

## Trusted Core

New deterministic module: `src/engine/v38-core.mjs`.

Implemented capabilities:

- Arabic/Persian digit normalization.
- Exact decimal-to-minor-unit parsing without float-dependent accounting arithmetic.
- Journal validation and balance checks.
- Immutable posted-entry representation and reversal entries.
- Trial balance and adjusted trial balance.
- Risk-aware materiality outputs.
- ISA 450-style misstatement aggregation.
- Deterministic journal risk flags.
- Reproducible deterministic sampling.
- Accounting invariants.
- Period-aware framework applicability metadata, including IFRS 18 readiness and ISA 240 revised readiness.

Owner-gated HTTP APIs are exposed under `/api/kosif/v38/accounting/*` and `/api/kosif/v38/framework/*`.

## Evidence Graph

New modules:

- `src/engine/v38-evidence-graph.mjs`
- `public/v38-evidence-graph.js`

The graph can link accounts, journal entries/lines, documents, evidence, risks, procedures, findings, adjustments, controls, standard references, AI opinions, human decisions and PBC requests.

Lineage is navigable from the audit UI. Edges are queued until all graph nodes are registered so evidence-to-finding and finding-to-standard links are retained even when records arrive in different orders.

## Audit Council v3

New UI: `public/v38-council-v3.js`.

Council members:

1. OpenAI
2. Claude
3. Gemini
4. Public / Local API provider
5. Human Reviewer

Workflow:

1. Each AI member receives the same evidence task independently (blind round).
2. Returned objects are normalized to a strict audit-assistance contract.
3. Forbidden authority fields are removed (`calculated_materiality`, `final_opinion`, `approved_adjustment`, `posted_entry`).
4. KOSIF creates a deterministic agreement/conflict/evidence-gap matrix.
5. A challenge round may be run without exposing model identities as a persuasion signal.
6. The human reviewer records the final action and rationale.

The application does not convert a 3/4 or 4/4 AI vote into an approval.

## OpenAI Live

New modules:

- `public/v38-live.js`
- `src/v38-realtime.js`

The implementation uses WebRTC and the OpenAI Realtime call endpoint. The OpenAI key must first pass the owner's provider connection test. The key stays in page memory and is passed through the Worker for the realtime SDP exchange; it is not written to localStorage by the v38 integration.

The default realtime context is an engagement summary rather than the full ledger. Live AI is advisory and cannot approve journals or opinions.

Text/council OpenAI requests use the Responses API path already present in the KOSIF provider adapter.

## Public / Local AI provider

New module: `src/public-ai-provider.js`.

The fourth council AI provider can point to an OpenAI-compatible or local gateway configured only by server environment variables. The browser cannot provide a base URL, preventing the feature from becoming a generic SSRF proxy.

Supported environment configuration:

- `KOSIF_PUBLIC_AI_BASE_URL`
- `KOSIF_PUBLIC_AI_ALLOWED_HOSTS`
- `KOSIF_PUBLIC_AI_MODE=responses|chat_completions`
- `KOSIF_PUBLIC_AI_MODEL`
- `KOSIF_PUBLIC_AI_KEY` (secret)

## Source Intelligence Fabric

New modules:

- `src/v38-source-intelligence.js`
- `public/v38-source-fabric.js`

Features:

- Official-first source registry with trust tiers.
- Core sources from IFRS Foundation, IAASB, SOCPA, ZATCA, NCA, SDAIA, NIST, W3C, OpenAI, Anthropic, Google Gemini, GitHub, Crossref and arXiv.
- Version/status metadata for key standards and projects.
- HTTPS-only fetching.
- Blocks credentials in URLs, IP hosts, localhost/internal hosts, non-standard ports and unsafe redirects.
- Maximum 256 KB content sample for change hashing; no automatic full-text mirroring.
- Prompt-injection-suspicion marker for fetched source samples.
- Content hash, ETag, Last-Modified, final URL and check timestamp.
- Change detection against the previous version.
- Bounded version history (up to 50 stored metadata versions per source).
- Registry capacity of 5,000 custom curated sources.
- Bulk source onboarding in batches of up to 500 per request / 5,000 total.
- Custom bulk sources are forced to Tier D and metadata-only by default and cannot override reserved core source IDs.
- Network refresh is deliberately throttled to at most 20 targets per request with concurrency 4; the design intentionally avoids an uncontrolled crawler.

## Reviewer notes

The Reviewer workspace now includes structured notes with:

- type;
- linked account/journal/finding/evidence reference;
- text;
- status;
- tags;
- timestamp;
- human-reviewer actor.

Notes are saved to server KV when an owner session is available (`/api/kosif/v38/reviewer-notes`) with local fallback for offline/session continuity. Existing note IDs are not silently overwritten by the server API.

## Synthetic Audit Lab

Generator: `scripts/generate-v38-demo.mjs`.

Seed: `380019`.

All records are synthetic. The pack includes no real personal data and no licensed standards full text.

Current generated coverage:

- 1,000 accounts.
- 25,012 balanced journal entries.
- 65,165 GL lines.
- 1,200 customers.
- 600 suppliers.
- 8,670 sales invoices.
- 5,436 purchase invoices.
- 2,950 bank transactions.
- 500 employees.
- 1,000 fixed assets.
- 2,000 inventory SKUs.
- 100 leases.
- 200 customer contracts.
- 120 audit risks.
- 100 controls.
- 150 PBC requests.
- 300 evidence-manifest records.
- 83 standards/audit/local-regulatory scenarios.
- 83 synthetic audit-program procedures.
- 400 confirmations.
- 40 related-party records.
- 25 financial-statement lines / IFRS 18-ready mapping layer.
- 12 seeded professional findings and 12 corresponding misstatement-register records.
- VAT and bank reconciliation fixtures.

Trial balance debit and credit are both SAR 33,913,039,936.55 with a zero difference.

The standard scenario catalog spans IFRS/IAS, ISA, ISQM, COSO, SOCPA, ZATCA, NCA and SDAIA topics. This is a synthetic regression catalog; it is not a claim that every paragraph of every standard is encoded as an executable rule.

## UX, RTL and visual system

New v38 visual assets:

- `public/v38-ultimate.css`
- `public/v38-ultimate.js`
- redesigned `public/icon.svg`

Design changes:

- RTL-first navigation and audit workspace.
- Right-side desktop audit rail with mobile fallback.
- Clear separation of FACT / SOURCE / AI ANALYSIS / HUMAN DECISION.
- Semantic icon system for evidence, findings, risks, council, human decision and source intelligence.
- Navy/gold trust-oriented identity with semantic risk colors.
- IBM Plex Sans Arabic-oriented font stack and tabular number treatment; no font binaries bundled.
- Dedicated workspaces instead of using modal dialogs for large audit tasks.
- Source Intelligence, Audit Council, Live AI, Evidence Graph and Synthetic Audit Lab as first-class screens.
- PWA service worker updated for v38 and configured not to cache API responses or large demo datasets.

## Existing standards/books retained and verified

The deep audit verifies the prepared KOSIF standards datasets are internally consistent:

- b1: 66 chapters / 452,855 words / 66 packaged chapters.
- b3: 34 chapters / 649,318 words / 34 packaged chapters.
- b2: 139 chapters / 136,572 words / 139 packaged chapters.
- b4 development: 46 chapters / 34,700 words / 46 packaged chapters.

The reader isolation, TTS, highlighting, wake lock, auto-scroll, chapter navigation, professional indexing rules and Saudi/official-source prioritization gates remain intact.

## RAR attachment catalog

`docs/RAR_ATTACHMENT_CATALOG_2026-08-19.json` indexes metadata for both user-provided RAR archives:

- `1(2).rar`: 53 file entries.
- `2(3).rar`: 37 file entries.

The build environment could list the RAR directory metadata but did not have a compatible RAR decompression backend. Therefore KOSIF v38 does **not** claim that the PDF/book contents inside those RAR files were text-reviewed in this build. Their titles/sizes/hashes are indexed so they can be reviewed later without losing provenance.

## Verification performed

`npm run check` passes after the v38 changes.

Latest deep-audit summary:

- Files scanned: 503.
- Missing referenced static assets: 0.
- Critical failures: 0.
- Legacy deterministic engine: 32 passed / 0 failed.
- v38 deterministic core: 12 passed / 0 failed.
- v38 Evidence Graph test: PASS.
- v38 owner API integration test: PASS.
- v38 synthetic dataset validation: PASS.
- v38 platform architecture/security gate: PASS.
- v38 Worker/runtime mock smoke: PASS for hub, audit shell, Evidence Graph asset, demo manifest, capabilities API and standards registry API.

A real Cloudflare `wrangler deploy --dry-run` was not executed because the local Wrangler executable was not installed in this isolated build environment. The project imports `src/suite-edge.js` successfully under Node and the Worker routing smoke test passes with mocked KV/Assets. Deployment should still run the normal Wrangler dry-run/preview in the actual deployment environment before production publication.

## Research-derived implementation references

Primary references used to drive design decisions include the official IFRS Foundation, IAASB, SOCPA, ZATCA, NCA, SDAIA, NIST, W3C, OpenAI, Anthropic and Gemini documentation. Open-source projects were used for design comparison only (for example ERPNext, Odoo, GnuCash, OpenMetadata, Langfuse and Great Expectations); KOSIF's audit governance rules are not delegated to them.

No external provider connection was live-tested in this build because no user API keys were embedded in the build environment. The provider test endpoints and runtime gates are implemented and covered structurally; live OpenAI/Claude/Gemini/Public-API validation requires valid credentials at deployment/use time.
