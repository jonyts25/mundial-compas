/**
 * Sports Core — contratos de predicción y preview.
 * TypeScript puro.
 */

/** Resultado 1X2 canónico (perspectiva local / home). */
export type Outcome = "home" | "draw" | "away";

/**
 * Resultado 1X2 legacy — Mundial Compas / pick-aggregates actuales.
 * @deprecated Mapear vía adapter: local→home, empate→draw, visitante→away (SC-6).
 */
export type LegacyOutcome = "local" | "empate" | "visitante";

export type PredictionEntryType = "exact_score";

/** Pronóstico individual (capa server/adapter — incluye userId). */
export interface Prediction {
  poolId: string;
  matchId: string;
  userId: string;
  entryType: PredictionEntryType;
  payload: { homeScore: number; awayScore: number };
  lockedAt?: string;
  pointsAwarded?: number;
}

/** Entrada anónima para agregados (sin PII). */
export interface PickInput {
  homeScore: number;
  awayScore: number;
  isOwnPick?: boolean;
}

/**
 * Shape legacy de agregados en producción.
 * @deprecated Usar `PickInput` en SC-4+; adapter traduce golesLocal/golesVisitante.
 */
export interface LegacyPickInput {
  golesLocal: number;
  golesVisitante: number;
  esYo?: boolean;
}

export type PoolScope = "global" | "group";

export interface ScoreBucket {
  home: number;
  away: number;
  count: number;
  pct: number;
}

export interface OutcomeBucket {
  outcome: Outcome;
  count: number;
  pct: number;
}

export interface PickAggregates {
  total: number;
  exactScores: ScoreBucket[];
  outcomes: OutcomeBucket[];
  mostPopularScore: ScoreBucket | null;
  mostPopularOutcome: OutcomeBucket | null;
  userScoreSharePct: number | null;
  userScore: { home: number; away: number } | null;
  exactMatchPct: number | null;
  userMatchedExact: boolean | null;
}

export type MatchPreviewConfidence =
  | "indeciso"
  | "leve"
  | "bastante"
  | "presentimiento";

export interface MatchPreviewTeamInput {
  tablePosition: number | null;
  groupSize: number | null;
  formNorm: number | null;
  pointsFromTop2: number | null;
}

export interface MatchPreviewInput {
  aggregates: PickAggregates;
  home: MatchPreviewTeamInput;
  away: MatchPreviewTeamInput;
  isKnockout?: boolean;
  isGroupPhase?: boolean;
  isLastGroupMatch?: boolean;
  minSample?: number;
}

export interface MatchPreviewScores {
  home: number;
  draw: number;
  away: number;
}

export interface MatchPreviewVerdict {
  favorite: Outcome;
  confidence: MatchPreviewConfidence;
  margin: number;
  crowdSampleOk: boolean;
  scores: MatchPreviewScores;
  totalPicks: number;
}

/**
 * Input legacy del motor actual (`match-preview.ts`).
 * @deprecated Renombrar local/visitante → home/away en SC-3/SC-6.
 */
export interface LegacyMatchPreviewInput {
  aggregates: PickAggregates;
  local: MatchPreviewTeamInput;
  visitante: MatchPreviewTeamInput;
  isKnockout?: boolean;
  isGroupPhase?: boolean;
  isLastGroupMatch?: boolean;
  minSample?: number;
}
