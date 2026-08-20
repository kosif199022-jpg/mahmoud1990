# KOSIF Engineering Copilot

A skills-only plugin for ChatGPT and Codex that packages KOSIF-specific design, code, triage, and release workflows.

## Why this first version is skills-only

It can be installed without deploying an MCP server or storing new secrets. It uses the tools/connectors already available in the host session (for example GitHub, Figma, Canva, Linear, PostHog, or other connected services) when those tools are present.

## Included skills

1. `kosif-design-review` — visual consistency, RTL, responsive/iPhone, motion, accessibility, and design-token review.
2. `kosif-code-review` — risk-focused review of PRs, diffs, and implementation changes.
3. `kosif-release-gate` — pre-release verification and fail-closed release decision workflow.
4. `kosif-issue-triage` — turn findings into a deduplicated, prioritized backlog.
5. `kosif-implementation-architect` — plan safe incremental implementation without overwriting newer work.

## Repository target

Default project repository: `kosif199022-jpg/mahmoud1990`.

The skills must re-check the live repository state before acting. They must not assume `main`, a PR, or a deployment is unchanged from prior chat context.

## Install/testing model

This follows the current OpenAI plugin package structure: the required manifest is at `.codex-plugin/plugin.json`, while skills live under `skills/` at the plugin root.

For a personal installation, package/install the folder using the Plugin Creator/local plugin workflow. An MCP server can be added later through `.app.json` or `.mcp.json` if direct KOSIF runtime tools are needed.
