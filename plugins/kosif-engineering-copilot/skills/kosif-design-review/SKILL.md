---
name: kosif-design-review
description: Review KOSIF UI changes for visual consistency, RTL, responsive behavior, accessibility, motion, and design-token drift before release.
---

# KOSIF Design Review

Use this skill when reviewing or improving KOSIF screens, components, styles, layouts, motion, or responsive behavior.

## Workflow

1. Read the current target files from the repository. Never review from stale chat snippets when live files are accessible.
2. Identify the active visual system from existing code and connected Figma/Canva references when available. Prefer the current implemented baseline over inventing a parallel style system.
3. Check all of the following:
   - RTL correctness and logical CSS properties.
   - iPhone safe-area handling, modal scrolling, sticky elements, and background-scroll locking.
   - Small-screen overflow and tap target size.
   - typography hierarchy, spacing, radii, shadows, borders, and color-token consistency.
   - focus-visible behavior, labels, alt text, contrast, and keyboard reachability.
   - `prefers-reduced-motion` behavior and excessive/infinite motion.
   - loading, empty, error, disabled, hover, focus, and active states.
4. If a connected Figma or Canva design is explicitly the visual authority, compare against it instead of approximating from memory.
5. Classify findings as `blocker`, `high`, `medium`, or `polish`.
6. If the user asks for fixes, make the smallest safe patch on a feature branch, preserve newer work, and run relevant checks before proposing merge.

## Output contract

Return:
- visual verdict,
- affected screens/files,
- prioritized findings,
- concrete fix plan,
- verification performed,
- remaining uncertainty.

Do not claim pixel parity unless a real visual comparison was performed.
