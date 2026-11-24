import { z } from "zod";

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()),
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ChatMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("system"), content: z.string() }),
  z.object({ role: z.literal("user"), content: z.string() }),
  z.object({ role: z.literal("assistant"), content: z.string().nullable().optional(), tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({ name: z.string(), arguments: z.string() }),
  })).optional() }),
  z.object({ role: z.literal("tool"), tool_call_id: z.string(), content: z.string() }),
]);
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export type ModelRequest = {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
};

export type ToolCallRequest = {
  id: string;
  name: string;
  argumentsJson: string;
};

export type ModelResponse = {
  content: string | null;
  toolCalls: ToolCallRequest[];
  raw?: unknown;
};

export interface ModelClient {
  complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
}

export type MockScriptedTurn =
  | { type: "message"; content: string }
  | { type: "tools"; calls: Array<{ name: string; arguments: Record<string, unknown>; id?: string }> };

/**
 * Deterministic model for tests. Each complete() consumes the next scripted turn.
 */
export class MockModelClient implements ModelClient {
  private index = 0;

  constructor(private readonly turns: MockScriptedTurn[]) {}

  async complete(_request: ModelRequest, _signal?: AbortSignal): Promise<ModelResponse> {
    const turn = this.turns[this.index++];
    if (!turn) {
      return { content: "Mock model has no more scripted turns.", toolCalls: [] };
    }
    if (turn.type === "message") {
      return { content: turn.content, toolCalls: [] };
    }
    return {
      content: null,
      toolCalls: turn.calls.map((call, i) => ({
        id: call.id ?? `mock_tool_${this.index}_${i}`,
        name: call.name,
        argumentsJson: JSON.stringify(call.arguments),
      })),
    };
  }
}

export type OpenAICompatibleConfig = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  fetchImpl?: typeof fetch;
};

/**
 * Provider-neutral OpenAI-compatible chat completions adapter
 * (OpenAI, many local gateways, compatible hosts).
 */
export class OpenAICompatibleModelClient implements ModelClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OpenAICompatibleConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = config.model;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    const body = {
      model: this.model,
      temperature: request.temperature ?? 0,
      messages: request.messages,
      tools: request.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
    };

    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Model provider error ${res.status}: ${text.slice(0, 500)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const message = json.choices?.[0]?.message;
    const toolCalls =
      message?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        argumentsJson: tc.function.arguments,
      })) ?? [];

    return {
      content: message?.content ?? null,
      toolCalls,
      raw: json,
    };
  }
}

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string; apiKeyEnv: string[] }> = {
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    apiKeyEnv: ["MODEL_API_KEY", "MISTRAL_API_KEY"],
  },
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyEnv: ["MODEL_API_KEY", "OPENAI_API_KEY"],
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyEnv: ["MODEL_API_KEY", "OPENAI_API_KEY"],
  },
};

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveBaseUrl(provider: string, requested: string | undefined, fallback: string): string {
  const baseUrl = trimEnv(requested) ?? fallback;
  // Common misconfig: MODEL_PROVIDER=mistral but MODEL_BASE_URL left as OpenAI.
  if (
    provider === "mistral" &&
    /api\.openai\.com/i.test(baseUrl)
  ) {
    return fallback;
  }
  return baseUrl.replace(/\/$/, "");
}

export function createModelClientFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ModelClient {
  const provider = (trimEnv(env.MODEL_PROVIDER) ?? "mistral").toLowerCase();
  if (provider === "mock") {
    return new MockModelClient([{ type: "message", content: "Mock provider has no scripted turns configured." }]);
  }

  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS["openai-compatible"]!;
  const apiKey = defaults.apiKeyEnv
    .map((key) => trimEnv(env[key]))
    .find((value) => Boolean(value));
  if (!apiKey) {
    throw new Error(
      `MODEL_API_KEY is required for live agentic mode (provider=${provider}). ` +
        `For Mistral you can also set MISTRAL_API_KEY. Use MODEL_PROVIDER=mock only for scripted tests.`,
    );
  }

  const baseUrl = resolveBaseUrl(provider, env.MODEL_BASE_URL, defaults.baseUrl);
  const model = trimEnv(env.MODEL_NAME) ?? defaults.model;

  return new OpenAICompatibleModelClient({
    apiKey,
    baseUrl,
    model,
  });
}

