import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const LIVE_URL = "https://mahmoud-eldesouky.kosif199022.workers.dev";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

type BrowserRunBinding = {
  quickAction(action: "screenshot", input: Record<string, unknown>): Promise<Response>;
};

type RuntimeEnv = {
  BROWSER?: BrowserRunBinding;
};

let runtimeEnv: RuntimeEnv | undefined;

export function setVisualRuntimeEnv(env: unknown) {
  runtimeEnv = env as RuntimeEnv;
}

const PRESETS = {
  iphone_15_pro: { width: 393, height: 852, deviceScaleFactor: 2 },
  iphone_se: { width: 375, height: 667, deviceScaleFactor: 2 },
  android: { width: 412, height: 915, deviceScaleFactor: 2 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 1.5 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
} as const;

type Preset = keyof typeof PRESETS;

function safePath(value: string) {
  const path = value.trim() || "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || /[\r\n]/.test(path)) {
    throw new Error("Invalid KOSIF path. Use a normal application path beginning with /.");
  }
  return path;
}

function bytesToBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function capture(pathValue: string, preset: Preset, fullPage: boolean) {
  const browser = runtimeEnv?.BROWSER;
  if (!browser) {
    throw new Error("Cloudflare Browser Run binding is unavailable for this MCP deployment.");
  }

  const path = safePath(pathValue);
  const target = new URL(path, LIVE_URL).toString();
  const viewport = PRESETS[preset];

  const response = await browser.quickAction("screenshot", {
    url: target,
    viewport,
    screenshotOptions: {
      fullPage,
      type: "jpeg",
      quality: 82,
    },
    gotoOptions: {
      waitUntil: "networkidle2",
      timeout: 30000,
    },
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`Browser Run screenshot failed with HTTP ${response.status}: ${body}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("Browser Run returned an empty screenshot.");
  if (bytes.byteLength > 5_500_000) {
    throw new Error("Screenshot is larger than the MCP safety limit. Retry with fullPage=false.");
  }

  const mimeType = (response.headers.get("content-type") || "image/jpeg").split(";")[0];
  return {
    path,
    target,
    preset,
    viewport,
    fullPage,
    mimeType,
    bytes,
    capturedAt: new Date().toISOString(),
  };
}

function captureResult(item: Awaited<ReturnType<typeof capture>>) {
  return {
    structuredContent: {
      target: item.target,
      path: item.path,
      preset: item.preset,
      viewport: item.viewport,
      fullPage: item.fullPage,
      bytes: item.bytes.byteLength,
      capturedAt: item.capturedAt,
      purpose: "visual_review",
    },
    content: [
      {
        type: "text" as const,
        text: `KOSIF screenshot captured for ${item.preset} at ${item.viewport.width}x${item.viewport.height}. Inspect the attached image for layout, RTL, scrolling, typography, spacing, accessibility, and responsive defects.`,
      },
      {
        type: "image" as const,
        data: bytesToBase64(item.bytes),
        mimeType: item.mimeType,
      },
    ],
  } as any;
}

export function registerVisualCaptureTools(server: McpServer) {
  const presetSchema = z.enum(["iphone_15_pro", "iphone_se", "android", "tablet", "desktop"]);

  server.registerTool(
    "capture_app_screen",
    {
      title: "Capture KOSIF App Screen",
      description:
        "Use this when you need to see the real rendered KOSIF interface on a specific phone, tablet, or desktop viewport. It captures KOSIF production only and returns the screenshot for visual analysis.",
      inputSchema: z.object({
        path: z.string().max(300).default("/"),
        preset: presetSchema.default("iphone_15_pro"),
        fullPage: z.boolean().default(false),
      }),
      annotations: READ_ONLY,
    },
    async ({ path, preset, fullPage }) => captureResult(await capture(path, preset, fullPage)),
  );

  server.registerTool(
    "capture_responsive_set",
    {
      title: "Capture KOSIF Responsive Set",
      description:
        "Use this when comparing the same KOSIF screen across mobile and desktop. It captures a standard iPhone, Android, and desktop set and returns all screenshots for visual comparison.",
      inputSchema: z.object({
        path: z.string().max(300).default("/"),
        fullPage: z.boolean().default(false),
      }),
      annotations: READ_ONLY,
    },
    async ({ path, fullPage }) => {
      const presets: Preset[] = ["iphone_15_pro", "android", "desktop"];
      const captures = [] as Awaited<ReturnType<typeof capture>>[];
      for (const preset of presets) captures.push(await capture(path, preset, fullPage));

      return {
        structuredContent: {
          path: safePath(path),
          presets: captures.map((item) => ({
            preset: item.preset,
            viewport: item.viewport,
            bytes: item.bytes.byteLength,
            capturedAt: item.capturedAt,
          })),
          purpose: "responsive_visual_review",
        },
        content: [
          {
            type: "text" as const,
            text: "KOSIF responsive screenshot set captured. Compare the attached iPhone, Android, and desktop renders for responsive, RTL, spacing, typography, overflow, and navigation differences.",
          },
          ...captures.map((item) => ({
            type: "image" as const,
            data: bytesToBase64(item.bytes),
            mimeType: item.mimeType,
          })),
        ],
      } as any;
    },
  );
}
