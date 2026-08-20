# KOSIF Engineering Suite

KOSIF Engineering Suite is the engineering control plane for KOSIF. It coordinates design quality, browser testing, accessibility, security, performance and release safety.

## Operating model

The suite is fail-closed: a release should not proceed when a mandatory gate fails. Priority order is numeric integrity, security, compliance, source integrity, quality, then performance.

## Agents

- Orchestrator: coordinates all gates and prevents unsafe release.
- Design Director: enforces visual system, RTL, typography, spacing and responsive consistency.
- UI Engineer: implements approved interface decisions cleanly.
- Visual QA: catches clipping, overflow, modal and mobile regressions.
- Browser Tester: exercises critical routes using a real browser.
- Code Auditor: detects unsafe patterns, dead/duplicate code and regressions.
- Performance Engineer: tracks loading, resource weight and caching regressions.
- Accessibility Inspector: checks labels, semantics, keyboard access and RTL usability.
- Release Sentinel: allows promotion only after required gates pass.

## Current automated gates

The GitHub workflow `.github/workflows/kosif-engineering-suite.yml` currently performs repository integrity, obvious secret-file rejection, HTML integrity, Chromium smoke testing, three viewport checks, horizontal-overflow detection, unlabeled-button checks, screenshots and a release-sentinel gate.

Screenshots are retained as GitHub Actions artifacts for visual review.

## Extension roadmap

1. Add deterministic accounting golden tests.
2. Add standards/source provenance validation.
3. Add Lighthouse budgets and Core Web Vitals thresholds.
4. Add baseline screenshot comparison for visual regression.
5. Add axe-core accessibility scanning.
6. Add dependency/SBOM and vulnerability scanning.
7. Wire PostHog release annotations and error telemetry.
8. Wire Cloudflare production smoke and rollback verification.
9. Add iPhone/Safari coverage when a compatible runner is available.
10. Add structured agent findings that can be mirrored into Linear.

## Policy file

`config/engineering-suite.json` is the machine-readable policy and must remain the single source of truth for mandatory suite behavior.
