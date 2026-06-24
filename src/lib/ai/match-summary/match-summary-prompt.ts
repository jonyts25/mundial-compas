import type {
  MatchSummaryInput,
  MatchSummaryLlmOutput,
  MatchSummaryOutput,
} from "@/lib/ai/match-summary/match-summary-types";
import type { SportsNarratorPersonaId } from "@/lib/ai/sports-narrator-personas";
import {
  buildPersonaPromptBlock,
  SPORTS_NARRATOR_PERSONAS,
} from "@/lib/ai/sports-narrator-personas";

const CONFIDENCE_LEVELS = new Set(["alta", "media", "baja"]);

export function buildMatchSummaryPrompt(input: MatchSummaryInput): string {
  const gaps =
    input.data_gaps.length > 0
      ? input.data_gaps.join(", ")
      : "ninguno reportado";

  const statsBlock =
    input.statistics === null
      ? "ESTADÍSTICAS: no disponibles — PROHIBIDO mencionar posesión, tiros, corners, xG ni dominio del juego."
      : `ESTADÍSTICAS (única fuente):\n${JSON.stringify(input.statistics, null, 2)}`;

  const varNote =
    input.timeline.some((e) => e.type === "var" || e.type === "gol_anulado")
      ? "VAR: solo menciona revisiones o goles anulados si aparecen en event_facts_locked."
      : "VAR: no hay eventos VAR en el input — PROHIBIDO mencionar VAR, videoarbitraje o revisiones.";

  const eventFactsBlock =
    input.event_facts_locked && input.event_facts_locked.length > 0
      ? `EVENTOS BLOQUEADOS (event_facts_locked — NO reescribir, NO narrar en context_paragraphs):
${input.event_facts_locked.map((e) => `- [${e.minute_label}] ${e.sentence}`).join("\n")}
Los eventos del partido ya están escritos. Puedes referirte a ellos de forma general ("los goles", "las expulsiones") sin repetir minutos ni jugadores, o citar sentence exactamente si hace falta.
PROHIBIDO inventar mecanismo de tarjetas, estilo de gol ni causalidad no soportada.`
      : "EVENTOS: cronología vacía — no inventes goles, tarjetas ni VAR.";

  const verifiedFactsBlock =
    input.verified_facts && input.verified_facts.length > 0
      ? `HECHOS VERIFICADOS (generados por código — se adjuntan al output sin IA):\n${input.verified_facts.map((f) => `- ${f}`).join("\n")}`
      : "";

  const namesBlock =
    input.facts_locked && input.facts_locked.length > 0
      ? `NOMBRES BLOQUEADOS (facts_locked — copiar EXACTAMENTE si mencionas jugadores):
${input.facts_locked.map((n) => `- "${n}"`).join("\n")}
PROHIBIDO: expandir "J." → Joaquín/Julián, "R." → Ricardo/Raúl, etc.
PROHIBIDO: inventar nombres completos que no estén en facts_locked.
standout_player.name debe ser una cadena idéntica a un nombre en facts_locked si aplica.`
      : "";

  const forbiddenBlock = `PALABRAS Y FRASES PROHIBIDAS (en cualquier campo que generes):
- segunda amarilla, doble amarilla, acumulación, roja directa, gol normal
- desestabilizó, cambió el curso, confirmó el resultado, confirmando el resultado`;

  const venueNote =
    input.match.venue === null
      ? "SEDE: no disponible — no inventes estadio ni ciudad."
      : `SEDE: ${input.match.venue}`;

  const refereeNote =
    input.match.referee === null
      ? "ÁRBITRO: no disponible — no lo menciones."
      : `ÁRBITRO: ${input.match.referee}`;

  return `Redacta un resumen post-partido de quiniela Mundial Compas.

${buildPersonaPromptBlock(input.persona_id)}

INPUT JSON (única fuente de verdad — no uses conocimiento externo):
${JSON.stringify(input, null, 2)}

${statsBlock}
${varNote}
${eventFactsBlock}
${verifiedFactsBlock}
${namesBlock}
${forbiddenBlock}
${venueNote}
${refereeNote}
DATA_GAPS del builder: ${gaps}

REGLAS ESTRICTAS:
- Usa SOLO datos del JSON de entrada.
- NO generes facts[] ni event_paragraphs — el sistema los adjunta por código.
- context_paragraphs = contexto del partido (grupo, ambiente, dinámica general) SIN narrar minuto a minuto ni reescribir event_facts_locked.
- closing_paragraph = cierre breve con la voz ficticia; sin inventar eventos nuevos.
- standout_player: solo si hay jugador en timeline con gol/penalty; si no hay base, null.
- table_impact: solo si standings_context tiene posiciones; si null, null.
- quiniela_impact: solo si quiniela_impact en input; sin picks individuales ni usuarios.
- confidence: alta si timeline + marcador + (stats o standings); media si faltan stats; baja si timeline vacío.
- data_gaps_acknowledged: lista breve en español de lo que no pudiste narrar por falta de datos.
- No recomiendes apuestas ni picks.
- No copies frases de TV ni comentaristas reales.

Responde SOLO JSON válido con esta forma exacta:
{
  "version": "match-summary-llm-v1",
  "partido_id": "${input.partido_id}",
  "persona_id": "${input.persona_id}",
  "headline": "string",
  "lede": "string",
  "context_paragraphs": ["string"],
  "closing_paragraph": "string",
  "standout_player": null | { "name": "string", "reason": "string" },
  "table_impact": null | "string",
  "quiniela_impact": null | "string",
  "confidence": "alta|media|baja",
  "data_gaps_acknowledged": ["string"]
}`;
}

