---
name: kosif-release-gate
description: Decide whether a KOSIF change is ready to merge or release by checking CI, critical risks, runtime compatibility, and production verification requirements.
---

# KOSIF Release Gate

Use this skill before merging or publishing KOSIF changes.

## Principle

Fail closed on missing evidence for critical gates. A queued or absent check is not a green check.

## Workflow

1. Resolve the exact commit SHA or PR head being considered for release.
2. Confirm the target branch and verify the head has not moved since review.
3. Inspect relevant CI/workflow runs for that SHA.
4. Require evidence for the project’s applicable gates, including:
   - build/runtime verification,
   - accounting/numeric integrity checks when financial logic changed,
   - security checks for security-sensitive changes,
   - design/code guardians for frontend changes,
   - smoke tests for the deployed artifact when publishing.
5. Identify any critical/high finding that remains unresolved or waived without documented justification.
6. Check deployment configuration changes, secrets/bindings expectations, and migration ordering when applicable.
7. If all required gates are green, return `READY` with the exact SHA reviewed.
8. Otherwise return `BLOCKED` with the minimal set of blockers and the next concrete action for each.

## After deployment

When deployment is part of the request, verify the live version separately. A successful GitHub workflow alone is not proof that production is healthy.

## Output contract

Always include:
- release verdict,
- reviewed SHA,
- gate table/status summary,
- blockers,
- production verification status,
- any assumptions or missing evidence.
