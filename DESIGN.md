# KOSIF Visual & Motion Identity

KOSIF uses one governed presentation system across the suite. The canonical design data lives in `config/design-tokens-v44.json`; the runtime compatibility and shared UI layer lives in `public/kosif-master-theme.css` and must be loaded last after module-specific styles.

The older `kosif-suite-v40.css`, `kosif-editorial-v41.css`, `v38-ultimate.css`, `v38-user-polish.css`, `kosif-kitab-theme.css`, sales styles, and library styles remain compatibility/module layers while they are gradually migrated. They are not independent design authorities.

## Source-of-truth hierarchy

1. `config/design-tokens-v44.json` — canonical values for color, typography, spacing, radius, shadow, motion, layout, and breakpoints.
2. `public/kosif-master-theme.css` — canonical runtime CSS variables, legacy aliases, accessibility/responsive safeguards, and reusable primitives.
3. Module CSS — layout and domain-specific presentation only. It should consume `--kosif-*` variables instead of creating a parallel palette or spacing system.
4. `DESIGN.md` — human-readable rules for implementation, motion, review, Remotion, HyperFrames, Canva/Figma work, and future templates.

## Required load order

For KOSIF-owned HTML surfaces, load fonts first, then legacy/module styles, then `kosif-master-theme.css` last. The audit shell performs this injection in `src/suite-edge.js`. The hub, libraries, and sales entry pages include the master theme directly.

Do not place new global overrides after the master theme without an explicit design-system change.

## Style Prompt

KOSIF is a trusted Saudi audit-intelligence workspace: calm, authoritative, editorial, highly legible, and premium without visual noise. Motion reinforces hierarchy and comprehension. Arabic-first layouts must remain RTL-correct, mobile-safe, accessible, and deterministic. Financial evidence and numeric meaning always take priority over decoration.

## Colors

- `#102825` — ink
- `#081B19` — strong ink
- `#FFFCF5` — paper
- `#F7F0E2` — soft paper
- `#6F746C` — muted text
- `#D7AE58` — gold accent
- `#A97822` — strong gold
- `#315BE8` — cobalt / focus
- `#0B8B7C` — teal
- `#D8654D` — coral / alert accent

New CSS must reference the canonical `--kosif-*` custom properties rather than duplicating these hex values. Hard-coded values are acceptable only for narrowly scoped derived effects that cannot reasonably use a token.

## Typography

Primary family: `KOSIF Alexandria, Alexandria, SF Arabic, Noto Sans Arabic, Tahoma, system-ui, sans-serif`.

Use tabular numerals for financial values. Never trade numeric legibility for decorative typography. New screens should inherit `--kosif-font` and the canonical size/line-height variables.

## Spacing & Shape

- Spacing follows the v44 token rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.
- Radius: 10px / 16px / 24px / pill.
- Content max width: 1240px.
- Reading measure: 72ch.
- Minimum touch target: 44px.
- Use logical CSS properties for RTL/LTR compatibility.

For new screens, prefer the shared primitives `.kosif-container`, `.kosif-reading`, `.kosif-surface`, `.kosif-card`, `.kosif-stack`, `.kosif-cluster`, `.kosif-grid`, and `.kosif-action` before inventing a new generic component pattern.

## Motion Rules

- Fast UI motion: 120ms.
- Normal UI motion: 220ms.
- Slow/cinematic UI motion: 420ms.
- Cinematic composition entrances may extend to 500–900ms when legibility benefits.
- Preferred curves: `cubic-bezier(.2,.78,.2,1)` and `cubic-bezier(.16,1,.3,1)` or equivalent GSAP/spring behavior.
- Prefer opacity + short translate + subtle scale. Avoid large spins, elastic bounces, and distracting loops.
- Final layout is the source of truth; animate into it rather than positioning by animation.
- Rendered motion must be deterministic. No random timing or time-dependent visual state.
- Never animate accounting numbers in a way that implies a different value.
- Respect `prefers-reduced-motion`; the master theme provides the baseline product fallback.

## Responsive & Accessibility

- Arabic is default and RTL-safe.
- Maintain clear focus, contrast, and text hierarchy.
- Do not rely on color alone to communicate audit severity or status.
- Avoid horizontal overflow at 320–430px mobile widths.
- Keep captions and critical labels inside safe margins.
- Modal content must scroll independently while the page behind it remains locked. The master theme provides a baseline for native dialogs and ARIA modal dialogs; custom modal implementations must preserve equivalent behavior.
- Tables and wide evidence structures must remain usable on narrow screens without forcing the whole document to overflow horizontally.

## Migration rules

When touching an existing legacy stylesheet, migrate the values you edit to `--kosif-*` variables. Do not perform mass visual rewrites solely to remove old variable names; the master theme aliases v40/v41/`--ke-*` variables so the migration can be incremental and reviewable.

A module may own unique layout, data visualization, or domain-specific states, but it must not create a second global typography, base palette, spacing rhythm, focus style, or motion language.

Accounting calculations, audit opinions, approval state, security rules, standards authority, and evidence semantics are outside the design layer. A styling change must never alter them.

## What NOT to Do

- No generic SaaS-blue visual system that overrides the governed tokens.
- No excessive glassmorphism, 3D rotation, parallax, or looping ambient movement.
- No hard-coded left/right assumptions for Arabic UI.
- No animation that obscures, changes, delays access to, or visually distorts financial evidence or audit conclusions.
- No separate motion palette or typography outside the governed design tokens without an explicit design-system change.
- No new global stylesheet that competes with `kosif-master-theme.css`; extend the master theme or keep changes module-scoped.
