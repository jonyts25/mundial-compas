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

export {
  computeDrawSignal,
  countAlignedWinnerSignals,
  crowdBlocksAutoDraw,
  crowdClearByPopularOutcomeShare,
  crowdDrawCoLeadsTop,
  crowdLeaderShare,
  CROWD_CLEAR_LEADER_SHARE,
  hasCrowdClearLeader,
  hasStrongContradiction,
  type DrawSignal,
  type DrawSignalLevel,
} from "@/lib/sports-core/predictions/preview/draw-signal";

export type {
  MatchPreviewSignals,
} from "@/lib/sports-core/predictions/preview/match-preview";

export {
  analyzeSignalContradiction,
  analyzeSignalContradictionWithCrowd,
  buildStaticSignalLeaders,
  leaderFromCrowdOutcomes,
  leaderFromForm,
  leaderFromRanking,
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
