import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { z } from "zod";

const OWNER = "kosif199022-jpg";
const REPO = "mahmoud1990";
const REPO_FULL = `${OWNER}/${REPO}`;
const LIVE_URL = "https://mahmoud-eldesouky.kosif199022.workers.dev";
const GITHUB_API = `https://api.github.com/repos/${REPO_FULL}`;
const MCP_HOST = "kosif-engineering-copilot-mcp.kosif199022.workers.dev";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

function result(data: Record<string, unknown>, summary?: string) {
  const text = JSON.stringify(data, null, 2);
  return {
    structuredContent: data,
    content: [{ type: "text" as const, text: summary ? `${summary}\n\n${text}` : text }],
  };
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "kosif-engineering-copilot-mcp/0.2.0",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = (await response.text()).slice(0, 800);
    throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}: ${body}`);
  }
  return response.json() as Promise<any>;
}

async function github(path: string) {
  return fetchJson(`${GITHUB_API}${path}`);
}

function decodeBase64Utf8(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubFile(path: string, ref = "main") {
  const safeRef = ref.trim();
  if (!/^[A-Za-z0-9._\/-]{1,120}$/.test(safeRef)) {
    throw new Error("Invalid ref. Use a branch, tag, or commit SHA without spaces.");
  }
  const data = await github(`/contents/${path}?ref=${encodeURIComponent(safeRef)}`);
  if (data?.encoding !== "base64" || typeof data?.content !== "string") {
    throw new Error(`Unable to decode repository file: ${path}`);
  }
  return decodeBase64Utf8(data.content);
}

async function liveHealth() {
  const response = await fetch(`${LIVE_URL}/__health?source=kosif-mcp-v0.2`, {
    headers: { "User-Agent": "kosif-engineering-copilot-mcp/0.2.0" },
  });
  if (!response.ok) throw new Error(`Live health returned HTTP ${response.status}`);
  return response.json() as Promise<any>;
}

function createServer() {
  const server = new McpServer({ name: "KOSIF Engineering Copilot", version: "0.2.0" });

  server.registerTool(
    "project_health",
    {
      title: "KOSIF Project Health",
      description:
        "Use this when checking the current public KOSIF production health and GitHub repository metadata. Read-only and scoped to KOSIF.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const [health, repo] = await Promise.all([liveHealth(), github("")]);
      const data = {
        status: health?.productName === "Kosif" ? "healthy" : "unexpected",
        checkedAt: new Date().toISOString(),
        production: {
          url: LIVE_URL,
          productName: health?.productName ?? null,
          version: health?.version ?? null,
          buildId: health?.buildId ?? null,
          designAuthority: health?.designAuthority ?? null,
          experienceVersion: health?.experienceVersion ?? null,
          modules: health?.modules ?? null,
          installable: health?.installable ?? null,
        },
        repository: {
          fullName: repo?.full_name ?? REPO_FULL,
          defaultBranch: repo?.default_branch ?? "main",
          visibility: repo?.visibility ?? null,
          updatedAt: repo?.updated_at ?? null,
          pushedAt: repo?.pushed_at ?? null,
          openIssues: repo?.open_issues_count ?? null,
        },
      };
      return result(data, "KOSIF public project health check completed.");
    },
  );

  server.registerTool(
    "list_open_prs",
    {
      title: "List KOSIF Open Pull Requests",
      description:
        "Use this when finding the currently open KOSIF pull requests before review, merge planning, or release checks.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(10) }),
      annotations: READ_ONLY,
    },
    async ({ limit }) => {
      const prs = await github(`/pulls?state=open&sort=updated&direction=desc&per_page=${limit}`);
      const data = {
        count: Array.isArray(prs) ? prs.length : 0,
        pullRequests: (Array.isArray(prs) ? prs : []).map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          draft: pr.draft,
          updatedAt: pr.updated_at,
          head: pr.head?.ref,
          headSha: pr.head?.sha,
          base: pr.base?.ref,
          author: pr.user?.login,
          url: pr.html_url,
        })),
      };
      return result(data, "Open KOSIF pull requests retrieved.");
    },
  );

  server.registerTool(
    "pull_request_status",
    {
      title: "KOSIF Pull Request Status",
      description:
        "Use this when inspecting one KOSIF PR for merge state, changed-file counts, and CI/check-run status without modifying it.",
      inputSchema: z.object({ prNumber: z.number().int().min(1) }),
      annotations: READ_ONLY,
    },
    async ({ prNumber }) => {
      const pr = await github(`/pulls/${prNumber}`);
      const sha = pr?.head?.sha;
      if (!sha) throw new Error("Pull request head SHA is unavailable.");
      const checks = await github(`/commits/${sha}/check-runs?per_page=100`);
      const checkRuns = (checks?.check_runs ?? []).map((c: any) => ({
        name: c.name,
        status: c.status,
        conclusion: c.conclusion,
        startedAt: c.started_at,
        completedAt: c.completed_at,
        url: c.html_url,
      }));
      const bad = new Set(["failure", "cancelled", "timed_out", "action_required", "startup_failure"]);
      const failing = checkRuns.filter((c: any) => bad.has(c.conclusion));
      const pending = checkRuns.filter((c: any) => c.status !== "completed");
      const data = {
        pr: {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft,
          mergeable: pr.mergeable,
          mergeableState: pr.mergeable_state,
          head: pr.head?.ref,
          headSha: sha,
          base: pr.base?.ref,
          commits: pr.commits,
          changedFiles: pr.changed_files,
          additions: pr.additions,
          deletions: pr.deletions,
          updatedAt: pr.updated_at,
          url: pr.html_url,
        },
        ci: {
          totalChecks: checkRuns.length,
          failingChecks: failing.length,
          pendingChecks: pending.length,
          checks: checkRuns,
        },
        assessment:
          failing.length > 0
            ? "blocked_by_failing_checks"
            : pending.length > 0
              ? "checks_pending"
              : checkRuns.length === 0
                ? "no_checks_visible"
                : "checks_green",
      };
      return result(data, `KOSIF PR #${prNumber} status inspected.`);
    },
  );

  server.registerTool(
    "design_guardian_scan",
    {
      title: "KOSIF Lightweight Design Guardian",
      description:
        "Use this when checking KOSIF frontend HTML for key visual-system, RTL, responsive, accessibility, motion, and scroll safety markers. This is a lightweight remote scan, not the full CI guardian suite.",
      inputSchema: z.object({ ref: z.string().min(1).max(120).default("main") }),
      annotations: READ_ONLY,
    },
    async ({ ref }) => {
      const html = await githubFile("frontend/index.html", ref);
      const findings: Array<{ severity: "error" | "warning"; code: string; message: string }> = [];
      const check = (ok: boolean, severity: "error" | "warning", code: string, message: string) => {
        if (!ok) findings.push({ severity, code, message });
      };
      check(/^\s*<!doctype html>/i.test(html), "error", "DOCTYPE", "HTML5 doctype is missing.");
      check(/<html[^>]*\blang=["']ar["']/i.test(html), "error", "LANG_AR", "Root html should declare Arabic language.");
      check(/<html[^>]*\bdir=["']rtl["']/i.test(html), "error", "RTL", "Root html should declare RTL direction.");
      check(/viewport-fit=cover/i.test(html), "error", "VIEWPORT_FIT", "iPhone viewport-fit=cover marker is missing.");
      check(/:focus-visible\b/i.test(html), "warning", "FOCUS", "No :focus-visible rule detected.");
      check(/prefers-reduced-motion\s*:\s*reduce/i.test(html), "warning", "REDUCED_MOTION", "Reduced-motion handling is missing.");
      check(/(margin-inline|padding-inline|inset-inline)/i.test(html), "warning", "LOGICAL_CSS", "No logical RTL CSS properties detected.");
      check(/overflow-x\s*:\s*auto/i.test(html), "warning", "HORIZONTAL_SCROLL", "No horizontal overflow protection detected.");
      check(/--pine\s*:/i.test(html) && /--seal\s*:/i.test(html), "warning", "DESIGN_TOKENS", "Core KOSIF design tokens were not detected.");
      check(/@media\b/i.test(html), "warning", "RESPONSIVE", "No responsive media query detected.");
      if ((html.match(/\bmodal\b/gi) || []).length > 0) {
        check(
          /(overflow-y\s*:\s*auto|overflow\s*:\s*auto)/i.test(html),
          "warning",
          "MODAL_SCROLL",
          "Modal references exist without an obvious overflow:auto rule.",
        );
      }
      const errors = findings.filter((f) => f.severity === "error").length;
      const warnings = findings.length - errors;
      const data = {
        ref,
        target: "frontend/index.html",
        scanType: "lightweight_remote_guardian",
        status: errors ? "fail" : warnings ? "warn" : "pass",
        score: Math.max(0, 100 - errors * 12 - warnings * 3),
        errors,
        warnings,
        findings,
        note: "For merge/release decisions, use the repository's full KOSIF Design & Code Guardians workflow as the authoritative gate.",
      };
      return result(data, `Lightweight KOSIF design scan completed for ${ref}.`);
    },
  );

  server.registerTool(
    "release_readiness",
    {
      title: "KOSIF Release Readiness",
      description:
        "Use this when deciding whether a KOSIF ref appears ready for release based on visible GitHub Actions state and current production health. Read-only and fail-closed on missing or pending evidence.",
      inputSchema: z.object({ ref: z.string().min(1).max(120).default("main") }),
      annotations: READ_ONLY,
    },
    async ({ ref }) => {
      const commit = await github(`/commits/${encodeURIComponent(ref)}`);
      const sha = commit?.sha;
      if (!sha) throw new Error(`Unable to resolve ref: ${ref}`);
      const [runs, checks, health] = await Promise.all([
        github(`/actions/runs?head_sha=${sha}&per_page=50`),
        github(`/commits/${sha}/check-runs?per_page=100`),
        liveHealth(),
      ]);
      const workflowRuns = (runs?.workflow_runs ?? []).map((run: any) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        event: run.event,
        url: run.html_url,
      }));
      const checkRuns = checks?.check_runs ?? [];
      const bad = new Set(["failure", "cancelled", "timed_out", "action_required", "startup_failure"]);
      const failingWorkflows = workflowRuns.filter((r: any) => bad.has(r.conclusion));
      const pendingWorkflows = workflowRuns.filter((r: any) => r.status !== "completed");
      const failingChecks = checkRuns.filter((r: any) => bad.has(r.conclusion));
      const pendingChecks = checkRuns.filter((r: any) => r.status !== "completed");
      const productionHealthy = health?.productName === "Kosif";
      const blockers: string[] = [];
      if (workflowRuns.length === 0 && checkRuns.length === 0) blockers.push("No CI/check evidence is visible for this ref.");
      if (failingWorkflows.length || failingChecks.length) blockers.push("One or more CI checks are failing.");
      if (pendingWorkflows.length || pendingChecks.length) blockers.push("One or more CI checks are still pending.");
      if (!productionHealthy) blockers.push("Current production health is unexpected.");
      const data = {
        ref,
        sha,
        readiness: blockers.length === 0 ? "READY_FROM_VISIBLE_EVIDENCE" : "BLOCKED_OR_INCOMPLETE",
        blockers,
        ci: {
          workflowRuns: workflowRuns.length,
          failingWorkflows: failingWorkflows.length,
          pendingWorkflows: pendingWorkflows.length,
          checkRuns: checkRuns.length,
          failingChecks: failingChecks.length,
          pendingChecks: pendingChecks.length,
        },
        production: {
          healthy: productionHealthy,
          version: health?.version ?? null,
          buildId: health?.buildId ?? null,
        },
        caveat:
          "Current production health does not prove that this ref is deployed. A production deployment verification must confirm the deployed SHA separately.",
      };
      return result(data, `Release-readiness evidence evaluated for ${ref}.`);
    },
  );

  return server;
}

const mcp = createMcpHandler(createServer);

function requestGuard(request: Request): Response | null {
  const url = new URL(request.url);
  const allowedHost = url.hostname === MCP_HOST || url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!allowedHost) return new Response("Forbidden host", { status: 403 });

  const origin = request.headers.get("Origin");
  if (!origin) return null;
  try {
    const originHost = new URL(origin).hostname;
    const allowedOrigin =
      originHost === MCP_HOST ||
      originHost === "localhost" ||
      originHost === "127.0.0.1" ||
      originHost === "chatgpt.com" ||
      originHost.endsWith(".chatgpt.com") ||
      originHost === "chat.openai.com" ||
      originHost.endsWith(".openai.com");
    return allowedOrigin ? null : new Response("Forbidden origin", { status: 403 });
  } catch {
    return new Response("Forbidden origin", { status: 403 });
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const rejected = requestGuard(request);
    if (rejected) return rejected;

    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({
        name: "KOSIF Engineering Copilot MCP",
        version: "0.2.0",
        mode: "read-only-public-data",
        mcpEndpoint: "/mcp",
        healthEndpoint: "/healthz",
        repository: REPO_FULL,
      });
    }
    if (url.pathname === "/healthz" && request.method === "GET") {
      return Response.json({ ok: true, service: "kosif-engineering-copilot-mcp", version: "0.2.0" });
    }
    if (url.pathname === "/mcp") return mcp.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
