# KOSIF Engineering Copilot MCP v0.2

Remote, read-only MCP server for KOSIF engineering and design checks.

## Endpoint

After deployment:

- MCP: `https://kosif-engineering-copilot-mcp.<account-subdomain>.workers.dev/mcp`
- Health: `https://kosif-engineering-copilot-mcp.<account-subdomain>.workers.dev/healthz`

## Tools

- `project_health` — current public production health + repository metadata
- `list_open_prs` — current open pull requests
- `pull_request_status` — PR metadata and visible CI checks
- `design_guardian_scan` — lightweight RTL/responsive/accessibility/design-token scan
- `release_readiness` — fail-closed readiness view from visible CI + production health

## Security model

v0.2 is deliberately read-only and accesses only public KOSIF endpoints and the public GitHub repository. It exposes no mutation tools and needs no GitHub or Cloudflare credentials at runtime.

A future authenticated v0.3 can add write operations such as issue creation, PR comments, workflow retries, merges, or deployment actions behind OAuth and explicit user approval.

## Local development

```bash
npm install
npm run typecheck
npm run dev
```

Connect an MCP Inspector to `http://localhost:8787/mcp` (or the port printed by Wrangler).
