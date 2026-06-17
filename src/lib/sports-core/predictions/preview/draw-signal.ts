/**
 * Draw signal — partido demasiado cerrado para forzar ganador (Pitoniso v2.1).
 * TypeScript puro; sin Supabase ni React.
 */

import type { Outcome } from "@/lib/insights/pick-aggregates";
import type { FifaRankingSignal } from "@/lib/sports-core/predictions/preview/fifa-ranking-signal";
import type {
  MatchPreviewScores,
  MatchPreviewSignals,
  MatchPreviewTeamInput,
} from "@/lib/sports-core/predictions/preview/match-preview";
import {
  analyzeSignalContradiction,
  leaderFromCrowdOutcomes,
  leaderFromForm,
  leaderFromRanking,
  leaderFromTable,
  type SignalContradiction,
  type SignalLeaders,
} from "@/lib/sports-core/predictions/preview/signals";

export type DrawSignalLevel = "none" | "medium" | "strong";

export interface DrawSignal {
  level: DrawSignalLevel;
  reasons: string[];
}

export interface DrawSignalInput {
  signals: MatchPreviewSignals;
  scores: MatchPreviewScores;
  margin: number;
  crowdSampleOk: boolean;
  totalPicks: number;
  rankingSignal: FifaRankingSignal | null;
  hasRanking: boolean;
  local: MatchPreviewTeamInput;
  visitante: MatchPreviewTeamInput;
  /** Outcome 1X2 más repetido en quiniela (moda). */
  mostPopularOutcome: Outcome | null;
  /** Share 0–1 del outcome más repetido (`OutcomeBucket.pct / 100`). */
  mostPopularOutcomeShare: number | null;
}

/** Share mínima del líder de multitud (0–1) para bloquear draw strong. */
export const CROWD_CLEAR_LEADER_SHARE = 0.55;

const CROWD_DIVIDED_SPREAD = 0.12;

function crowdLeaderFromSignals(signals: MatchPreviewSignals): Outcome {
  return leaderFromCrowdOutcomes(
    signals.crowdLocal * 100,
    signals.crowdDraw * 100,
    signals.crowdAway * 100,
  );
}

/**
 * Proxy de share del líder de multitud desde señales normalizadas (0–1).
 * Equivale al % del outcome ganador en `PickAggregates.outcomes`.
 */
