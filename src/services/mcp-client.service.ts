import type { MCPRuntimeConfig } from '../types/agent.types';

export interface MCPToolRequest {
  tool: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolResponse<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  executionTimeMs: number;
}

const DEFAULT_ALLOWED_TOOLS = new Set([
  'kosif-code-review',
  'kosif-design-review',
  'kosif-implementation-architect',
  'kosif-issue-triage',
  'kosif-release-gate',
]);

export class MCPClientService {
  private readonly endpoint: URL;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: MCPRuntimeConfig,
    private readonly allowedTools: ReadonlySet<string> = DEFAULT_ALLOWED_TOOLS,
  ) {
    this.endpoint = new URL(config.endpoint);
    this.timeoutMs = config.timeoutMs ?? 20_000;
    if (this.endpoint.protocol !== 'https:' && this.endpoint.hostname !== '127.0.0.1' && this.endpoint.hostname !== 'localhost') {
      throw new Error('MCP_ENDPOINT_REJECTED: MCP endpoint must use HTTPS outside local development.');
    }
  }

  async executeTool<T = unknown>(request: MCPToolRequest): Promise<MCPToolResponse<T>> {
    const startedAt = Date.now();
    if (!this.allowedTools.has(request.tool)) {
      return {
        success: false,
        error: `MCP_TOOL_NOT_ALLOWED: ${request.tool}`,
        executionTimeMs: Date.now() - startedAt,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(this.config.accessToken ? { Authorization: `Bearer ${this.config.accessToken}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: crypto.randomUUID(),
          method: 'tools/call',
          params: { name: request.tool, arguments: request.arguments ?? {} },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `MCP_HTTP_${response.status}`,
          executionTimeMs: Date.now() - startedAt,
        };
      }

      const payload = (await response.json()) as { result?: T; error?: { message?: string } };
      if (payload.error) {
        return {
          success: false,
          error: payload.error.message ?? 'MCP execution failed.',
          executionTimeMs: Date.now() - startedAt,
        };
      }

      return { success: true, result: payload.result, executionTimeMs: Date.now() - startedAt };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MCP client error.',
        executionTimeMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
