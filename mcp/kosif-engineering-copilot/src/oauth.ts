import {
  OAuthProvider,
  type AuthRequest,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import mcpHandler from "./worker";

const BASE_URL = "https://kosif-engineering-copilot-mcp.kosif199022.workers.dev";
const MCP_URL = `${BASE_URL}/mcp`;
const KOSIF_LIVE_URL = "https://mahmoud-eldesouky.kosif199022.workers.dev";

type BrowserRunBinding = {
  quickAction(action: "screenshot", input: Record<string, unknown>): Promise<Response>;
};

type Env = {
  OAUTH_PROVIDER: OAuthHelpers;
  OAUTH_KV: any;
  BROWSER?: BrowserRunBinding;
  VISUAL_SMOKE_KEY?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function consentPage(request: Request, clientName: string, scopes: string[]) {
  const action = escapeHtml(request.url);
  const scopeText = scopes.length ? scopes.join(", ") : "mcp:read";
  return new Response(
    `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>KOSIF Engineering Copilot — Authorization</title>
<style>
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:light}
body{margin:0;background:#f6f2e8;color:#16372e;display:grid;place-items:center;min-height:100vh;padding:24px}
.card{max-width:620px;background:#fff;border:1px solid #ded7c8;border-radius:24px;padding:28px;box-shadow:0 18px 60px #16372e18}
h1{margin:0 0 12px;font-size:28px}.muted{color:#5f6f69;line-height:1.7}.badge{display:inline-block;background:#e8f2ee;border-radius:999px;padding:6px 10px;font-size:13px;margin-bottom:14px}.permissions{background:#f8faf9;border-radius:16px;padding:16px;margin:20px 0}.permissions li{margin:8px 0}.actions{display:flex;gap:10px;flex-wrap:wrap}.allow,.deny{border:0;border-radius:14px;padding:12px 18px;font-weight:700;cursor:pointer}.allow{background:#16372e;color:white}.deny{background:#eee8dc;color:#4e514e}.small{font-size:12px;color:#737b77;margin-top:18px}
</style>
</head>
<body>
<main class="card">
  <div class="badge">Read-only OAuth 2.1</div>
  <h1>السماح لـ KOSIF Engineering Copilot</h1>
  <p class="muted">يطلب <strong>${escapeHtml(clientName || "ChatGPT")}</strong> الاتصال بخادم KOSIF Engineering Copilot.</p>
  <div class="permissions">
    <strong>الصلاحيات:</strong>
    <ul>
      <li>قراءة حالة مشروع KOSIF العامة.</li>
      <li>قراءة الـPull Requests وحالة CI العامة.</li>
      <li>تشغيل فحوصات Design Guardian للقراءة فقط.</li>
      <li>التقاط صور لواجهة KOSIF العامة على مقاسات موبايل وتابلت وديسكتوب للمراجعة البصرية.</li>
      <li>لا توجد أدوات Merge أو تعديل أو نشر في هذه النسخة.</li>
    </ul>
    <div>Scopes: <code>${escapeHtml(scopeText)}</code></div>
  </div>
  <form method="post" action="${action}" class="actions">
    <button class="allow" type="submit" name="decision" value="allow">السماح والاتصال</button>
    <button class="deny" type="submit" name="decision" value="deny">رفض</button>
  </form>
  <p class="small">هذه النسخة للقراءة والفحص البصري فقط، ولا تمنح ChatGPT صلاحية تعديل أو نشر التطبيق.</p>
</main>
</body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

function deniedRedirect(oauthRequest: AuthRequest) {
  const redirect = new URL(oauthRequest.redirectUri);
  redirect.searchParams.set("error", "access_denied");
  redirect.searchParams.set("state", oauthRequest.state);
  if (oauthRequest.issuer) redirect.searchParams.set("iss", oauthRequest.issuer);
  return Response.redirect(redirect.toString(), 302);
}

async function visualSmoke(request: Request, env: Env) {
  const supplied = request.headers.get("x-kosif-visual-smoke") || "";
  if (!env.VISUAL_SMOKE_KEY || supplied !== env.VISUAL_SMOKE_KEY) {
    return new Response("Not found", { status: 404 });
  }
  if (!env.BROWSER) {
    return Response.json({ ok: false, error: "browser_binding_unavailable" }, { status: 503 });
  }

  const screenshot = await env.BROWSER.quickAction("screenshot", {
    url: KOSIF_LIVE_URL,
    viewport: { width: 393, height: 852, deviceScaleFactor: 1 },
    screenshotOptions: { type: "jpeg", quality: 50, fullPage: false },
    gotoOptions: { waitUntil: "networkidle2", timeout: 30000 },
  });

  if (!screenshot.ok) {
    const detail = (await screenshot.text()).slice(0, 300);
    return Response.json(
      { ok: false, error: "browser_capture_failed", status: screenshot.status, detail },
      { status: 502 },
    );
  }

  const bytes = (await screenshot.arrayBuffer()).byteLength;
  return Response.json({
    ok: bytes > 1000,
    bytes,
    contentType: screenshot.headers.get("content-type") || "image/jpeg",
    target: KOSIF_LIVE_URL,
    viewport: { width: 393, height: 852 },
  });
}

const defaultHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return Response.json({
        ok: true,
        service: "kosif-engineering-copilot-mcp",
        version: "0.2.2",
        oauth: true,
        dcr: true,
        cimd: true,
        visualCapture: true,
      });
    }

    if (request.method === "GET" && url.pathname === "/internal/visual-smoke") {
      return visualSmoke(request, env);
    }

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        name: "KOSIF Engineering Copilot MCP",
        version: "0.2.2",
        mode: "oauth-read-only-visual-review",
        mcpEndpoint: "/mcp",
        authorizationEndpoint: "/authorize",
        tokenEndpoint: "/oauth/token",
        registrationEndpoint: "/oauth/register",
        visualTools: ["capture_app_screen", "capture_responsive_set"],
      });
    }

    if (url.pathname !== "/authorize" || !["GET", "POST"].includes(request.method)) {
      return new Response("Not found", { status: 404 });
    }

    let oauthRequest: AuthRequest;
    try {
      oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
    } catch (error) {
      console.error("OAuth authorization request rejected", error);
      return new Response("Invalid authorization request", { status: 400 });
    }

    const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
    if (!client) return new Response("Unknown OAuth client", { status: 400 });

    if (request.method === "GET") {
      return consentPage(request, client.clientName || "ChatGPT", oauthRequest.scope);
    }

    const form = await request.formData();
    if (form.get("decision") !== "allow") return deniedRedirect(oauthRequest);

    const grantedScopes = oauthRequest.scope.filter((scope) => scope === "mcp:read");
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
      request: oauthRequest,
      userId: "kosif-readonly-connector-user",
      metadata: {
        clientName: client.clientName || "ChatGPT",
        authorizationMode: "read-only-visual-review",
      },
      scope: grantedScopes,
      props: {
        access: "read-only-visual-review",
      },
    });

    return Response.redirect(redirectTo, 302);
  },
};

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler: mcpHandler as any,
  defaultHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  clientIdMetadataDocumentEnabled: true,
  scopesSupported: ["mcp:read"],
  allowPlainPKCE: false,
  resourceMetadata: {
    resource: MCP_URL,
    authorization_servers: [BASE_URL],
    scopes_supported: ["mcp:read"],
    bearer_methods_supported: ["header"],
    resource_name: "KOSIF Engineering Copilot",
  },
});
