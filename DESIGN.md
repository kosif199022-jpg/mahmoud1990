# KOSIF Visual & Motion Identity

This file is the source of truth for Remotion and HyperFrames work. It follows the governed v44 design tokens in `config/design-tokens-v44.json` and must not introduce a parallel visual language.

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

## Typography

Primary family: `KOSIF Alexandria, Alexandria, SF Arabic, Noto Sans Arabic, Tahoma, system-ui, sans-serif`.

Use tabular numerals for financial values. Never trade numeric legibility for decorative typography.

## Spacing & Shape

- Spacing follows the v44 token rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.
- Radius: 10px / 16px / 24px / pill.
- Content max width: 1240px.
- Reading measure: 72ch.
- Minimum touch target: 44px.
- Use logical CSS properties for RTL/LTR compatibility.

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

## Responsive & Accessibility

- Arabic is default and RTL-safe.
- Respect `prefers-reduced-motion` in product UI and provide reduced-motion alternatives where relevant.
- Maintain clear focus, contrast, and text hierarchy.
- Do not rely on color alone to communicate audit severity or status.
- Avoid horizontal overflow at 320–430px mobile widths.
- Keep captions and critical labels inside safe margins.

## Runtime Design Hierarchy

KOSIF uses one governed presentation hierarchy. New visual work must extend it instead of creating a new independent theme:

1. `config/design-tokens-v44.json` — canonical machine-readable values for color, typography, spacing, radius, shadow, motion and layout.
2. `public/kosif-fonts-v45.css` — single bundled font authority shared by all shells.
3. `public/kosif-master-theme.css` — final runtime compatibility and shared-primitives layer for the hub, audit workspace, libraries and sales surfaces.
4. Module CSS such as `suite.css`, `suite-shell.css`, `kosif-suite-v40.css`, `kosif-editorial-v41.css`, `v38-ultimate.css`, `libraries/libraries.css` and `sales/sales.css` — module-specific layout and transitional compatibility only.

The production release identity remains the established v41 contract while the master theme is introduced incrementally. Changing visual-layer version labels must not silently break deployment/runtime gates that protect the existing release contract.

### Required load order

Load foundational/module styles first and `kosif-master-theme.css` last wherever the master layer is enabled. This lets canonical `--kosif-*` tokens govern shared presentation without deleting stable module rules.

The `/wealth/` Mafateeh reader is an explicit exception: preserve its reader-specific visual contract unless a reader migration is separately reviewed and approved.

### Migration rules

- New shared UI should use `--kosif-*` variables and the `.kosif-*` primitives where appropriate.
- When touching an existing v40/v41/`--ke-*` rule, migrate the value to its canonical token when this can be done without changing behavior.
- Keep accounting calculations, audit conclusions, materiality, standards authority, evidence semantics, security gates, APIs and approval logic outside the presentation layer.
- Never solve a visual mismatch by changing a financial value, hiding evidence, weakening a gate or making a deterministic result decorative/non-deterministic.
- Maintain the governed 44px minimum touch target even when legacy module CSS contains smaller historical values.

## What NOT to Do

- No generic SaaS-blue visual system that overrides v44 tokens.
- No excessive glassmorphism, 3D rotation, parallax, or looping ambient movement.
- No hard-coded left/right assumptions for Arabic UI.
- No animation that obscures, changes, delays access to, or visually distorts financial evidence or audit conclusions.
- No separate motion palette or typography outside the governed v44 design tokens without an explicit design-system change.