export function isMatchSummaryLlmOutput(
  value: unknown,
  expected: { partido_id: string; persona_id: SportsNarratorPersonaId },
): value is MatchSummaryLlmOutput {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;

  if (o.version !== "match-summary-llm-v1") return false;
  if (o.partido_id !== expected.partido_id) return false;
  if (o.persona_id !== expected.persona_id) return false;
  if (typeof o.headline !== "string" || !o.headline.trim()) return false;
  if (typeof o.lede !== "string" || !o.lede.trim()) return false;
  if (
    !Array.isArray(o.context_paragraphs) ||
    o.context_paragraphs.length === 0 ||
    !o.context_paragraphs.every((p) => typeof p === "string" && p.trim())
  ) {
    return false;
  }
  if (typeof o.closing_paragraph !== "string" || !o.closing_paragraph.trim()) {
    return false;
  }

  if (o.standout_player !== null) {
    if (typeof o.standout_player !== "object") return false;
    const sp = o.standout_player as Record<string, unknown>;
    if (typeof sp.name !== "string" || !sp.name.trim()) return false;
    if (typeof sp.reason !== "string" || !sp.reason.trim()) return false;
  }

  if (o.table_impact !== null && typeof o.table_impact !== "string") return false;
  if (o.quiniela_impact !== null && typeof o.quiniela_impact !== "string") return false;

  if (typeof o.confidence !== "string" || !CONFIDENCE_LEVELS.has(o.confidence)) {
    return false;
  }

  if (
    !Array.isArray(o.data_gaps_acknowledged) ||
    !o.data_gaps_acknowledged.every((g) => typeof g === "string")
  ) {
    return false;
  }

  return true;
}

export function normalizeMatchSummaryLlmOutput(
  raw: MatchSummaryLlmOutput,
): MatchSummaryLlmOutput {
  return {
    ...raw,
    headline: raw.headline.trim(),
    lede: raw.lede.trim(),
    context_paragraphs: raw.context_paragraphs.map((p) => p.trim()),
    closing_paragraph: raw.closing_paragraph.trim(),
    table_impact: raw.table_impact?.trim() ?? null,
    quiniela_impact: raw.quiniela_impact?.trim() ?? null,
    standout_player: raw.standout_player
      ? {
          name: raw.standout_player.name.trim(),
          reason: raw.standout_player.reason.trim(),
        }
      : null,
    data_gaps_acknowledged: raw.data_gaps_acknowledged.map((g) => g.trim()),
  };
}

/** @deprecated Usar isMatchSummaryLlmOutput + assembleMatchSummaryOutput */
export function isMatchSummaryOutput(
  value: unknown,
  expected: { partido_id: string; persona_id: SportsNarratorPersonaId },
): value is MatchSummaryOutput {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;

  if (o.version !== "match-summary-v1") return false;
  if (o.partido_id !== expected.partido_id) return false;
  if (o.persona_id !== expected.persona_id) return false;
  if (typeof o.headline !== "string" || !o.headline.trim()) return false;
  if (typeof o.lede !== "string" || !o.lede.trim()) return false;
  if (
    !Array.isArray(o.body_paragraphs) ||
    o.body_paragraphs.length === 0 ||
    !o.body_paragraphs.every((p) => typeof p === "string" && p.trim())
  ) {
    return false;
  }
  if (!Array.isArray(o.facts) || o.facts.length === 0) {
    return false;
  }
  if (!o.facts.every((f) => typeof f === "string" && f.trim())) return false;

  if (o.standout_player !== null) {
    if (typeof o.standout_player !== "object") return false;
    const sp = o.standout_player as Record<string, unknown>;
    if (typeof sp.name !== "string" || !sp.name.trim()) return false;
    if (typeof sp.reason !== "string" || !sp.reason.trim()) return false;
  }

  if (o.table_impact !== null && typeof o.table_impact !== "string") return false;
  if (o.quiniela_impact !== null && typeof o.quiniela_impact !== "string") return false;

  if (typeof o.confidence !== "string" || !CONFIDENCE_LEVELS.has(o.confidence)) {
    return false;
  }

  if (
    !Array.isArray(o.data_gaps_acknowledged) ||
    !o.data_gaps_acknowledged.every((g) => typeof g === "string")
  ) {
    return false;
  }

  return true;
}

export function normalizeMatchSummaryOutput(
  raw: MatchSummaryOutput,
): MatchSummaryOutput {
  return {
    ...raw,
    headline: raw.headline.trim(),
    lede: raw.lede.trim(),
    context_paragraphs: raw.context_paragraphs?.map((p) => p.trim()),
    event_paragraphs: raw.event_paragraphs?.map((p) => p.trim()),
    closing_paragraph: raw.closing_paragraph?.trim(),
    body_paragraphs: raw.body_paragraphs.map((p) => p.trim()),
    facts: raw.facts.map((f) => f.trim()),
    table_impact: raw.table_impact?.trim() ?? null,
    quiniela_impact: raw.quiniela_impact?.trim() ?? null,
    standout_player: raw.standout_player
      ? {
          name: raw.standout_player.name.trim(),
          reason: raw.standout_player.reason.trim(),
        }
      : null,
    data_gaps_acknowledged: raw.data_gaps_acknowledged.map((g) => g.trim()),
  };
}

export function isValidPersonaId(
  id: unknown,
): id is SportsNarratorPersonaId {
  return typeof id === "string" && id in SPORTS_NARRATOR_PERSONAS;
}
