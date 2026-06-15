/**
 * Pick Value Engine — Fase 0 del Prediction Engine (Sprint 1.5).
 *
 * Interpreta la distribución de picks (de `computePickAggregates`, Fase B) para
 * un marcador concreto y devuelve: popularidad exacta, popularidad 1X2, riesgo,
 * tipo de pick y un mensaje narrativo responsable.
 *
 * Restricciones cumplidas:
 *  - 100% TypeScript puro: sin fetch, sin red, sin BD, sin efectos.
 *  - Solo lectura / reversible. No toca scoring, triggers, webhooks ni LigaPro.
 *  - Sin IA, sin LLM, sin APIs externas.
 *  - Sin PII: solo recibe marcadores y nombres de equipo opcionales.
 *
 * Reutiliza (no duplica) `src/lib/insights/pick-aggregates.ts`.
 */

import {
  outcomeLabel,
  outcomeOf,
  type Outcome,
  type PickAggregates,
} from "@/lib/insights/pick-aggregates";

export type PickRisk = "bajo" | "medio" | "alto" | "extremo";
export type PickKind = "popular" | "balanceado" | "diferencial" | "raro";

/** Pick a evaluar (marcador exacto). */
export interface PickValueInput {
  local: number;
  visitante: number;
}

/** Contexto opcional para enriquecer el mensaje (sin PII). */
export interface PickValueContext {
  homeName?: string;
  awayName?: string;
}

export interface PickValueOptions {
  minSample?: number;
  context?: PickValueContext;
}

export interface PickValue {
  // Popularidad del marcador exacto
  scoreSharePct: number;
  isMostPopularScore: boolean;
  // Popularidad del resultado 1X2
  outcome: Outcome;
  outcomeSharePct: number;
  isMostPopularOutcome: boolean;
  // Derivados
  risk: PickRisk;
  kind: PickKind;
  // Narrativa responsable
  message: string;
  // Muestra
  total: number;
  sampleOk: boolean;
}

/** Umbrales configurables (eje único: % del marcador exacto). */
export const pickValueThresholds = {
  minSample: 5,
  /** Cota inferior (inclusive) de `scoreSharePct` para cada categoría. */
  popular: 20,
  balanceado: 10,
  diferencial: 3,
  /** % a partir del cual el RESULTADO 1X2 se considera mayoritario. */
  majorityOutcome: 50,
} as const;

export const DISCLAIMER =
  "Estimación recreativa basada en datos disponibles, no es garantía.";

function kindFromShare(scoreSharePct: number): PickKind {
  if (scoreSharePct >= pickValueThresholds.popular) return "popular";
  if (scoreSharePct >= pickValueThresholds.balanceado) return "balanceado";
  if (scoreSharePct >= pickValueThresholds.diferencial) return "diferencial";
  return "raro";
}

function riskFromShare(scoreSharePct: number): PickRisk {
  if (scoreSharePct >= pickValueThresholds.popular) return "bajo";
  if (scoreSharePct >= pickValueThresholds.balanceado) return "medio";
  if (scoreSharePct >= pickValueThresholds.diferencial) return "alto";
  return "extremo";
}

function findScoreSharePct(
  aggregates: PickAggregates,
  pick: PickValueInput,
): number {
  const bucket = aggregates.exactScores.find(
    (b) => b.local === pick.local && b.visitante === pick.visitante,
  );
  return bucket?.pct ?? 0;
}

function findOutcomeSharePct(aggregates: PickAggregates, outcome: Outcome): number {
  const bucket = aggregates.outcomes.find((b) => b.outcome === outcome);
  return bucket?.pct ?? 0;
}

/**
 * Calcula el valor de un pick a partir de los agregados ya computados.
 * Pura: mismas entradas → misma salida.
 */
