# KOSIF Unified Product Requirements — 2026-08-20

This document is the binding implementation baseline for KOSIF after the user-selected **Kitab Caffe** visual system was adopted. It consolidates repository constraints and the standing product requirements without replacing any professional engine, privacy control, or existing capability.

## 1. Visual authority

- `public/kosif-kitab-theme.css` is the final visual authority for KOSIF.
- `public/kosif-kitab-theme.js` must keep that stylesheet last when legacy, Phase-D, Canva, analytics, reader, or dynamically injected CSS is added later.
- Core identity: warm paper/cream, espresso/coffee, and restrained gold; Arabic-first typography; correct RTL; high legibility; premium but calm hierarchy.
- The theme is a presentation layer. It must never alter accounting calculations, audit conclusions, evidence, source authority, security, persistence, or business logic.
- New UI work must extend the theme variables instead of creating another competing color/typography namespace.

## 2. Capability preservation rule

No feature may be removed merely to simplify a screen or make a visual redesign easier. KOSIF must retain and improve the existing accounting, audit, standards, libraries/readers, reviewer/media, history, privacy/security, reporting, evidence, source-intelligence, AI Council, live/realtime, PWA, and sales-analysis capabilities already present in the repository.

When older implementations and newer implementations overlap, preserve the newest tested implementation unless a semantic comparison proves that an older branch contains a missing capability that can be ported safely.

## 3. Deterministic accounting authority

- Financial amounts, totals, reconciliations, materiality calculations, ratios used as audit facts, adjusting-entry arithmetic, financial-statement equations, and other numeric facts must come from deterministic code.
- Use the repository's minor-unit/integer accounting core where available. Do not introduce floating-point equality as an accounting control.
- Language models may explain, classify proposals, draft narrative, surface risks, or recommend procedures; they must not originate authoritative financial numbers.
- Posted/approved accounting records and audit evidence must retain traceability and human approval requirements.

## 4. Audit and assurance integrity

Preserve the existing professional flow: TB ingestion and validation, PBC, analytics, reconciliations, risk and findings, adjusting entries, financial-statement drafting, evidence graph, audit opinion logic, reporting, reviewer workflow, and history.

Audit conclusions must stay evidence-linked. AI output is advisory unless explicitly accepted through the governed human workflow. Security or audit gates must never be weakened to make CI pass.

## 5. Standards and source governance

- Prefer the latest verified official Saudi/SOCPA/IFRS source applicable to the engagement.
- The prepared 2025 standards content is the primary local professional reference when it is the latest locally available verified source.
- 2018 content is historical/reference material, not the default authority when a later applicable source exists.
- DipIFR/training material remains training material and must not be represented as an authoritative source.
- Source refresh and custom-source behavior must stay allowlisted/governed; citations or explanations must not be fabricated when authoritative text is unavailable.
- Preserve source provenance, date/version, jurisdiction, and authority metadata.

## 6. Libraries and reader

KOSIF must preserve the prepared library identities and their source classification, including:

- Mafateeh / مفاتيح الثروة
- Standards 2025
- Standards 2018
- DipIFR training

The Mafateeh reader remains the capability-rich reading experience. Prepared books may reuse the reader/runtime where compatible, while the source-authority classification remains independent from the visual reader shell. Existing search, progress, reader tools, audio where available, notes, offline/mobile behavior, and professional-reader capabilities must not be silently removed.

## 7. Sales and operational analytics

The sales workspace remains a general deterministic operational-analysis module, not a replacement for the accounting ledger. Imported sales data, profitability metrics, CRM/quality/management views, diagnostics, and audit bridges may feed governed analytics, but financial/audit facts must continue to use deterministic calculations and traceable data.

## 8. Arabic, RTL, mobile, iOS, and accessibility

- Arabic is the primary UI and RTL must be correct end-to-end.
- iPhone/iOS Safari is a release-critical target: safe areas, dynamic viewport, modal/sheet scrolling, body scroll lock, touch targets, fixed navigation, reader scrolling, and PWA caching must be tested.
- Maintain responsive desktop and Android behavior.
- Maintain keyboard focus, labels, contrast, reduced-motion support, and reachable controls.
- Font-size controls or dynamic typography must not break layout or hide actions.

## 9. Privacy and security

Preserve owner-session gates, provider-key verification, trusted-library filtering, device/library privacy boundaries, same-origin/API protections, source allowlists, and secret handling. Never put API keys, tokens, credentials, private uploaded documents, customer data, or private state into commits, logs, public diagnostics, or generated source exports.

## 10. Multi-agent / branch assimilation policy

Agent branches are research and implementation candidates, not automatic truth.

1. Compare each candidate branch semantically against current `main`.
2. If the branch is fully behind current `main`, treat its work as already superseded unless evidence shows otherwise.
3. For diverged branches, inspect the actual changed files and port only improvements that remain valid against the current architecture.
4. Do not wholesale merge stale branches that would revert security, deterministic accounting, source governance, mobile fixes, or later v38 work.
5. Reject code that introduces floating financial arithmetic, fabricated standards data, weaker privacy, unverified AI authority, or incompatible parallel state/modal/persistence systems.

## 11. Repository and release gates

- `npm run build` and `npm run check` are required regression gates.
- Existing checks covering syntax, payloads, source-export integrity, legacy regressions, contracts, UI safety, mobile, analytics, product polish, history, security, privacy, accounting, audit, libraries/sales, and the v38 suite remain meaningful.
- Add new checks rather than disabling old ones.
- Do not claim a gate passed unless CI or an equivalent executed check actually passed on the exact commit.
- Production deployment should only use a validated commit and must retain a rollback path.

## 12. Development precedence

When requirements conflict, use this precedence:

1. Numeric/accounting correctness
2. Security and privacy
3. Professional/audit compliance
4. Source authority and provenance
5. Data integrity and traceability
6. Accessibility and mobile reachability
7. Product capability preservation
8. Visual consistency and polish
9. Performance and implementation convenience

The Kitab Caffe visual system is therefore the **design authority**, while the deterministic accounting/audit/security/source engines remain the **functional authority**.
