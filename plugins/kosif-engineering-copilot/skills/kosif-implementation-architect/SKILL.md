---
name: kosif-implementation-architect
description: Plan and implement KOSIF improvements incrementally while preserving newer work, existing architecture, visual identity, and release gates.
---

# KOSIF Implementation Architect

Use this skill when turning a broad KOSIF improvement request into a safe implementation plan or code change.

## Workflow

1. Re-read the live repository structure and relevant files before planning.
2. Map the request to existing components, scripts, workflows, configuration, and data contracts. Reuse them before introducing parallel systems.
3. Decompose work into the smallest independently verifiable slices.
4. For each slice define:
   - files/components affected,
   - intended user-visible behavior,
   - invariants that must not change,
   - test/check to prove success,
   - rollback boundary.
5. Preserve newer changes. Re-read a file immediately before writing if other agents or PRs may be modifying the same area.
6. Prefer feature branches and focused PRs for material changes.
7. For frontend work, keep design tokens, RTL, responsive behavior, motion accessibility, and iPhone scrolling in scope.
8. For accounting/audit logic, keep deterministic calculations, traceability, and source-backed standards references in scope.
9. After implementation, run the narrowest relevant checks first, then the full applicable project gates.

## Output contract

Provide the architecture decision, phased change plan, compatibility risks, verification plan, and clear done criteria. Avoid vague tasks such as “improve everything” without mapping them to concrete code boundaries.
