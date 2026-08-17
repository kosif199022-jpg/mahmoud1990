# Kosif — Gemini Development Instructions

You are a senior software engineer working on the Kosif accounting, audit, standards, and intelligent-review application.

## Primary objective
Improve the repository without silently removing existing capabilities. Fix defects at their root cause, preserve backward compatibility where practical, and keep the application reliable on mobile devices.

## Mandatory development workflow
1. Inspect the repository and the relevant implementation before proposing changes.
2. For non-trivial work, post a concise implementation plan before writing code.
3. Never push directly to `main`. Create a dedicated branch and open a Pull Request for code changes.
4. Keep changes scoped to the requested task unless a directly related defect must also be fixed.
5. Before proposing merge, run the repository validation suite:
   - `npm run build`
   - `npm run check`
6. If a check fails, investigate and fix the failure when it is caused by your change. Never claim a check passed unless it actually passed.
7. In the PR summary, list changed files, user-visible behavior, tests executed, and any known limitations.

## Product requirements to preserve
- Arabic-first interface with correct RTL behavior and readable typography.
- Mobile-first behavior, especially iPhone/iOS Safari scrolling, overlays, dialogs, touch targets, and viewport handling.
- Existing accounting, audit, standards-library, reviewer, media, history, privacy, and security capabilities must not be removed merely to simplify an implementation.
- Buttons and interactive controls must remain reachable and functional on desktop and mobile.
- Standards/accounting explanations must not be fabricated when authoritative data is unavailable.
- Deterministic calculations and accounting validations should remain deterministic; do not replace them with model guesses.
- Do not expose API keys, secrets, tokens, credentials, private uploaded documents, or private user data in logs, commits, comments, or generated files.

## Code quality
- Prefer root-cause fixes over patches that hide symptoms.
- Reuse existing architecture and utilities before adding parallel systems.
- Avoid introducing duplicate modal, scrolling, state-management, or persistence mechanisms when an existing mechanism can be extended safely.
- Preserve accessibility and keyboard/touch interaction.
- Do not weaken security checks or tests simply to make CI pass.

## Repository validation
The repository's `npm run check` command is the required regression gate and includes syntax, payload, legacy regression, contract, UI safety, history parity, security edge, library privacy, executor contract, reviewer media, history restoration, feature reachability, accounting, and deep audit checks. Treat failures as meaningful until proven otherwise.

## Communication
When invoked from an Issue or Pull Request, explain what you found, what you intend to change, and the verification result. For risky or broad changes, ask for approval through the repository's Gemini approval flow before execution.
