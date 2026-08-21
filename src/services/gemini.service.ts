import type { AgentResponse, ExecutionPayload, GeminiRuntimeEnv } from '../types/agent.types';

export interface GeminiServiceConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

const DEFAULT_SYSTEM_INSTRUCTION =
  'أنت مساعد تدقيق مالي وهندسي متقدم لمنصة Kosif. التحليل الذكي استشاري؛ الحسابات النهائية والترحيل ورأي المراجعة تخضع للمحرك الحتمي والاعتماد البشري.';

export class GeminiService {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly systemInstruction: string;

  constructor(private readonly config: GeminiServiceConfig) {
    if (!config.apiKey) {
      throw new Error('MISSING_API_KEY: GEMINI_API_KEY is required on the server runtime.');
    }
    this.model = config.model ?? 'gemini-2.5-pro';
    this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    this.temperature = config.temperature ?? 0.2;
    this.maxOutputTokens = config.maxOutputTokens ?? 2048;
    this.systemInstruction = config.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION;
  }

  async executeTask(payload: ExecutionPayload): Promise<AgentResponse> {
    const startedAt = Date.now();
    if (!payload.prompt?.trim()) {
      return this.failure(startedAt, 'EMPTY_PROMPT', 'Prompt is required.');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: this.systemInstruction }] },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: payload.context
                      ? `${payload.prompt}\n\nContext JSON:\n${JSON.stringify(payload.context)}`
                      : payload.prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: this.temperature,
              maxOutputTokens: this.maxOutputTokens,
            },
          }),
        },
      );

      if (!response.ok) {
        return this.failure(startedAt, `GEMINI_HTTP_${response.status}`, `Gemini request failed with HTTP ${response.status}.`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { totalTokenCount?: number };
      };
      const output = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';

      return {
        success: true,
        output,
        metadata: {
          latencyMs: Date.now() - startedAt,
          model: this.model,
          tokensUsed: data.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error) {
      return this.failure(
        startedAt,
        'GEMINI_NETWORK_ERROR',
        error instanceof Error ? error.message : 'Unknown Gemini execution error.',
      );
    }
  }

  private failure(startedAt: number, errorCode: string, output: string): AgentResponse {
    return {
      success: false,
      output,
      errorCode,
      metadata: { latencyMs: Date.now() - startedAt, model: this.model },
    };
  }
}

export function createGeminiServiceFromEnv(env: GeminiRuntimeEnv): GeminiService {
  return new GeminiService({ apiKey: env.GEMINI_API_KEY ?? '' });
}
