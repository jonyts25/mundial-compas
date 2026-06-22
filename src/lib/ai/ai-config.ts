/** Lectura de env vars para AI Local Lab (sin throws). */

function optional(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

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
    provider: optional("AI_PROVIDER") ?? "manual_chatgpt",
    enableOllamaDevApi: optional("ENABLE_OLLAMA_DEV_API") === "true",
    ollamaBaseUrl: optional("OLLAMA_BASE_URL") ?? "http://localhost:11434",
    ollamaExtraHeaders: parseExtraHeadersJson(optional("OLLAMA_EXTRA_HEADERS_JSON")),
    modelFast: optional("OLLAMA_MODEL_FAST") ?? "llama3.2:3b",
    modelSpanish: optional("OLLAMA_MODEL_SPANISH") ?? "gemma3:4b",
    modelSmart: optional("OLLAMA_MODEL_SMART") ?? "qwen3.5:latest",
    timeoutMs: Number(optional("OLLAMA_TIMEOUT_MS") ?? "60000"),
    labEnabled: optional("AI_LAB_ENABLED") === "true",
    labAllowedUserIds: parseCsv(optional("AI_LAB_ALLOWED_USER_IDS")),
    labAllowedEmails: parseCsv(optional("AI_LAB_ALLOWED_EMAILS")).map((e) =>
      e.toLowerCase(),
    ),
  };
}
