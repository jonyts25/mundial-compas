import type { MatchSummaryInput } from "@/lib/ai/match-summary/match-summary-types";

export const AI_SUMMARY_UNAVAILABLE_MESSAGE =
  "La IA no está disponible en este momento. Puedes volver a intentar más tarde.";

const UNAVAILABLE_CODES = new Set([
  "OLLAMA_UNAVAILABLE",
  "OLLAMA_TIMEOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

export type AiSummaryUnavailableReason =
  | "ollama_unavailable"
  | "ollama_timeout"
  | "network"
  | "other";

export function isAiSummaryUnavailableError(
  error: string | null | undefined,
): boolean {
  if (!error) return false;
  const code = error.trim().toUpperCase();
  if (UNAVAILABLE_CODES.has(code)) return true;
  if (code.includes("TIMEOUT")) return true;
  if (code.includes("UNAVAILABLE")) return true;
  return false;
}

export function classifyAiSummaryUnavailableReason(
  error: string | null | undefined,
  networkFailure = false,
): AiSummaryUnavailableReason {
  if (networkFailure) return "network";
  const code = (error ?? "").trim().toUpperCase();
  if (code === "OLLAMA_TIMEOUT" || code.includes("TIMEOUT")) {
    return "ollama_timeout";
  }
  if (code === "OLLAMA_UNAVAILABLE" || code.includes("UNAVAILABLE")) {
    return "ollama_unavailable";
  }
  return "other";
}

export function parseMatchSummaryInput(
  value: unknown,
): MatchSummaryInput | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (o.version !== "match-summary-v1") return null;
  if (typeof o.partido_id !== "string") return null;
  if (!o.match || typeof o.match !== "object") return null;
  if (!Array.isArray(o.timeline)) return null;
  return value as MatchSummaryInput;
}

export type MatchSummaryApiError = {
  unavailable: boolean;
  message: string;
  errorCode: string | null;
  input: MatchSummaryInput | null;
  reason: AiSummaryUnavailableReason;
};

export function parseMatchSummaryApiFailure(
  data: Record<string, unknown>,
  networkFailure = false,
): MatchSummaryApiError {
  const errorCode =
    typeof data.error === "string" ? data.error : null;
  const unavailable =
    networkFailure || isAiSummaryUnavailableError(errorCode);
  const reason = classifyAiSummaryUnavailableReason(errorCode, networkFailure);
  const input = parseMatchSummaryInput(data.input);

  return {
    unavailable,
    message: unavailable
      ? AI_SUMMARY_UNAVAILABLE_MESSAGE
      : errorCode ?? "No se pudo generar el resumen",
    errorCode,
    input,
    reason,
  };
}
