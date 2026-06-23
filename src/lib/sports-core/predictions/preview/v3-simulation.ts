/**
 * Pitoniso v3 — simulación offline (experimental).
 *
 * Motor separado del preview público v2.1. Sin fetch, sin DB, sin UI.
 * Añade GF/GC torneo, goal diff y presión de clasificación a las señales v2.
 */

import type { Outcome, PickAggregates, ScoreBucket } from "@/lib/insights/pick-aggregates";
import {
  buildPreviewSignalLeaders,
  computeDrawSignal,
  countAlignedWinnerSignals,
  crowdBlocksAutoDraw,
  crowdDrawCoLeadsTop,
  crowdLeaderShare,
  hasStrongContradiction,
  type DrawSignal,
} from "@/lib/sports-core/predictions/preview/draw-signal";
import {
  fifaRankNorm,
  getFifaRankingSignal,
  type FifaRankingSignal,
} from "@/lib/sports-core/predictions/preview/fifa-ranking-signal";
import type {
  MatchPreviewConfidence,
  MatchPreviewFavorite,
  MatchPreviewInput,
  MatchPreviewPredictedOutcome,
  MatchPreviewScores,
  MatchPreviewSignals,
  MatchPreviewTeamInput,
  MatchPreviewVerdict,
} from "@/lib/sports-core/predictions/preview/match-preview";
import {
  analyzeSignalContradiction,
  type SignalContradiction,
} from "@/lib/sports-core/predictions/preview/signals";

export const pitonisoV3Weights = {
  crowd: 0.35,
  form: 0.22,
  table: 0.18,
  context: 0.15,
  goalForm: 0.12,
} as const;

export const pitonisoV3RankingWeight = 0.08 as const;

export const pitonisoV3MinSample = 5;

export interface PitonisoV3TeamInput extends MatchPreviewTeamInput {
  /** Goles a favor acumulados en el torneo antes del kickoff. */
  tournamentGF?: number | null;
  /** Goles en contra acumulados en el torneo antes del kickoff. */
  tournamentGC?: number | null;
  /** Partidos jugados en el torneo antes del kickoff. */
  tournamentPlayed?: number | null;
  /** 0–1 presión de clasificación (última jornada, gap a puestos clave). */
  classificationPressure?: number | null;
}

export interface PitonisoV3SimulationInput
  extends Omit<MatchPreviewInput, "local" | "visitante" | "minSample"> {
  local: PitonisoV3TeamInput;
  visitante: PitonisoV3TeamInput;
  minSample?: number;
}

export interface PitonisoV3Features {
  rankingSignal: FifaRankingSignal | null;
  crowdLocal: number;
  crowdDraw: number;
  crowdAway: number;
  crowdSampleOk: boolean;
  tableLocal: number;
  tableAway: number;
  formLocal: number;
  formAway: number;
  goalFormLocal: number;
  goalFormAway: number;
  gfPgLocal: number | null;
  gcPgLocal: number | null;
  gfPgAway: number | null;
  gcPgAway: number | null;
  goalDiffLocal: number | null;
  goalDiffAway: number | null;
  ctxLocal: number;
  ctxAway: number;
  classificationPressureLocal: number;
  classificationPressureAway: number;
  drawSignal: DrawSignal;
  contradictions: SignalContradiction;
}

