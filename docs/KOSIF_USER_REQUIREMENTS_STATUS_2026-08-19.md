# KOSIF — User Requirements & Problem Catalog — 2026-08-19

> Purpose: one source of truth for the problems repeatedly reported in project **حسابات ٢**, the agent/research work already present in GitHub, and the verification state of the v38.1 release. This file is not an accounting authority and does not replace SOCPA/IFRS/ISA source verification.

## Status legend
- **IMPLEMENTED** — code is present on the release branch; production still needs post-merge smoke unless explicitly noted.
- **VERIFIED MAIN** — already resolved on `main` and regression-gated.
- **BLOCKED EXTERNAL** — cannot truthfully be completed without an external/server capability.
- **VERIFY PROD** — implementation exists but must be confirmed on the deployed Worker/iPhone.

## User-visible issues

| # | Requirement / reported problem | Release state | Implementation / verification |
|---|---|---|---|
| 1 | Opening screen is visually dense and contains too much text | IMPLEMENTED · VERIFY PROD | `public/v38-user-polish.css` reduces density, strengthens hierarchy, keeps purple Kosif identity and card-based layout inspired by the Aghnam design authority. |
| 2 | Old banner: “يوجد اختلاف في مكونات الإصدار...” remains visible | IMPLEMENTED · VERIFY PROD | `v38-user-polish.js` removes the exact old warning only after `/__version` confirms a live v38 build; audit HTML also uses no-store/no-cache. |
| 3 | Settings must contain a clear “مجلس المراجعين” entry | IMPLEMENTED | Explicit settings action is injected and opens `v38-council`. |
| 4 | One place to configure OpenAI + Claude + Gemini + Z.ai | IMPLEMENTED | Secure Council card provides four providers together. Keys stay in page memory only and are not written to LocalStorage/IndexedDB. |
| 5 | Council calls fail despite entering keys | IMPLEMENTED | v38 API wrapper injects the in-memory verified key into legacy Council AI calls. |
| 6 | Fourth Council seat should be Z.ai, not an unexplained generic provider | IMPLEMENTED | UI seat is relabelled Z.ai; legacy `public-ai` fourth-seat call is routed to provider `zai` when its key is configured. |
| 7 | “أرسل إيميل الآن” should send/re-send owner password | BLOCKED EXTERNAL | Current Worker stores only `KOSIF_AI_GATE_HASH` and has no email binding/transport. v38.1 removes the misleading “تم إعادة الإرسال” claim and adds an honest button explaining that a secure mail/reset service must be configured. It does **not** pretend an email was sent. |
| 8 | Live voice/realtime does not work for user | VERIFY PROD / SERVER SECRET | Secure Realtime implementation is already present (`public/v38-live.js`, `src/v38-realtime.js`) and uses server-only OpenAI secret. Must verify Cloudflare secret/configuration and microphone/WebRTC after deploy. |
| 9 | iPhone scroll/safe-area hides controls and forces manual scrolling | IMPLEMENTED · VERIFY PROD | Uses `100dvh`, safe-area bottom padding, fixed navigation layering and viewport-aware dialogs. |
| 10 | Trial-balance confirmation appears at bottom instead of center | IMPLEMENTED · VERIFY PROD | Modal backdrop is fixed to visible viewport; modal gets centered, bounded height and internal scrolling. |
| 11 | Trial-balance/import copy is too small | IMPLEMENTED | Mobile/data-loading typography is increased in v38.1 polish CSS. |
| 12 | Clicking a standard can lead to a blank screen | IMPLEMENTED FALLBACK · VERIFY PROD | If the existing standard renderer fails/opens blank, v38.1 opens a safe fallback explanation instead of leaving a blank screen. |
| 13 | Standard explanation must show relationship to item/account | IMPLEMENTED FALLBACK | Fallback includes relation to the clicked account/card and an explicit source-authority disclaimer. |
| 14 | Standard explanation needs a simple Egyptian-Arabic example | IMPLEMENTED FALLBACK | Added practical Egyptian-Arabic examples for IFRS 15, IFRS 9, IFRS 13, IFRS 16, IAS 2, IAS 16, IAS 24, IAS 41, ISA 500/505/540/550 plus a generic fallback. |
| 15 | No reliable way back to the main Kosif suite | IMPLEMENTED | Explicit fixed `الرئيسية` control added in audit; Mafateeh reader adds `الرئيسية` and `المكتبات` controls. Existing suite bottom navigation remains. |
| 16 | Company selected from Cloudflare is not visibly reflected | IMPLEMENTED · VERIFY PROD | v38.1 keeps an active-company pill synchronized from current entity state after company/save/navigation actions. |
| 17 | Numbers must be Western digits 0-9 everywhere while labels remain Arabic | IMPLEMENTED | Display-only text conversion maps Arabic/Persian digits to Western digits without changing inputs/data values. Library covers use `2025`/`2018`. Reader gets the same display conversion. |
| 18 | Mafateeh reader/book previously did not open reliably | VERIFY PROD | `/wealth/` proxy uses the Mafateeh Worker/service binding with fallback origins and four-book bootstrap. v38.1 adds no-store HTML and explicit navigation; live route must be smoked after deploy. |
| 19 | All books should use the Mafateeh reader style/capabilities | IMPLEMENTED ARCHITECTURE · VERIFY PROD | `suite-proxy.js` retains the original Mafateeh runtime and switches prepared book data for `mafateeh`, `std2025`, `std2018`, `dipifr`; library cards all point to `/wealth/reader.html?book=...`. |
| 20 | Mix and Smart Library AI should not appear by default in books | IMPLEMENTED | Reader injection hides legacy and current selectors (`#mixerDock`, `#mixLaunch`, `.mixer-launch`, `#smartHubDock`, `#smartPebble`, `.smart-pebble`, related buttons), including dynamically reinserted controls. |
| 21 | Release/UI caching on Safari can make old UI persist | IMPLEMENTED · VERIFY PROD | audit HTML and Wealth reader HTML are served `no-cache, no-store, must-revalidate`; version reconciliation is live-version-gated. |
| 22 | Sales audit bridge numeric discrepancy / Issue #92 | VERIFIED MAIN | Issue #92 is closed as completed. Minor-unit BigInt contract is regression-gated in `v38-suite`; production workflow previously passed 16/16 bridge tests. |

