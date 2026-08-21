---
name: kosif-issue-triage
description: Turn KOSIF bugs, design defects, CI failures, analytics signals, and audit findings into a deduplicated prioritized engineering backlog.
---

# KOSIF Issue Triage

Use this skill when converting findings from GitHub, production monitoring, design review, PostHog, Linear, user reports, or audit checks into actionable work.

## Workflow

1. Gather current evidence from the connected source instead of relying only on descriptions copied into chat.
2. Normalize each finding into:
   - title,
   - user impact,
   - affected area,
   - reproduction/evidence,
   - suspected cause,
   - severity,
   - confidence,
   - proposed verification.
3. Search existing issues before creating new ones. Merge duplicate symptoms under one root issue when evidence supports the same cause.
4. Prioritize in this order:
   1. incorrect financial/numeric behavior,
   2. security/privacy,
   3. broken production workflows,
   4. standards/source integrity,
   5. accessibility/mobile/RTL regressions,
   6. performance/reliability,
   7. visual polish and enhancements.
5. Separate confirmed defects from hypotheses. Do not label a theory as root cause without evidence.
6. When the user asks to create issues and a tracker is connected, create only the deduplicated set and include source links/evidence.

## Output contract

Return a compact prioritized backlog with severity, confidence, owner suggestion, dependency/blocker, and acceptance criteria for each item.
