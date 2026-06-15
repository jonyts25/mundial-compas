/**
 * Match Preview — motor rule-based (Sports Core · SC-3).
 *
 * Calcula veredicto 1X2 recreativo a partir de multitud, tabla, forma y contexto.
 * Sin marca, sin copy, sin fetch, sin efectos.
 *
 * TODO(SC-4): importar PickAggregates desde sports-core/predictions/aggregates.
 * TODO(SC-6): renombrar local/visitante → home/away en tipos canónicos.
 */

import type { Outcome, PickAggregates, ScoreBucket } from "@/lib/insights/pick-aggregates";

export const matchPreviewWeights = {
  crowd: 0.4,
  table: 0.2,
  form: 0.25,
  context: 0.15,
} as const;

export const matchPreviewMinSample = 5;

export type MatchPreviewConfidence =
  | "indeciso"
  | "leve"
  | "bastante"
  | "presentimiento";

export type MatchPreviewFavorite = Outcome;

export interface MatchPreviewTeamInput {
  tablePosition: number | null;
  groupSize: number | null;
  formNorm: number | null;
  pointsFromTop2: number | null;
}

export interface MatchPreviewInput {
  aggregates: PickAggregates;
  local: MatchPreviewTeamInput;
  visitante: MatchPreviewTeamInput;
  isKnockout?: boolean;
  isGroupPhase?: boolean;
  isLastGroupMatch?: boolean;
  minSample?: number;
}

export interface MatchPreviewSignals {
  crowdLocal: number;
  crowdDraw: number;
  crowdAway: number;
  tableLocal: number;
  tableAway: number;
  formLocal: number;
  formAway: number;
  ctxLocal: number;
  ctxAway: number;
  drawTableBlend: number;
  drawFormBlend: number;
}

export interface MatchPreviewScores {
  local: number;
  draw: number;
  visitante: number;
}

export interface MatchPreviewVerdict {
  favorite: MatchPreviewFavorite;
  confidence: MatchPreviewConfidence;
  margin: number;
  scores: MatchPreviewScores;
  signals: MatchPreviewSignals;
  crowdSampleOk: boolean;
  totalPicks: number;
  mostPopularScore: ScoreBucket | null;
  nonCrowdAgreementCount: number;
}

const NEUTRAL = 1 / 3;
const DEFAULT_NORM = 0.5;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function tableNorm(position: number | null, groupSize: number | null): number {
  if (position == null || groupSize == null || groupSize <= 1) {
    return DEFAULT_NORM;
  }
  return clamp01(1 - (position - 1) / (groupSize - 1));
}

function formNorm(value: number | null): number {
  if (value == null) return DEFAULT_NORM;
  return clamp01(value);
}

function computeContextSignals(input: MatchPreviewInput): { ctxLocal: number; ctxAway: number } {
  let ctxLocal = DEFAULT_NORM;
  let ctxAway = DEFAULT_NORM;

  if (input.isGroupPhase) {
    ctxLocal = clamp01(ctxLocal + 0.05);
  }

  if (input.isKnockout) {
    const lp = input.local.tablePosition;
    const ap = input.visitante.tablePosition;
    if (lp != null && ap != null) {
      if (lp > ap) {
        ctxLocal = clamp01(ctxLocal + 0.15);
      } else if (ap > lp) {
        ctxAway = clamp01(ctxAway + 0.15);
      }
    }
  }

  if (input.isLastGroupMatch) {
    const localGap = input.local.pointsFromTop2;
    if (localGap != null && localGap > 0 && localGap <= 3) {
      ctxLocal = clamp01(ctxLocal + 0.1);
    }
    const awayGap = input.visitante.pointsFromTop2;
    if (awayGap != null && awayGap > 0 && awayGap <= 3) {
      ctxAway = clamp01(ctxAway + 0.1);
    }
  }

  return { ctxLocal, ctxAway };
}

function crowdFromAggregates(
  aggregates: PickAggregates,
  minSample: number,
): { local: number; draw: number; away: number; sampleOk: boolean } {
  const sampleOk = aggregates.total >= minSample;
  if (!sampleOk || aggregates.total === 0) {
    return { local: NEUTRAL, draw: NEUTRAL, away: NEUTRAL, sampleOk };
  }
  const byOutcome = (o: Outcome) =>
    (aggregates.outcomes.find((b) => b.outcome === o)?.pct ?? 0) / 100;
  return {
    local: byOutcome("local"),
    draw: byOutcome("empate"),
    away: byOutcome("visitante"),
    sampleOk,
  };
}

function drawBlend(a: number, b: number): number {
  return clamp01((1 - Math.abs(a - b)) * 0.5);
}