## Agent/research reuse audit

### Already incorporated / canonical on main
- Deterministic accounting and minor-unit precision work from the v38 agent tracks.
- Secure OpenAI Realtime server relay and 2.1 model-family refresh lineage.
- Source-intelligence hardening and official-source catalog.
- Sales → audit bridge and its deterministic regression gate.
- Four-book library metadata and reader routing layers.
- `assets-index.json` as the current cross-agent reuse catalog.

### Review A / PR #93
PR #93 remains a **draft and non-mergeable** because its branch is stale relative to current `main`. Its useful work has been reused selectively rather than blindly merged:
- review-state concept → adopted in `governance/review-state.json` on this release branch;
- rollback registry concept → adopted in `governance/rollback-registry.json` on this release branch;
- official-source metadata → already has a newer/current counterpart on main;
- assets index → already present on main and should be kept current.

### Agent branches that should not be blindly merged
Older Realtime/platform/sales branches overlap with work already integrated into current `main`. Reuse should remain **feature-by-feature** to avoid reverting newer security, deterministic accounting, WebRTC or source-hardening changes.

## Source hierarchy / standards
The application must keep the source hierarchy already established by the project: Saudi authoritative application starts from current SOCPA adoption/updates, while IFRS/IAASB sources provide international status/history and must not be treated as automatically effective in Saudi Arabia before local adoption where applicable. The local 2025 standards book is a strong reference snapshot but does not override newer official updates.

## v38.1 release files
- `public/v38-user-polish.css`
- `public/v38-user-polish.js`
- `src/suite-edge.js`
- `src/suite-proxy.js`
- `public/libraries/index.html`
- `governance/review-state.json`
- `governance/rollback-registry.json`
- `scripts/check-v38.mjs`

## Mandatory post-merge production smoke
1. `GET /__version` → `v38.1.0-root` and build `2026.08.19-v38.1-user-polish`.
2. `GET /__health` → healthy.
3. `/audit/` on iPhone/Safari: no stale release warning; Western digits; centered demo confirmation; settings Council visible.
4. Council: four provider fields visible; no key stored in LocalStorage; provider test requires owner unlock; Z.ai fourth seat routes correctly when configured.
5. Standard click: existing renderer works or fallback explanation opens; never a blank screen.
6. `/libraries/` → four books visible with Western digits.
7. `/wealth/reader.html?book=mafateeh` → opens; Mix/Smart AI hidden by default; Home/Libraries controls visible.
8. `/wealth/reader.html?book=std2025`, `std2018`, `dipifr` → requested content identity is visible in the Mafateeh reader experience.
9. `/sales/` → still loads; no regression from suite shell changes.
10. Realtime status → verify server secret/configuration before claiming voice is working.

## Non-negotiable security note
The current owner-password system stores a password hash, not the plaintext password. A true “send my password” feature is therefore not technically or security-wise equivalent to reading the existing value back. Implementing real recovery requires a configured mail transport and a reset flow; until then the product must not display a false success message.
