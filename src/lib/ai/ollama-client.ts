import { getAiConfig } from "@/lib/ai/ai-config";

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface OllamaHealthResult {
  ok: boolean;
  provider: "ollama_local";
  baseUrlReachable: boolean;
  models?: string[];
  error?: string;
}

export interface OllamaChatResult {
  ok: true;
  content: string;
  model: string;
}

export interface OllamaChatError {
  ok: false;
  error: string;
}

export interface OllamaJsonResult<T> {
  ok: true;
  data: T;
  model: string;
}

export interface OllamaJsonError {
  ok: false;
  error: string;
  rawPreview?: string;
}

function baseUrl(): string {
  return getAiConfig().ollamaBaseUrl.replace(/\/$/, "");
}

function timeoutMs(): number {
  const n = getAiConfig().timeoutMs;
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

function buildOllamaHeaders(initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  for (const [key, value] of Object.entries(getAiConfig().ollamaExtraHeaders)) {
    headers.set(key, value);
  }
  return headers;
}

async function fetchOllama(
  path: string,
  init?: RequestInit & { timeout?: number },
): Promise<Response> {
  const controller = new AbortController();
  const ms = init?.timeout ?? timeoutMs();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: buildOllamaHeaders(init?.headers),
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** GET /api/tags — salud y modelos instalados. */
export async function ollamaHealth(): Promise<OllamaHealthResult> {
  try {
    const res = await fetchOllama("/api/tags", { timeout: 10_000 });
    if (!res.ok) {
      return {
        ok: false,
        provider: "ollama_local",
        baseUrlReachable: false,
        error: "OLLAMA_UNAVAILABLE",
      };
    }
    const body = (await res.json()) as {
      models?: { name: string }[];
    };
    const models = (body.models ?? []).map((m) => m.name);
    return {
      ok: true,
      provider: "ollama_local",
      baseUrlReachable: true,
      models,
    };
  } catch {
    return {
      ok: false,
      provider: "ollama_local",
      baseUrlReachable: false,
      error: "OLLAMA_UNAVAILABLE",
    };
  }
}

/** POST /api/chat — stream: false. */
export async function ollamaChat(options: {
  model: string;
  messages: OllamaChatMessage[];
  json?: boolean;
}): Promise<OllamaChatResult | OllamaChatError> {
  try {
    const res = await fetchOllama("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        stream: false,
        ...(options.json ? { format: "json" } : {}),
      }),
    });

    if (!res.ok) {
      return { ok: false, error: "OLLAMA_CHAT_FAILED" };
    }

    const body = (await res.json()) as {
      message?: { content?: string };
    };
    const content = body.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "OLLAMA_EMPTY_RESPONSE" };
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[ollama] chat ok", { model: options.model, chars: content.length });
    }

    return { ok: true, content, model: options.model };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "OLLAMA_TIMEOUT" : "OLLAMA_UNAVAILABLE",
    };
  }
}

/** Chat con parseo JSON y validación básica. */
export async function ollamaJson<T>(
  options: {
    model: string;
    messages: OllamaChatMessage[];
    validate: (value: unknown) => value is T;
  },
): Promise<OllamaJsonResult<T> | OllamaJsonError> {
  const chat = await ollamaChat({
    model: options.model,
    messages: options.messages,
    json: true,
  });

  if (!chat.ok) {
    return chat;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(chat.content) as unknown;
  } catch {
    return {
      ok: false,
      error: "OLLAMA_INVALID_JSON",
      rawPreview: chat.content.slice(0, 400),
    };
  }

  if (!options.validate(parsed)) {
    return {
      ok: false,
      error: "OLLAMA_JSON_SCHEMA_MISMATCH",
      rawPreview: chat.content.slice(0, 400),
    };
  }

  return { ok: true, data: parsed, model: chat.model };
}
