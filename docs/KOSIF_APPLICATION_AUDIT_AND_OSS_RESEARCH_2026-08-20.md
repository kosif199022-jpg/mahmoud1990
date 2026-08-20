# KOSIF application audit and open-source research — 2026-08-20

## Executive outcome

This review converted the Kitab Caffe reference into a KOSIF-specific visual system without copying the reference site's content or assets. KOSIF Studio v40 retains the warm editorial base, adds bounded cobalt/teal/coral/violet/gold accents, introduces an original audit hero, a searchable capability center, a real installable PWA surface, a shared visual layer for hub/libraries/sales/standards, deterministic report visualizations, and a clearer three-stage reviewers council. Trial-balance totals remain sourced from the exact BigInt API, text chat remains memory-only with opt-in context and consent, and human approval remains non-automatable.

The accompanying machine-readable sample is [`KOSIF_OSS_500_SCAN_2026-08-20.json`](./KOSIF_OSS_500_SCAN_2026-08-20.json).

## Material reviewed

- Git history, current `main`, the existing Kitab Caffe pull-request branch, workflow runs, changed files, and review state.
- Four source archives: Mafateeh v12, Mafateeh v13, the four-book v36 reader, and Mihakk Saudi Audit v6.
- The standalone `reader(1).html` variant.
- Eleven supplied PDFs, including the SOCPA endorsement document revised 24 December 2025 and the IFRS for SMEs application-guidance sections listed below.
- The KOSIF Worker, security edge, suite edge, public assets, deterministic v38 engine, tests, service worker, reports, calculators, evidence graph, council, reader routes, sales bridge, and live voice path.
- An exactly 500-repository, de-duplicated GitHub discovery sample across eight relevant categories.

## Reference-site design extraction

The Kitab Caffe reference was inspected in a rendered browser because its ordinary HTTP response is protected by an anti-bot challenge. The relevant reusable design language is:

| Element | Observed reference | KOSIF adoption |
|---|---:|---|
| Page background | `#FBF4E1` | Primary warm-paper surface |
| Primary ink | near `#1A1610` | Espresso text and dark hero |
| Accent | `#F5A623` | Calls to action, focus, status emphasis |
| Muted text | near `#5A4A3A` | Supporting copy |
| Main radius | about `22px` | Cards, reports, dialogs |
| Pill radius | about `100px` | Buttons, chips, filters |
| Typography | IBM Plex Sans Arabic | Local Alexandria first for offline reliability, with Arabic system fallbacks |
| Composition | centered hero, generous whitespace, light cards, dark footer | Warm, restrained professional audit layout |

KOSIF keeps its own product identity, accessibility, audit semantics, and offline font assets. No Kitab Caffe image, copy, logo, or proprietary asset was copied.

## Previous-release and attachment findings

### Mafateeh v12, v13, v36 and standalone reader

- v12 contains the mature base reader, notes and core audio/export capabilities.
- v13 adds reader-studio and format/export improvements, including Markdown, notebook, backup JSON, PDF-oriented export and broader audio workflows.
- the four-book v36 archive is the broadest reader implementation: four-book switching, smart library, TTS/Piper, offline audio banks, mixer/ambience, PDF Book AI, export and mobile fallbacks.
- the original Mafateeh reader state and `mk_` LocalStorage keys are an important continuity contract. KOSIF must not replace that reader with a visually isolated fork.
- internal mixer/smart-library docks remain hidden by default in the shared-reader verification flow; Mafateeh remains the default book.

### Mihakk Saudi Audit v6

Useful patterns: strong sidebar information architecture, report progression, reviewer-council presentation and completion-oriented UX.

Rejected implementation detail: its financial calculations use JavaScript `Number`, floating-point accumulation and approximate comparisons. Those patterns are not suitable for KOSIF's monetary authority layer and were not ported.

### Supplied professional PDFs

| Supplied material | Role in KOSIF |
|---|---|
| SOCPA IFRS/IFRS for SMEs endorsement document, revised 2025-12-24 | Highest-priority supplied applicability/endorsement reference; still verify against the current official source at use time |
| IFRS for SMEs section 1 — entity description | Framework/applicability guidance; explicitly not a substitute for the adopted standard |
| Section 2 — accounting concepts | Conceptual and recognition/measurement guidance |
| Section 3 — financial-statement presentation | Report structure and presentation checklist input |
| Section 4 — statement of financial position | Presentation/disclosure checklist input |
| Section 5 — comprehensive income/income statement | Presentation/disclosure checklist input |
| Section 6 — changes in equity / income and retained earnings | Presentation/disclosure checklist input |
| Section 7 — cash-flow statement | Cash-flow presentation checklist input |
| Section 8 — notes to the financial statements | Disclosure-completeness checklist input |
| Section 10 — policies, estimates and errors | Policy-change and correction workflow input |

Two supplied copies of section 1 are byte-identical (`SHA-256 7af659…e6574`) and are treated as one source. The application-guidance PDFs themselves state that they do not replace the adopted standards, so KOSIF must label them as explanatory material rather than authority.

## 500-repository research method

The scan used GitHub repository search, de-duplicated by repository full name and selected in round-robin order so one broad query could not dominate the sample.

| Category | Repositories |
|---|---:|
| Accounting | 69 |
| Audit management | 69 |
| ERP finance | 69 |
| Financial reporting | 69 |
| IFRS / XBRL | 20 |
| Bookkeeping | 68 |
| PDF reader / PWA | 68 |
| Realtime chat / support | 68 |
| **Total** | **500** |

This is a discovery sample, not an exhaustive census, security endorsement, popularity ranking, or license clearance.

## Representative systems and lessons