function computeScores(signals: MatchPreviewSignals): MatchPreviewScores {
  const w = matchPreviewWeights;
  return {
    local:
      w.crowd * signals.crowdLocal +
      w.table * signals.tableLocal +
      w.form * signals.formLocal +
      w.context * signals.ctxLocal,
    draw:
      w.crowd * signals.crowdDraw +
      w.table * signals.drawTableBlend +
      w.form * signals.drawFormBlend +
      w.context * 0.5,
    visitante:
      w.crowd * signals.crowdAway +
      w.table * signals.tableAway +
      w.form * signals.formAway +
      w.context * signals.ctxAway,
  };
}

function favoriteFromScores(scores: MatchPreviewScores): {
  favorite: MatchPreviewFavorite;
  margin: number;
} {
  const entries: [MatchPreviewFavorite, number][] = [
    ["local", scores.local],
    ["empate", scores.draw],
    ["visitante", scores.visitante],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const favorite = entries[0][0];
  const margin = entries[0][1] - entries[1][1];
  return { favorite, margin };
}

function nonCrowdAgreement(
  favorite: MatchPreviewFavorite,
  signals: MatchPreviewSignals,
): number {
  let count = 0;
  if (favorite === "local") {
    if (signals.tableLocal >= signals.tableAway) count += 1;
    if (signals.formLocal >= signals.formAway) count += 1;
    if (signals.ctxLocal > signals.ctxAway) count += 1;
  } else if (favorite === "visitante") {
    if (signals.tableAway >= signals.tableLocal) count += 1;
    if (signals.formAway >= signals.formLocal) count += 1;
    if (signals.ctxAway > signals.ctxLocal) count += 1;
  } else {
    if (signals.drawTableBlend >= 0.4) count += 1;
    if (signals.drawFormBlend >= 0.4) count += 1;
    if (Math.abs(signals.crowdDraw - NEUTRAL) <= 0.08) count += 1;
  }
  return count;
}

function resolveConfidence(
  margin: number,
  crowdSampleOk: boolean,
  favorite: MatchPreviewFavorite,
  signals: MatchPreviewSignals,
  nonCrowdAgreementCount: number,
): MatchPreviewConfidence {
  const formsNeutral =
    Math.abs(signals.formLocal - DEFAULT_NORM) < 0.05 &&
    Math.abs(signals.formAway - DEFAULT_NORM) < 0.05;

  if (margin < 0.08 || (!crowdSampleOk && formsNeutral && margin < 0.12)) {
    return "indeciso";
  }

  let confidence: MatchPreviewConfidence;
  if (margin < 0.15) {
    confidence = "leve";
  } else if (margin < 0.25) {
    confidence = crowdSampleOk ? "bastante" : "leve";
  } else if (nonCrowdAgreementCount >= 2 && crowdSampleOk) {
    confidence = "presentimiento";
  } else {
    confidence = "bastante";
  }

  if (!crowdSampleOk) {
    confidence = "leve";
  }

  if (confidence === "presentimiento" && nonCrowdAgreementCount < 2) {
    confidence = "bastante";
  }

  return confidence;
}

export function computeMatchPreviewVerdict(
  input: MatchPreviewInput,
): MatchPreviewVerdict {
  const minSample = input.minSample ?? matchPreviewMinSample;
  const crowd = crowdFromAggregates(input.aggregates, minSample);

  const tableLocal = tableNorm(input.local.tablePosition, input.local.groupSize);
  const tableAway = tableNorm(
    input.visitante.tablePosition,
    input.visitante.groupSize,
  );
  const formLocal = formNorm(input.local.formNorm);
  const formAway = formNorm(input.visitante.formNorm);
  const { ctxLocal, ctxAway } = computeContextSignals(input);

  const drawTableBlend = drawBlend(tableLocal, tableAway);
  const drawFormBlend = drawBlend(formLocal, formAway);

  const signals: MatchPreviewSignals = {
    crowdLocal: crowd.local,
    crowdDraw: crowd.draw,
    crowdAway: crowd.away,
    tableLocal,
    tableAway,
    formLocal,
    formAway,
    ctxLocal,
    ctxAway,
    drawTableBlend,
    drawFormBlend,
  };

  const scores = computeScores(signals);
  const { favorite, margin } = favoriteFromScores(scores);
  const agreement = nonCrowdAgreement(favorite, signals);
  const confidence = resolveConfidence(
    margin,
    crowd.sampleOk,
    favorite,
    signals,
    agreement,
  );

  return {
    favorite,
    confidence,
    margin,
    scores,
    signals,
    crowdSampleOk: crowd.sampleOk,
    totalPicks: input.aggregates.total,
    mostPopularScore: input.aggregates.mostPopularScore,
    nonCrowdAgreementCount: agreement,
  };
}
