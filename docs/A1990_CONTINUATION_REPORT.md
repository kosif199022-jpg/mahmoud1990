# A1990 — Kosif Continuation Report

Updated: 2026-08-18

## Current visual state

- Visual Phase A: merged.
- Visual Phase B (iPhone/Safari, modals, safe areas, keyboard and scrolling): merged in PR #48.
- Visual Phase C (interactive analytics and selective 3D with deterministic-data-only sources plus 2D/table fallback): merged in PR #49.
- Visual Phase D (product-wide Aghnam-inspired polish): merged in PR #50 as `ee8c63c4681f938e6c084cf35a613cb8bf2d95e8`.
- Kosif v37 prepared-book Safari isolation: merged in PR #75 as `e13d0ec5393c57270f7ad582a3744c18360cf0f0`.

Phase D applies the shared visual system to the main Kosif shell and the Standards Reader, including PBC, audit rounds, AI Council, reviewer/media/history, settings, reports, tables, inputs, cards and loading/empty/error/success states. It preserves Arabic RTL, reduced-motion handling, dark mode, iPhone Phase B behavior and the existing deterministic accounting/audit/standards logic.

The v37 reader boundary keeps Mafateeh in its original `/wealth/reader.html` runtime while routing the prepared books `std2025`, `std2018`, and `dipifr` into the first-party `/libraries/reader.html` runtime. Legacy prepared-book Wealth links migrate out of the Mafateeh runtime, shared `D/CH` mutation is no longer part of the prepared-book correctness boundary, and stale Safari Wealth service-worker/cache state is explicitly retired for prepared-reader entry.

## Deployment target

Cloudflare Worker: `mahmoud-eldesouky` (as declared in `wrangler.toml`).

The deployment workflow runs `npm run build` and `npm run check` before `wrangler deploy`, then verifies the live Kosif suite and prepared-book isolation routes.

The first v37 production verification run deployed the Worker and all new reader assets successfully, but its immediate post-deploy route probe observed `/libraries/reader.html` as `404` while the fresh static asset generation was still propagating. This documentation-only commit intentionally retriggers the same production workflow after propagation so the live verification can re-check the already-uploaded assets without changing accounting, audit, standards content, or deterministic business logic.
