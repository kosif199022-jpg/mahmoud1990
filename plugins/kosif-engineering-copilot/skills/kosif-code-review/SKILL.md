---
name: kosif-code-review
description: Review KOSIF code changes for correctness, regressions, security, maintainability, performance, and compatibility with the existing architecture.
---

# KOSIF Code Review

Use this skill for pull requests, commits, branches, patches, or scoped code changes in KOSIF.

## Workflow

1. Resolve the current repository, base branch, and exact change under review.
2. Read the changed files and the relevant surrounding implementation before judging the diff.
3. Check for:
   - broken control flow, missing states, dead code, and inconsistent data contracts,
   - accidental deletion or replacement of newer behavior,
   - unsafe DOM writes, injection boundaries, secret leakage, and permission mistakes,
   - numeric/accounting logic regressions and non-deterministic calculations where deterministic code is required,
   - duplicated implementations and architecture drift,
   - unnecessary network work, rendering loops, large payloads, or blocking work,
   - fragile mobile/RTL assumptions in frontend code,
   - missing or misleading tests and CI coverage.
4. Treat existing project gates as evidence, not as a substitute for code review. Inspect failed jobs and logs when available.
5. Prefer targeted patches. Do not perform broad rewrites unless the change cannot be made safely in-place.
6. When fixing findings, preserve existing behavior not directly related to the issue and re-read files immediately before each write.

## Severity

- `critical`: exploitable security issue, data corruption, incorrect financial result, or production-breaking behavior.
- `high`: likely regression, broken core workflow, or serious maintainability/security weakness.
- `medium`: correctness edge case, reliability weakness, or meaningful technical debt.
- `low`: cleanup or polish with limited operational impact.

## Output contract

Lead with validated findings and evidence. Then state tests/checks performed and whether the change is safe to merge. Do not manufacture findings just to fill a report.