| Repository/family | Relevant lesson | KOSIF decision |
|---|---|---|
| Akaunting | Modular accounting applications and API surface | Keep capability boundaries explicit |
| Frappe Books / ERPNext | Central financial records shared across operational modules | Preserve one engagement state and avoid duplicate silos |
| Odoo | Broad modular ERP architecture | Use bounded modules, not a monolithic screen |
| Bigcapital | Headless accounting and statement/report separation | Treat deterministic data APIs as report inputs |
| GnuCash, Ledger, hledger, Beancount | Durable accounting models and precise, exportable records | Keep monetary truth outside visual/report code |
| LedgerSMB | Workflow-oriented accounting controls | Expose completion and human-approval gates |
| OCA financial reporting | Separate reusable report components and exports | Report model is independent from presentation/export |
| XBRL US CAFR / iXBRL Reporter | Taxonomy-driven machine-readable reporting | Retain as a future module after standards and taxonomy validation |
| CISO Assistant | Linked objects, evidence/control reuse, API-first architecture | Strengthen KOSIF's evidence graph instead of duplicating findings |
| GLPI / audit management systems | Operational queues, assignment and status visibility | Use visible readiness/open-state workflow |
| Murmur TTS Reader | Multiple engines, offline PWA, word highlighting and queued audio | Preserve Mafateeh's multi-engine/offline direction |
| Yuki Reader / PDFark | Focused reader experience and local-first document handling | Keep reader concerns isolated from audit authority |
| Basement Chat | Presence/typing/read-state patterns and CSS isolation | Adopt typing state, retry and isolated chat UI; defer multi-user presence |
| AIRI and realtime chat examples | Provider abstraction and realtime interaction | Use a server relay and provider abstraction, never browser secrets |

No source code was copied from these repositories. The review adopted architectural and UX ideas only; any future code reuse must be assessed repository-by-repository for license, security and provenance.

## Defects resolved in this change

1. **Report field mismatch:** the report read `dr/cr` while the base trial balance stores `debit/credit`, producing zero totals. Both schemas are now normalized.
2. **Report floating-point authority:** totals and balance checks used `Number`, rounding and a tolerance. A new `/accounting/trial-balance-summary` route parses and sums minor units with BigInt and returns an exact difference.
3. **Unsafe report materiality display:** the report converted minor units through division and re-rounding. It now formats returned minor-unit strings directly and refuses to invent a value when only a percentage configuration exists.
4. **No completion gate:** the report now shows entity, trial-balance, balance, materiality, procedures, findings and human-approval gates.
5. **AI authority ambiguity:** generated draft text is explicitly advisory; opinion/sign-off cannot be inferred or passed automatically.
6. **Missing text live chat:** the live area now includes a memory-only text conversation, quick prompts, typing state, retry, manual export, clear, optional limited context and explicit consent.
7. **Provider prompt governance:** public/local AI receives immutable server-side system instructions separating untrusted user/context data from authority rules.
8. **Calculator trial-balance mismatch:** v38 ratios now recognize both `debit/credit` and `dr/cr` schemas.
9. **Bank-reconciliation DOM collision:** the outstanding-cheques input and output container no longer share one ID.
10. **VAT/Zakat precision regression in UI:** raw decimal strings are sent to the deterministic endpoints and returned minor-unit strings are formatted without conversion to `Number`.
11. **Desktop navigation regression:** the final theme authority explicitly hides the mobile nav and restores desktop tabs from 1024px upward.
12. **Theme-toggle fragility:** a fallback observes theme-control clicks and acts only when the existing app handler made no change.
13. **Duplicate theme link risk:** the audit shell now declares the theme stylesheet before its runtime, preventing a second same-ID link during parsing.
14. **Stale production workflow identity:** the production check now accepts the current editorial visual build ID.
15. **Late Canva Rose override:** the legacy pink stylesheet was loading after the warm theme and winning the cascade. The final runtime import now targets `kosif-studio-v40.css`, the audit shell preloads the generated v40 hero, and CI rejects the old rose palette.
16. **Stale visual service-worker cache:** the root PWA cache generation is now `kosif-native-v40-studio-app`, with the v40 CSS/JS, manifest, icons and generated imagery required before activation.
17. **Installability gap:** the root app now ships standard 192/512/maskable icons, manifest shortcuts, an explicit Service Worker registration path, a browser install prompt, standalone detection and iOS-specific add-to-home-screen guidance.
18. **Capability sprawl:** all existing screens remain present but are additionally exposed through a five-domain searchable launcher with keyboard navigation, focus trapping and mobile sheet behavior.
19. **Report readability:** the governed report now includes an explicitly non-opinion readiness percentage and deterministic SVG charts derived from exact minor-unit values and recorded finding counts.
20. **Council ambiguity:** the Council now displays blind review, deterministic matrix and human decision as separate stages; its human-record button remains disabled until a matrix exists.

## Deliberate boundaries and follow-up work

- Legacy v36 import and several non-authoritative analytical calculators still use `Number`. They must not be treated as the monetary ledger of record. A later migration should move import normalization and each monetary calculator into deterministic minor-unit APIs one domain at a time.
- Full XBRL/iXBRL output is not enabled; taxonomy, jurisdiction, versioning and validation requirements need a dedicated governed module.
- Text chat is a single-user advisory assistant. Multi-user presence, assignment, read receipts and retention require an explicit collaboration/data-retention design and are intentionally not simulated.
- The supplied standards material is integrated as reviewed context and labeling guidance, not silently promoted to a current official authority. Current professional use must re-verify source status.

## Non-negotiable invariants

- Exact monetary truth is deterministic and traceable.
- Company and AI operations remain owner/session gated.
- Browser API keys are not persisted.
- AI cannot approve entries, materiality, audit opinions or sign-off.
- Mafateeh remains the default original reader and its continuity/state contract is preserved.
- Any external professional use requires current official-source verification and human review.
