/** Lectura de env vars para AI Local Lab (sin throws). */

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** JSON plano de headers extra para fetch a Ollama (p. ej. ngrok). Inválido → {}. */
function parseExtraHeadersJson(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && key.trim() && typeof value === "string") {
        out[key.trim()] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getAiConfig() {
  return {
    provider: (process.env.AI_PROVIDER ?? "manual_chatgpt").trim() || "manual_chatgpt",
    enableOllamaDevApi: (process.env.ENABLE_OLLAMA_DEV_API ?? "").trim() === "true",
    ollamaBaseUrl: (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").trim(),
    ollamaExtraHeaders: parseExtraHeadersJson(process.env.OLLAMA_EXTRA_HEADERS_JSON?.trim()),
    modelFast: (process.env.OLLAMA_MODEL_FAST ?? "llama3.2:3b").trim(),
    modelSpanish: (process.env.OLLAMA_MODEL_SPANISH ?? "gemma3:4b").trim(),
    modelSmart: (process.env.OLLAMA_MODEL_SMART ?? "qwen3.5:latest").trim(),
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? "60000"),
    labEnabled: (process.env.AI_LAB_ENABLED ?? "").trim() === "true",
    labAllowedUserIds: parseCsv(process.env.AI_LAB_ALLOWED_USER_IDS?.trim()),
    labAllowedEmails: parseCsv(process.env.AI_LAB_ALLOWED_EMAILS?.trim()).map((e) =>
      e.toLowerCase(),
    ),
  };
}