export interface PitonisoV3SimulationVerdict
  extends Omit<MatchPreviewVerdict, "signals"> {
  version: "pitoniso-v3-simulation";
  features: PitonisoV3Features;
  signals: MatchPreviewSignals & {
    goalFormLocal: number;
    goalFormAway: number;
  };
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

function perGameGoals(
  total: number | null | undefined,
  played: number | null | undefined,
): number | null {
  if (total == null || played == null || played <= 0) return null;
  return total / played;
}

/** Mejor ataque + defensa relativo a ~3 goles/partido en fase de grupos. */
export function goalFormNormFromStats(
  gfPg: number | null,
  gcPg: number | null,
  ref = 3,
): number {
  if (gfPg == null && gcPg == null) return DEFAULT_NORM;
  const attack = gfPg != null ? clamp01(gfPg / ref) : DEFAULT_NORM;
  const defense = gcPg != null ? clamp01(1 - gcPg / ref) : DEFAULT_NORM;
  return clamp01((attack + defense) / 2);
}

export function computeClassificationPressure(
  input: Pick<
    PitonisoV3SimulationInput,
    "isLastGroupMatch" | "isGroupPhase" | "local" | "visitante"
  >,
  side: "local" | "visitante",
): number {
  const team = side === "local" ? input.local : input.visitante;
  const explicit = team.classificationPressure;
  if (explicit != null) return clamp01(explicit);

  if (!input.isGroupPhase || !input.isLastGroupMatch) return 0;

  let pressure = 0;
  const gap = team.pointsFromTop2;
  if (gap != null && gap > 0 && gap <= 3) {
    pressure += 0.5 + (3 - gap) * 0.15;
  }
  const pos = team.tablePosition;
  if (pos != null && pos >= 3) {
    pressure += 0.25;
  }
  return clamp01(pressure);
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

function computeContextSignals(
  input: PitonisoV3SimulationInput,
): { ctxLocal: number; ctxAway: number } {
  let ctxLocal = DEFAULT_NORM;
  let ctxAway = DEFAULT_NORM;

  if (input.isGroupPhase) {
    ctxLocal = clamp01(ctxLocal + 0.05);
  }

  if (input.isKnockout) {
    const lp = input.local.tablePosition;
    const ap = input.visitante.tablePosition;
    if (lp != null && ap != null) {
      if (lp > ap) ctxLocal = clamp01(ctxLocal + 0.15);
      else if (ap > lp) ctxAway = clamp01(ctxAway + 0.15);
    }
  }

  const pressureLocal = computeClassificationPressure(input, "local");
  const pressureAway = computeClassificationPressure(input, "visitante");
  ctxLocal = clamp01(ctxLocal + pressureLocal * 0.2);
  ctxAway = clamp01(ctxAway + pressureAway * 0.2);

  return { ctxLocal, ctxAway };
}

function computeV3Scores(
  signals: MatchPreviewSignals & { goalFormLocal: number; goalFormAway: number },
  hasRanking: boolean,
): MatchPreviewScores {
  const w = pitonisoV3Weights;
  const rw = pitonisoV3RankingWeight;
  const rankShare = hasRanking ? rw : 0;
  const scale = hasRanking ? 1 - rankShare : 1;

  return {
    local:
      scale *
        (w.crowd * signals.crowdLocal +
          w.table * signals.tableLocal +
          w.form * signals.formLocal +
          w.context * signals.ctxLocal +
          w.goalForm * signals.goalFormLocal) +
      (hasRanking ? rankShare * signals.rankLocal : 0),
    draw:
      scale *
        (w.crowd * signals.crowdDraw +
          w.table * signals.drawTableBlend +
          w.form * signals.drawFormBlend +
          w.context * 0.5 +
          w.goalForm * drawBlend(signals.goalFormLocal, signals.goalFormAway)) +
      (hasRanking ? rankShare * 0.5 : 0),
    visitante:
      scale *
        (w.crowd * signals.crowdAway +
          w.table * signals.tableAway +
          w.form * signals.formAway +
          w.context * signals.ctxAway +
          w.goalForm * signals.goalFormAway) +
      (hasRanking ? rankShare * signals.rankAway : 0),
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
  return { favorite: entries[0]![0], margin: entries[0]![1] - entries[1]![1] };
}

function hasStaticTournamentSignals(input: PitonisoV3SimulationInput): boolean {
  return (
    input.local.tablePosition != null ||
    input.visitante.tablePosition != null ||
    input.local.formNorm != null ||
    input.visitante.formNorm != null ||
    input.local.fifaRank != null ||
    input.visitante.fifaRank != null ||
    (input.local.tournamentPlayed ?? 0) > 0 ||
    (input.visitante.tournamentPlayed ?? 0) > 0
  );
}

function shouldPreferWinnerOverStrongDraw(
  signals: MatchPreviewSignals,
  crowdSampleOk: boolean,
  totalPicks: number,
  favorite: MatchPreviewFavorite,
  mostPopularOutcome: Outcome | null,
): boolean {
  if (!crowdSampleOk && totalPicks === 0) return true;
  const { leader } = crowdLeaderShare(signals);
  const modaAlignsWithFavorite =
    mostPopularOutcome != null &&
    mostPopularOutcome === leader &&
    mostPopularOutcome === favorite;
  if (crowdSampleOk && modaAlignsWithFavorite && crowdDrawCoLeadsTop(signals)) {
    return true;
  }
  return false;
}

function resolvePredictedOutcome(
  favorite: MatchPreviewFavorite,
  margin: number,
  drawSignal: DrawSignal,
  contradiction: SignalContradiction,
  signals: MatchPreviewSignals,
  crowdSampleOk: boolean,
  totalPicks: number,
  hasStatic: boolean,
  mostPopularOutcome: Outcome | null,
  mostPopularOutcomeShare: number | null,
): MatchPreviewPredictedOutcome {
  if (totalPicks === 0 && !hasStatic) return "unknown";

  const crowdBlocksDraw = crowdBlocksAutoDraw(
    signals,
    crowdSampleOk,
    mostPopularOutcome,
    mostPopularOutcomeShare,
  );

  if (drawSignal.level === "strong" && !crowdBlocksDraw) {
    if (
      favorite !== "empate" &&
      shouldPreferWinnerOverStrongDraw(
        signals,
        crowdSampleOk,
        totalPicks,
        favorite,
        mostPopularOutcome,
      )
    ) {
      return favorite;
    }
    return "empate";
  }

  if (drawSignal.level === "medium" && !crowdBlocksDraw) {
    if (hasStrongContradiction(contradiction)) return "empate";
    if (contradiction.hasContradiction) return "unknown";
    if (favorite !== "empate") return "unknown";
  }

  if (crowdBlocksDraw && drawSignal.level !== "none" && favorite !== "empate") {
    return favorite;
  }

  if (!crowdSampleOk && totalPicks > 0 && drawSignal.level !== "none") {
    return "unknown";
  }

  if (favorite === "empate") return "empate";
  return favorite;
}

function resolveConfidence(
  margin: number,
  crowdSampleOk: boolean,
  favorite: MatchPreviewFavorite,
  predictedOutcome: MatchPreviewPredictedOutcome,
  drawSignal: DrawSignal,
  alignedCount: number,
  contradiction: SignalContradiction,
  totalPicks: number,
  hasStatic: boolean,
): MatchPreviewConfidence {
  if (totalPicks === 0 && !hasStatic) return "indeciso";
  if (predictedOutcome === "unknown") return "indeciso";
  if (predictedOutcome === "empate") {
    return drawSignal.level === "strong" ? "presentimiento" : "leve";
  }

  const strongContradiction = hasStrongContradiction(contradiction);
  const mildContradiction = contradiction.hasContradiction;

  if (
    drawSignal.level === "none" &&
    alignedCount >= 3 &&
    !strongContradiction &&
    margin >= 0.18 &&
    crowdSampleOk
  ) {
    return "presentimiento";
  }

  if (
    drawSignal.level === "none" &&
    alignedCount >= 3 &&
    !mildContradiction &&
    margin >= 0.12
  ) {
    return "bastante";
  }

  if (
    drawSignal.level === "none" &&
    alignedCount >= 2 &&
    margin >= 0.12 &&
    !strongContradiction
  ) {
    return mildContradiction ? "bastante" : "presentimiento";
  }

  if (drawSignal.level === "medium" || mildContradiction || margin < 0.12) {
    return "leve";
  }

  if (margin < 0.08) return "indeciso";
  if (!crowdSampleOk) return "leve";
  return favorite === "empate" ? "leve" : "bastante";
}

function resolveRankingSignal(
  input: PitonisoV3SimulationInput,
): FifaRankingSignal | null {
  if (input.rankingSignal !== undefined) return input.rankingSignal;
  if (input.localCode && input.visitanteCode) {
    return getFifaRankingSignal(input.localCode, input.visitanteCode);
  }
  return null;
}

export function buildPitonisoV3Features(
  input: PitonisoV3SimulationInput,
): PitonisoV3Features {
  const minSample = input.minSample ?? pitonisoV3MinSample;
  const crowd = crowdFromAggregates(input.aggregates, minSample);
  const tableLocal = tableNorm(input.local.tablePosition, input.local.groupSize);
  const tableAway = tableNorm(
    input.visitante.tablePosition,
    input.visitante.groupSize,
  );
  const formLocal = formNorm(input.local.formNorm);
  const formAway = formNorm(input.visitante.formNorm);

  const gfPgLocal = perGameGoals(
    input.local.tournamentGF,
    input.local.tournamentPlayed,
  );
  const gcPgLocal = perGameGoals(
    input.local.tournamentGC,
    input.local.tournamentPlayed,
  );
  const gfPgAway = perGameGoals(
    input.visitante.tournamentGF,
    input.visitante.tournamentPlayed,
  );
  const gcPgAway = perGameGoals(
    input.visitante.tournamentGC,
    input.visitante.tournamentPlayed,
  );

  const goalFormLocal = goalFormNormFromStats(gfPgLocal, gcPgLocal);
  const goalFormAway = goalFormNormFromStats(gfPgAway, gcPgAway);

  const { ctxLocal, ctxAway } = computeContextSignals(input);
  const classificationPressureLocal = computeClassificationPressure(input, "local");
  const classificationPressureAway = computeClassificationPressure(input, "visitante");

  const rankingSignal = resolveRankingSignal(input);
  const localFifaRank =
    input.local.fifaRank ?? rankingSignal?.localRank ?? null;
  const visitanteFifaRank =
    input.visitante.fifaRank ?? rankingSignal?.visitanteRank ?? null;
  const hasRanking =
    rankingSignal != null && localFifaRank != null && visitanteFifaRank != null;
  const rankLocal = hasRanking ? fifaRankNorm(localFifaRank) : DEFAULT_NORM;
  const rankAway = hasRanking ? fifaRankNorm(visitanteFifaRank) : DEFAULT_NORM;

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
    drawTableBlend: drawBlend(tableLocal, tableAway),
    drawFormBlend: drawBlend(formLocal, formAway),
    rankLocal,
    rankAway,
  };

  const extendedSignals = {
    ...signals,
    goalFormLocal,
    goalFormAway,
  };

  const scores = computeV3Scores(extendedSignals, hasRanking);
  const { margin } = favoriteFromScores(scores);

  const drawSignalInput = {
    signals,
    scores,
    margin,
    crowdSampleOk: crowd.sampleOk,
    totalPicks: input.aggregates.total,
    rankingSignal,
    hasRanking,
    local: input.local,
    visitante: input.visitante,
    mostPopularOutcome: input.aggregates.mostPopularOutcome?.outcome ?? null,
    mostPopularOutcomeShare:
      input.aggregates.mostPopularOutcome != null
        ? input.aggregates.mostPopularOutcome.pct / 100
        : null,
  };

  const drawSignal = computeDrawSignal(drawSignalInput);
  const leaders = buildPreviewSignalLeaders(drawSignalInput);
  const contradictions = analyzeSignalContradiction(leaders);

  return {
    rankingSignal,
    crowdLocal: crowd.local,
    crowdDraw: crowd.draw,
    crowdAway: crowd.away,
    crowdSampleOk: crowd.sampleOk,
    tableLocal,
    tableAway,
    formLocal,
    formAway,
    goalFormLocal,
    goalFormAway,
    gfPgLocal,
    gcPgLocal,
    gfPgAway,
    gcPgAway,
    goalDiffLocal:
      input.local.tournamentGF != null && input.local.tournamentGC != null
        ? input.local.tournamentGF - input.local.tournamentGC
        : null,
    goalDiffAway:
      input.visitante.tournamentGF != null && input.visitante.tournamentGC != null
        ? input.visitante.tournamentGF - input.visitante.tournamentGC
        : null,
    ctxLocal,
    ctxAway,
    classificationPressureLocal,
    classificationPressureAway,
    drawSignal,
    contradictions,
  };
}

export function computePitonisoV3SimulationVerdict(
  input: PitonisoV3SimulationInput,
): PitonisoV3SimulationVerdict {
  const minSample = input.minSample ?? pitonisoV3MinSample;
  const features = buildPitonisoV3Features(input);

  const signals: MatchPreviewSignals & {
    goalFormLocal: number;
    goalFormAway: number;
  } = {
    crowdLocal: features.crowdLocal,
    crowdDraw: features.crowdDraw,
    crowdAway: features.crowdAway,
    tableLocal: features.tableLocal,
    tableAway: features.tableAway,
    formLocal: features.formLocal,
    formAway: features.formAway,
    ctxLocal: features.ctxLocal,
    ctxAway: features.ctxAway,
    drawTableBlend: drawBlend(features.tableLocal, features.tableAway),
    drawFormBlend: drawBlend(features.formLocal, features.formAway),
    rankLocal: features.rankingSignal
      ? fifaRankNorm(features.rankingSignal.localRank)
      : DEFAULT_NORM,
    rankAway: features.rankingSignal
      ? fifaRankNorm(features.rankingSignal.visitanteRank)
      : DEFAULT_NORM,
    goalFormLocal: features.goalFormLocal,
    goalFormAway: features.goalFormAway,
  };

  const hasRanking = features.rankingSignal != null;
  const scores = computeV3Scores(signals, hasRanking);
  const { favorite, margin } = favoriteFromScores(scores);

  const drawSignalInput = {
    signals,
    scores,
    margin,
    crowdSampleOk: features.crowdSampleOk,
    totalPicks: input.aggregates.total,
    rankingSignal: features.rankingSignal,
    hasRanking,
    local: input.local,
    visitante: input.visitante,
    mostPopularOutcome: input.aggregates.mostPopularOutcome?.outcome ?? null,
    mostPopularOutcomeShare:
      input.aggregates.mostPopularOutcome != null
        ? input.aggregates.mostPopularOutcome.pct / 100
        : null,
  };

  const drawSignal = features.drawSignal;
  const leaders = buildPreviewSignalLeaders(drawSignalInput);
  const signalContradiction = features.contradictions;
  const alignedSignalCount = countAlignedWinnerSignals(leaders);
  const hasStatic = hasStaticTournamentSignals(input);

  const predictedOutcome = resolvePredictedOutcome(
    favorite,
    margin,
    drawSignal,
    signalContradiction,
    signals,
    features.crowdSampleOk,
    input.aggregates.total,
    hasStatic,
    input.aggregates.mostPopularOutcome?.outcome ?? null,
    input.aggregates.mostPopularOutcome != null
      ? input.aggregates.mostPopularOutcome.pct / 100
      : null,
  );

  const confidence = resolveConfidence(
    margin,
    features.crowdSampleOk,
    favorite,
    predictedOutcome,
    drawSignal,
    alignedSignalCount,
    signalContradiction,
    input.aggregates.total,
    hasStatic,
  );

  return {
    version: "pitoniso-v3-simulation",
    favorite,
    predictedOutcome,
    confidence,
    margin,
    scores,
    signals,
    features,
    rankingSignal: features.rankingSignal,
    drawSignal,
    signalContradiction,
    alignedSignalCount,
    crowdSampleOk: features.crowdSampleOk,
    totalPicks: input.aggregates.total,
    mostPopularScore: input.aggregates.mostPopularScore as ScoreBucket | null,
    nonCrowdAgreementCount: alignedSignalCount,
  };
}

/** Mapea standings de grupo a inputs torneo sin fuga (pre-kickoff). */
export function tournamentGoalInputFromStanding(
  standing: {
    goalsFor: number;
    goalsAgainst: number;
    played: number;
    goalDiff: number;
    pointsFromTop2?: number;
    position?: number;
  } | null,
  opts: { classificationPressure?: number } = {},
): Pick<
  PitonisoV3TeamInput,
  | "tournamentGF"
  | "tournamentGC"
  | "tournamentPlayed"
  | "classificationPressure"
> {
  if (!standing || standing.played <= 0) {
    return {
      tournamentGF: null,
      tournamentGC: null,
      tournamentPlayed: null,
      classificationPressure: opts.classificationPressure ?? null,
    };
  }
  return {
    tournamentGF: standing.goalsFor,
    tournamentGC: standing.goalsAgainst,
    tournamentPlayed: standing.played,
    classificationPressure: opts.classificationPressure ?? null,
  };
}

/** Adapter mínimo para reutilizar tipos de preview v2 en tests. */
export function toMatchPreviewInput(
  input: PitonisoV3SimulationInput,
): MatchPreviewInput {
  return {
    aggregates: input.aggregates,
    local: input.local,
    visitante: input.visitante,
    isKnockout: input.isKnockout,
    isGroupPhase: input.isGroupPhase,
    isLastGroupMatch: input.isLastGroupMatch,
    minSample: input.minSample,
    localCode: input.localCode,
    visitanteCode: input.visitanteCode,
    rankingSignal: input.rankingSignal,
  };
}
