# KOSIF v41.2 — unified visual system and open-source review

## Outcome

This release turns the existing v41 editorial layer into one governed visual system across the suite. It does not change accounting calculations, materiality, approval authority, company privacy, AI gates, or the Mafateeh reader's original internal shell.

The visual source of truth is now:

- warm paper, deep green ink and gold as the permanent KOSIF identity;
- one bundled Arabic font family (`KOSIF Alexandria`) with no runtime font dependency;
- a functional accent selected by the active workspace, rather than unrelated palettes per page;
- one spacing, radius, border, elevation, focus and motion language;
- immediate touch rendering on coarse pointers and iPhone-sized screens;
- bounded cinematic motion only for fine pointers when reduced motion is not requested.

## Fresh GitHub discovery pass

A fresh public-repository discovery pass produced 621 raw results and 612 unique candidates. Exactly 500 public, non-archived repositories were selected in round-robin order so no broad category dominated the review.

| Discovery category | Selected repositories |
|---|---:|
| Accounting | 75 |
| Bookkeeping | 81 |
| Financial reporting | 81 |
| Audit management | 81 |
| ERP finance | 80 |
| IFRS / XBRL | 16 |
| PWA design | 5 |
| Motion UI | 81 |
| **Total** | **500** |

The earlier machine-readable 500-repository discovery sample remains in [`KOSIF_OSS_500_SCAN_2026-08-20.json`](./KOSIF_OSS_500_SCAN_2026-08-20.json). The fresh pass validates the design and motion direction against current public, non-archived candidates; it is not a license clearance, security endorsement, popularity ranking, or claim that every repository was executed.

## Representative design-system verification

Focused source searches were also run against representative maintained systems including Fluent UI, Radix UI, shadcn/ui, Motion, Material UI, Ant Design, Shopify Polaris, Apache Superset, Metabase and Cal.com. The recurring implementation lessons adopted by KOSIF are:

| Repeated pattern | KOSIF v41.2 implementation |
|---|---|
| Semantic design tokens | `--k41-accent`, `--k41-accent-soft` and RGB companions drive each domain |
| Visible keyboard focus | one accent-aware `:focus-visible` ring with a paper separation ring |
| Reduced-motion support | all reveal and transition effects collapse to near-zero duration |
| RTL-safe layout | logical properties, right-origin reading progress and Arabic-first typography |
| Motion as feedback | reveal, sheet entrance, progress and desktop spotlight only; no authority or data state depends on animation |
| Large data surfaces | momentum table wrappers, sticky table headers and contained horizontal overscroll |
| Mobile form stability | 16px minimum control text prevents Safari focus zoom |
| Scoped observation | the editorial observer watches structural child changes only, not every attribute mutation |
| Offline reliability | local font assets and an explicitly versioned service-worker cache |

No source code or repository data was copied into KOSIF. Only architecture, interaction and accessibility patterns were synthesized.

## Attachment extraction

The supplied sales-dashboard archive contributes a useful visual vocabulary: bright indigo, violet, teal and coral; rounded analytic cards; soft depth; gradient emphasis; and short pop/fade transitions. KOSIF adopts these as bounded functional accents within its warm paper identity.

The following attachment patterns were intentionally rejected:

- network-loaded Google Fonts, because KOSIF must remain reliable offline;
- global `!important` color rewriting, because it destroys semantic states and dark mode;
- whole-document MutationObservers that continuously rewrite inline styles, because they cause layout churn and can break scrolling;
- animation on touch as a prerequisite for content visibility;
- visual calculations that could become an alternative source of accounting truth.

## Domain accents

| Workspace | Accent | Meaning |
|---|---|---|
| Daily work and library | Gold | continuity, priority and editorial navigation |
| Assurance, reports and system | Cobalt | structured analysis and controlled output |
| Evidence and standards | Teal | sources, traceability and verification |
| Review council | Plum | independent review and human judgment |
| Sales | Coral | commercial movement and exceptions |

## Runtime and regression gates

The production workflow now verifies:

- Chromium at 1366×900 across hub, audit, libraries, sales and standards;
- WebKit at 390×844 with touch across the same five routes;
- the local Arabic font, functional accent, visible heading and reading-progress bar;
- no horizontal overflow, hidden reveal surfaces, initial body lock or sub-16px mobile inputs;
- Mafateeh's original reader remains present, readable and outside the editorial shell;
- Safari launcher, legacy modal and standards-drawer scrolling preserve the page position.

## Authority boundaries

- Visual code never reads or writes audit values.
- Motion never decides readiness, risk, materiality, posting or approval.
- Deterministic accounting APIs remain the only monetary authority.
- AI output remains advisory and cannot sign, approve or replace human judgment.
- External professional conclusions still require current official-source verification.
