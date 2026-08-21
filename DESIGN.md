# KOSIF Visual & Motion Identity

This file is the source of truth for motion work created with Remotion and HyperFrames. It mirrors the current production UI tokens rather than introducing a separate visual language.

## Style Prompt

KOSIF is a trusted Saudi audit-intelligence workspace: calm, authoritative, precise, editorial, and premium without visual noise. Motion should reinforce hierarchy and comprehension, never compete with accounting or audit content. Use restrained depth, soft paper-like surfaces, deep pine/viridian structure, and seal-gold accents. Arabic-first layouts must remain RTL-correct and readable on mobile.

## Colors

- `#12211C` — Ink / primary text
- `#F3F5F1` — Paper / application background
- `#FFFFFF` — Surface / cards and clean panels
- `#0F3D31` — Pine / primary structural color
- `#0E7A5F` — Viridian / active and positive action
- `#A97E2F` — Seal gold / premium accent and focus
- `#D9C08A` — Seal line / subtle gold border
- `#5C6B62` — Muted text

## Typography

- Body/UI: `IBM Plex Sans Arabic`, system-ui, sans-serif
- Headings: `Alexandria`, `IBM Plex Sans Arabic`, sans-serif
- Brand/editorial accents: `Amiri`, serif

Use tabular numerals for financial values. Never sacrifice numeric legibility for decorative typography.

## Spacing & Shape

- Default card radius: `14px`
- Compact control radius: `9px`
- Prefer an 8px spacing rhythm with 12/16/24/32px as common steps.
- Keep content measure comfortable; avoid dense edge-to-edge layouts.
- Use logical CSS properties for RTL/LTR compatibility.

## Motion Rules

- Motion is calm and functional: 180–450ms for UI transitions, 500–900ms for cinematic entrances.
- Prefer opacity + short translate + subtle scale. Avoid large spins, elastic bounces, and constant ambient motion.
- Use varied easing, but keep it polished: `power2.out`, `power3.out`, `expo.out`, or equivalent spring curves.
- Preserve the final layout as the source of truth; animate into it rather than positioning with animation.
- Respect `prefers-reduced-motion` in application UI and provide a reduced-motion path for exported motion where applicable.
- Never animate accounting numbers in a way that could imply a different value.

## Responsive & Accessibility

- Arabic is the default direction; text and controls must remain RTL-safe.
- Maintain WCAG-friendly contrast and clear focus states.
- Do not rely on color alone to communicate audit severity or status.
- Avoid horizontal overflow on iPhone-sized viewports.
- Keep captions and critical labels inside safe margins.

## What NOT to Do

- No neon cyberpunk palette, generic blue SaaS gradients, or unrelated glassmorphism.
- No excessive 3D rotation, parallax that harms reading, or looping decorative motion.
- No random animation timing; rendered motion must be deterministic.
- No hard-coded left/right assumptions for Arabic UI.
- No animation that hides, changes, or visually distorts financial evidence or audit conclusions.