export function computePickValue(
  aggregates: PickAggregates,
  pick: PickValueInput,
  options: PickValueOptions = {},
): PickValue {
  const minSample = options.minSample ?? pickValueThresholds.minSample;
  const total = aggregates.total;
  const sampleOk = total >= minSample;

  const outcome = outcomeOf(pick.local, pick.visitante);
  const scoreSharePct = findScoreSharePct(aggregates, pick);
  const outcomeSharePct = findOutcomeSharePct(aggregates, outcome);

  const isMostPopularScore =
    aggregates.mostPopularScore != null &&
    aggregates.mostPopularScore.local === pick.local &&
    aggregates.mostPopularScore.visitante === pick.visitante;

  const isMostPopularOutcome =
    aggregates.mostPopularOutcome != null &&
    aggregates.mostPopularOutcome.outcome === outcome;

  const kind = kindFromShare(scoreSharePct);
  const risk = riskFromShare(scoreSharePct);

  const value: PickValue = {
    scoreSharePct,
    isMostPopularScore,
    outcome,
    outcomeSharePct,
    isMostPopularOutcome,
    risk,
    kind,
    message: "",
    total,
    sampleOk,
  };

  value.message = buildPickValueMessage(value, options.context);
  return value;
}

/** Construye un mensaje responsable (sin tono de apuesta) a partir del valor. */
export function buildPickValueMessage(
  value: PickValue,
  ctx: PickValueContext = {},
): string {
  if (!value.sampleOk) {
    return "Aún hay pocos pronósticos para comparar este pick.";
  }

  const share = value.scoreSharePct;

  // Caso destacado: el RESULTADO es mayoritario pero el MARCADOR es diferencial/raro.
  const outcomeIsMajority =
    value.outcomeSharePct >= pickValueThresholds.majorityOutcome;
  const scoreIsLongshot = value.kind === "diferencial" || value.kind === "raro";

  if (outcomeIsMajority && scoreIsLongshot) {
    const mayoria = describeMajorityOutcome(value.outcome, ctx);
    return `La mayoría espera ${mayoria} (${value.outcomeSharePct}%), pero tu marcador exacto es diferencial: solo el ${share}% lo eligió. Puede mover la tabla si pega.`;
  }

  switch (value.kind) {
    case "popular":
      return `Pick popular: tu marcador coincide con el ${share}% de los participantes. Buen camino si quieres mantener posición.`;
    case "balanceado":
      return `Elección equilibrada: el ${share}% eligió este marcador.`;
    case "diferencial":
      return `Pick diferencial: solo el ${share}% eligió este marcador. Alto potencial si pega.`;
    case "raro":
      return `Pick arriesgado: casi nadie eligió este marcador (${share}%). Máxima ventaja, mínima popularidad.`;
  }
}

function describeMajorityOutcome(outcome: Outcome, ctx: PickValueContext): string {
  switch (outcome) {
    case "local":
      return ctx.homeName ? `victoria de ${ctx.homeName}` : "victoria local";
    case "visitante":
      return ctx.awayName ? `victoria de ${ctx.awayName}` : "victoria visitante";
    case "empate":
      return "el empate";
  }
}

/** Etiqueta corta para UI a partir del tipo de pick. */
export function pickKindLabel(kind: PickKind): string {
  switch (kind) {
    case "popular":
      return "Pick popular";
    case "balanceado":
      return "Pick equilibrado";
    case "diferencial":
      return "Pick diferencial";
    case "raro":
      return "Pick raro";
  }
}

/** Emoji asociado al tipo de pick (UI). */
export function pickKindEmoji(kind: PickKind): string {
  switch (kind) {
    case "popular":
      return "🟢";
    case "balanceado":
      return "⚖️";
    case "diferencial":
      return "🃏";
    case "raro":
      return "🎲";
  }
}

/** Etiqueta de riesgo para UI. */
export function pickRiskLabel(risk: PickRisk): string {
  switch (risk) {
    case "bajo":
      return "riesgo bajo";
    case "medio":
      return "riesgo medio";
    case "alto":
      return "riesgo alto";
    case "extremo":
      return "riesgo extremo";
  }
}

// Re-export por conveniencia para consumidores del motor.
export { outcomeLabel };