export function crowdLeaderShare(signals: MatchPreviewSignals): {
  leader: Outcome;
  share: number;
} {
  const entries: [Outcome, number][] = [
    ["local", signals.crowdLocal],
    ["empate", signals.crowdDraw],
    ["visitante", signals.crowdAway],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return { leader: entries[0]![0], share: entries[0]![1] };
}

export function hasCrowdClearLeader(
  signals: MatchPreviewSignals,
  crowdSampleOk: boolean,
  minShare = CROWD_CLEAR_LEADER_SHARE,
): boolean {
  if (!crowdSampleOk) return false;
  const { leader, share } = crowdLeaderShare(signals);
  if (leader === "empate") return false;
  return share >= minShare;
}

/** Fallback: líder crowd + moda 1X2 alineada con share ≥ umbral. */
export function crowdClearByPopularOutcomeShare(
  signals: MatchPreviewSignals,
  crowdSampleOk: boolean,
  mostPopularOutcome: Outcome | null,
  mostPopularOutcomeShare: number | null,
): boolean {
  if (!crowdSampleOk || !mostPopularOutcome || mostPopularOutcome === "empate") {
    return false;
  }
  if (mostPopularOutcomeShare == null || mostPopularOutcomeShare < CROWD_CLEAR_LEADER_SHARE) {
    return false;
  }
  const { leader } = crowdLeaderShare(signals);
  return leader !== "empate" && leader === mostPopularOutcome;
}

export function crowdBlocksAutoDraw(
  signals: MatchPreviewSignals,
  crowdSampleOk: boolean,
  mostPopularOutcome: Outcome | null,
  mostPopularOutcomeShare: number | null,
): boolean {
  return (
    hasCrowdClearLeader(signals, crowdSampleOk) ||
    crowdClearByPopularOutcomeShare(
      signals,
      crowdSampleOk,
      mostPopularOutcome,
      mostPopularOutcomeShare,
    )
  );
}

/**
 * `empate` comparte el % máximo de multitud con un ganador (no triple empate 33/33/33).
 * Proxy: `crowdDraw` en el tope y exactamente dos outcomes empatan al máximo.
 */
export function crowdDrawCoLeadsTop(signals: MatchPreviewSignals): boolean {
  const { crowdLocal, crowdDraw, crowdAway } = signals;
  const max = Math.max(crowdLocal, crowdDraw, crowdAway);
  if (crowdDraw < max - 1e-9) return false;
  const atMax = [crowdLocal, crowdDraw, crowdAway].filter((p) => p >= max - 1e-9).length;
  return atMax === 2 && (crowdLocal >= max - 1e-9 || crowdAway >= max - 1e-9);
}

function applyCrowdDrawGuardrail(
  signal: DrawSignal,
  input: DrawSignalInput,
): DrawSignal {
  if (
    !crowdBlocksAutoDraw(
      input.signals,
      input.crowdSampleOk,
      input.mostPopularOutcome,
      input.mostPopularOutcomeShare,
    )
  ) {
    return signal;
  }
  if (signal.level !== "strong") {
    return signal;
  }
  return {
    level: "medium",
    reasons: [...signal.reasons, "multitud_clara_guardrail"],
  };
}

function isCrowdDivided(
  signals: MatchPreviewSignals,
  crowdSampleOk: boolean,
): boolean {
  if (!crowdSampleOk) return true;
  const pcts = [signals.crowdLocal, signals.crowdDraw, signals.crowdAway].sort(
    (a, b) => b - a,
  );
  return pcts[0]! - pcts[1]! < CROWD_DIVIDED_SPREAD;
}

function tableFormWithoutClearLeader(
  local: MatchPreviewTeamInput,
  visitante: MatchPreviewTeamInput,
): boolean {
  const table = leaderFromTable(local, visitante);
  const form = leaderFromForm(local, visitante);
  if (table == null && form == null) return true;
  if (table === "empate" || form === "empate") return true;
  if (table != null && form != null && table !== form) return true;
  return false;
}

/** Cuenta señales no-crowd alineadas al mismo ganador (local/visitante). */
export function countAlignedWinnerSignals(leaders: SignalLeaders): number {
  const sides = [leaders.table, leaders.form, leaders.ranking].filter(
    (o): o is Outcome => o === "local" || o === "visitante",
  );
  if (sides.length === 0) return 0;
  const localCount = sides.filter((o) => o === "local").length;
  const awayCount = sides.filter((o) => o === "visitante").length;
  return Math.max(localCount, awayCount);
}

export function buildPreviewSignalLeaders(
  input: DrawSignalInput,
): SignalLeaders {
  return {
    crowd: crowdLeaderFromSignals(input.signals),
    table: leaderFromTable(input.local, input.visitante),
    form: leaderFromForm(input.local, input.visitante),
    ranking: leaderFromRanking(input.rankingSignal),
  };
}

export function computeDrawSignal(input: DrawSignalInput): DrawSignal {
  const leaders = buildPreviewSignalLeaders(input);
  const contradiction = analyzeSignalContradiction(leaders);
  const alignedCount = countAlignedWinnerSignals(leaders);
  const rankDiff = input.rankingSignal?.rankDiff ?? null;
  const scoreDiffPct =
    Math.abs(input.scores.local - input.scores.visitante) * 100;
  const crowdDivided = isCrowdDivided(input.signals, input.crowdSampleOk);
  const noTableFormLeader = tableFormWithoutClearLeader(
    input.local,
    input.visitante,
  );

  if (
    alignedCount >= 3 &&
    (rankDiff == null || rankDiff > 50) &&
    scoreDiffPct > 20 &&
    input.margin >= 0.12
  ) {
    return { level: "none", reasons: [] };
  }

  const rankLeader =
    leaders.ranking === "local" || leaders.ranking === "visitante"
      ? leaders.ranking
      : null;
  const staticLocal =
    (leaders.table === "local" ? 1 : 0) + (leaders.form === "local" ? 1 : 0);
  const staticAway =
    (leaders.table === "visitante" ? 1 : 0) +
    (leaders.form === "visitante" ? 1 : 0);
  const staticDominant =
    staticLocal > staticAway
      ? "local"
      : staticAway > staticLocal
        ? "visitante"
        : null;

  if (
    rankDiff != null &&
    rankDiff > 50 &&
    scoreDiffPct > 25 &&
    alignedCount >= 2 &&
    rankLeader != null &&
    staticDominant != null &&
    rankLeader === staticDominant
  ) {
    return { level: "none", reasons: [] };
  }

  const reasons: string[] = [];
  let points = 0;

  if (rankDiff != null && rankDiff <= 10) {
    points += 2;
    reasons.push("ranking_parejo");
  } else if (rankDiff != null && rankDiff <= 20) {
    points += 1;
    reasons.push("ranking_cercano");
  }

  if (crowdDivided) {
    points += 2;
    reasons.push("multitud_dividida");
  }

  if (scoreDiffPct <= 10) {
    points += 2;
    reasons.push("scores_cerrados");
  } else if (scoreDiffPct <= 20) {
    points += 1;
    reasons.push("scores_parejos");
  }

  if (noTableFormLeader) {
    points += 1;
    reasons.push("tabla_forma_sin_lider");
  }

  const table = leaders.table;
  const form = leaders.form;
  const ranking = leaders.ranking;
  const staticSide =
    table != null &&
    form != null &&
    table !== "empate" &&
    form !== "empate" &&
    table === form
      ? table
      : null;
  if (
    staticSide != null &&
    ranking != null &&
    ranking !== "empate" &&
    staticSide !== ranking
  ) {
    points += 2;
    reasons.push("ranking_vs_torneo");
  }

  if (contradiction.conflicts.length >= 2) {
    points += 2;
    reasons.push("senalas_contradictorias");
  } else if (contradiction.hasContradiction) {
    points += 1;
    reasons.push("contradiccion_leve");
  }

  if (input.margin < 0.1) {
    points += 1;
    reasons.push("margen_bajo");
  }

  if (points >= 6) {
    return applyCrowdDrawGuardrail({ level: "strong", reasons }, input);
  }
  if (points >= 3) {
    return applyCrowdDrawGuardrail({ level: "medium", reasons }, input);
  }
  return { level: "none", reasons: [] };
}

export function hasStrongContradiction(
  contradiction: SignalContradiction,
): boolean {
  return (
    contradiction.conflicts.length >= 2 || contradiction.summary === "mixed"
  );
}
