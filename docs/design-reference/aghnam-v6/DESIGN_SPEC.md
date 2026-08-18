# Aghnam Al-Wadi v6 — Design & Interaction Reference for Kosif

Source: user-supplied archive `لوحة_تحليل_المبيعات_أغنام_الوادي(6).zip`.

This directory is a design/interaction reference only. Do not copy sales-domain labels or business logic into Kosif. Adapt the visual system and interaction patterns to Kosif accounting/audit workflows while preserving existing deterministic calculations, privacy, Arabic RTL, accessibility, and iPhone behavior.

## Source inventory
- `index.html` + bundled app assets.
- `modules/analytics/index.html`
- `modules/crm/index.html`
- `modules/diagnostics/index.html`
- `modules/management/index.html`
- `modules/quality/index.html`
- `modules/unified-theme.css`
- `modules/unified-theme.js`

## Visual language to reproduce in Kosif
- Arabic-first RTL dashboard with right-side navigation.
- Very light background with subtle radial accent glows.
- Primary gradient: indigo/violet, commonly around `#6366f1 -> #a855f7`; pink is used as a third accent in hero areas.
- White cards with soft borders, 16–24px radii, restrained shadows, large whitespace, and strong numeric hierarchy.
- Tajawal/Arabic-friendly typography, high-weight headings, clear numeric figures, small muted support text.
- Color-coded KPI icons and status chips (green, amber, purple, cyan, rose).
- Gradient active navigation state, rounded chips/tabs/buttons, focused inputs with indigo halo.
- Tables use pale indigo headers, sticky headers where needed, hover feedback, and rounded containers.
- Modals use blurred scrims and spring-like entrance motion.

### Key source tokens
- page background: `#f8fafc`
- surface/card: `#ffffff`
- ink: `#1e293b`
- muted text: `#64748b`
- borders: `#eef2f7`
- primary indigo: `#6366f1`
- violet: `#a855f7`
- purple: `#8b5cf6`
- cyan: `#06b6d4`
- green: `#10b981`
- amber: `#f59e0b`
- rose: `#f43f5e`
- typical card shadow: `0 4px 24px -6px rgba(99,102,241,.12)`
- active/hero gradients commonly combine indigo, violet, and pink.

## Motion / interaction patterns to reproduce
Detected in the source:
- card/KPI hover lift + shadow transition.
- `unifiedPop` modal entrance (scale + translate + opacity).
- animated gradient / decorative backdrop orbs.
- floating/breathing logo and section-icon animations.
- ticker animation (`v21Ticker`).
- modal entrance animation (`v23ModalIn`).
- smooth tabs/chips/buttons with 0.2–0.3s transitions.
- animated counters / live KPI emphasis in the dashboard bundle.
- explicit `prefers-reduced-motion` handling; decorative 3D/animation must disable or simplify when reduced motion is requested.

Reference modal motion from source:
```css
@keyframes unifiedPop {
  0% { transform: scale(.85) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
```

Reference card interaction from source:
```css
.card, .kpi {
  background:#fff;
  border:1px solid #f1f5f9;
  border-radius:16px;
  box-shadow:0 4px 24px -6px rgba(99,102,241,.12);
  transition:all .3s ease;
}
.card:hover, .kpi:hover {
  box-shadow:0 12px 40px -8px rgba(99,102,241,.25);
  transform:translateY(-2px);
}
```

## 3D analytics capability detected
The bundled app contains ECharts GL/WebGL support including these series/coordinate systems:
- `bar3D`
- `scatter3D`
- `line3D`
- `surface`
- `grid3D` / cartesian 3D
- `globe`
- 3D line/effect primitives

Kosif should not add 3D for decoration alone. Use 3D only where it improves interpretation, and always provide a readable 2D/table fallback. Candidate Kosif uses:
1. Trial Balance exposure landscape — accounts/categories on X/Y and absolute balance or risk on Z.
2. Audit risk cube — account/materiality/inherent-control-detection risk dimensions.
3. Findings severity surface — area/process vs assertion vs severity/amount.
4. PBC progress landscape — request group vs status vs aging/completeness.
5. Journal anomaly scatter3D — amount, time/frequency, anomaly score.
6. Standards coverage map — workflow area vs standard family vs coverage/confidence (non-authoritative visualization only).

Any accounting totals, risk formulas, reconciliation, balance checks, Benford calculations, and journal rules must remain deterministic. 3D is a visualization layer, not an inference engine.

## Required Kosif adaptation
- Preserve current Kosif information architecture and domain labels; do not turn Kosif into a sales dashboard.
- Recreate the design system and interaction quality, not the sales data model.
- Start from the main/home experience and shared shell: typography, spacing, sidebar/bottom navigation, hero/header, cards, buttons, tables, modals, tabs, forms, loading/empty/error states.
- Preserve Arabic RTL and add correct LTR handling for numbers/codes where needed.
- iPhone/iOS Safari first: safe areas, 100dvh behavior, scrollable modal content, fixed navigation, touch targets >= 44px, no background scroll when a modal is open.
- Keep desktop responsive behavior as a secondary target.
- Add motion progressively; every motion must be cheap, cancelable, and respect `prefers-reduced-motion`.
- Avoid huge one-shot rewrites. Implement in reviewable phases.

## Phase plan
### Visual Phase A — shared design system + main shell
- Centralize tokens (colors, radius, shadows, spacing, typography, motion).
- Update app shell/navigation/home cards and KPI presentation.
- Normalize buttons, fields, tabs, tables, modals, toasts.
- No business-logic changes.

### Visual Phase B — mobile/iPhone interaction parity
- Fix every modal/sheet/overlay scroll path.
- Improve touch target size, bottom navigation, safe areas, keyboard/focus behavior.
- Test landscape/portrait and font scaling.

### Visual Phase C — analytics modernization
- Modernize 2D charts and add selective 3D analytics with 2D/table fallback.
- Lazy-load heavy 3D code; do not block first paint.
- Ensure 3D works without modifying deterministic source calculations.

### Visual Phase D — product-wide polish
- Apply system to standards reader, PBC, audit rounds, AI Council, reviewer/media/history, settings and reports.
- Unify loading/empty/error/success states and micro-interactions.

## Acceptance gates
- `git diff --check`
- `npm run build`
- `npm run check`
- existing Runtime, Deep Runtime, Production verification workflows remain green.
- No direct push to `main` from Gemini.
- No weakening/deleting tests to force green CI.
- No release/version/cache/schema churn unless independently required.
- No secret/private data in UI demos or commits.

## Implementation note
The source archive itself is not runtime-loaded by Kosif. This document captures the inspected source structure, exact design tokens, motion patterns, and detected ECharts-GL 3D capabilities so the implementation agent can adapt them to Kosif's existing architecture rather than blindly importing sales-domain code.