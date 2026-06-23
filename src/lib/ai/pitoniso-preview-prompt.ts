import type {
  PitonisoLabInput,
  PitonisoLabPreviewResult,
  PitonisoLabRiskLabel,
} from "@/lib/ai/pitoniso-lab-types";
import {
  AI_SPORTS_PROMPT_GUARDRAILS,
  formatMatchBlock,
} from "@/lib/ai/ai-sports-prompt-guardrails";

const RISK_LABELS = new Set<PitonisoLabRiskLabel>(["bajo", "medio", "alto"]);

export function buildPitonisoPreviewPrompt(input: PitonisoLabInput): string {
  const { signals } = input;
  return `Eres un cronista divertido de quiniela (Mundial Compas). Explica las señales recibidas.

PARTIDO (única fuente de verdad para equipos, sede y ciudad):
${formatMatchBlock(input)}

SEÑALES (única fuente de verdad para análisis):
- Multitud: ${signals.crowd ?? "no tengo esa señal"}
- Forma: ${signals.form ?? "no tengo esa señal"}
- Tabla: ${signals.table ?? "no tengo esa señal"}
- Ranking: ${signals.ranking ?? "no tengo esa señal"}
- Señal de empate: ${signals.drawSignal ?? "no tengo esa señal"}
- Contradicciones: ${
    signals.contradictions?.length
      ? signals.contradictions.join(", ")
      : "ninguna reportada"
  }

${AI_SPORTS_PROMPT_GUARDRAILS}

- Máximo 2 bullets.

Responde SOLO JSON válido con esta forma exacta:
{
  "headline": "string",
  "summary": "string",
  "risk_label": "bajo|medio|alto",
  "bullets": ["string"],
  "disclaimer": "string"
}`;
}

export function isPitonisoLabPreviewResult(
  value: unknown,
): value is PitonisoLabPreviewResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.headline !== "string" || !o.headline.trim()) return false;
  if (typeof o.summary !== "string" || !o.summary.trim()) return false;
  if (typeof o.risk_label !== "string" || !RISK_LABELS.has(o.risk_label as PitonisoLabRiskLabel)) {
    return false;
  }
  if (!Array.isArray(o.bullets) || o.bullets.length === 0 || o.bullets.length > 2) {
    return false;
  }
  if (!o.bullets.every((b) => typeof b === "string" && b.trim())) return false;
  if (typeof o.disclaimer !== "string" || !o.disclaimer.trim()) return false;
  return true;
}

export function normalizePitonisoPreview(
  raw: PitonisoLabPreviewResult,
): PitonisoLabPreviewResult {
  return {
    headline: raw.headline.trim(),
    summary: raw.summary.trim(),
    risk_label: raw.risk_label,
    bullets: raw.bullets.map((b) => b.trim()).slice(0, 2),
    disclaimer: raw.disclaimer.trim(),
  };
}
