export type AgentExecutionStatus = 'success' | 'error';

export interface ExecutionPayload {
  prompt: string;
  context?: Record<string, unknown>;
  toolCalls?: string[];
}

export interface AgentResponse {
  success: boolean;
  output: string;
  metadata: {
    latencyMs: number;
    model: string;
    tokensUsed?: number;
  };
  errorCode?: string;
}

export interface GeminiRuntimeEnv {
  GEMINI_API_KEY?: string;
}

export interface MCPRuntimeConfig {
  endpoint: string;
  accessToken?: string;
  timeoutMs?: number;
}
