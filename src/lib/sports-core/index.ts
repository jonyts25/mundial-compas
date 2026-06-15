/**
 * Sports Core — barrel (SC-2 tipos · SC-3 preview).
 */

export type {
  Team,
  Competition,
  CompetitionFormat,
  Match,
  MatchScore,
  MatchStatus,
  MundialPartidoEstatus,
} from "@/lib/sports-core/matches/types";

export {
  isScheduledMatch,
  isLiveMatch,
  isFinishedMatch,
  MUNDIAL_ESTATUS_TO_MATCH_STATUS,
} from "@/lib/sports-core/matches/types";

export type {
  StandingRow,
  StandingGroup,
  StandingsSnapshot,
  StandingTeamRowCompat,
} from "@/lib/sports-core/standings/types";

export type {
  Outcome,
  LegacyOutcome,
  PredictionEntryType,
  Prediction,
  PickInput,
  LegacyPickInput,
  PoolScope,
  ScoreBucket,
  OutcomeBucket,
  PickAggregates,
  MatchPreviewConfidence,
  MatchPreviewTeamInput,
  MatchPreviewInput,
  MatchPreviewScores,
  MatchPreviewVerdict,
  LegacyMatchPreviewInput,
} from "@/lib/sports-core/predictions/types";

export type {
  ProfileId,
  ProfileFamily,
  ProfileBadge,
  ProfileMetrics,
  PlayerProfile,
  LegacyProfileMetrics,
  UserProfileCompat,
} from "@/lib/sports-core/profiles/types";

export {
  computeMatchPreviewVerdict,
  matchPreviewMinSample,
  matchPreviewWeights,
} from "@/lib/sports-core/predictions/preview/match-preview";

export type {
  MatchPreviewSignals,
} from "@/lib/sports-core/predictions/preview/match-preview";

export {
  analyzeSignalContradiction,
  analyzeSignalContradictionWithCrowd,
  buildStaticSignalLeaders,
  leaderFromCrowdOutcomes,
  leaderFromForm,
  leaderFromTable,
  toMatchPreviewPhaseFlags,
} from "@/lib/sports-core/predictions/preview/signals";

export type {
  PreviewPhaseFlags,
  SignalConflict,
  SignalContradiction,
  SignalLeaders,
  SignalSummary,
} from "@/lib/sports-core/predictions/preview/signals";
