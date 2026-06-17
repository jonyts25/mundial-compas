/**
 * @deprecated Import from `@/lib/sports-core/predictions/preview/match-preview` (SC-3).
 * TODO(SC-6): remove shim after Mundial Compas adapter migration.
 */
export {
  computeMatchPreviewVerdict,
  matchPreviewMinSample,
  matchPreviewWeights,
  matchPreviewRankingWeight,
  type MatchPreviewConfidence,
  type MatchPreviewFavorite,
  type MatchPreviewInput,
  type MatchPreviewPredictedOutcome,
  type MatchPreviewScores,
  type MatchPreviewSignals,
  type MatchPreviewTeamInput,
  type MatchPreviewVerdict,
} from "@/lib/sports-core/predictions/preview/match-preview";

export type {
  DrawSignal,
  DrawSignalLevel,
} from "@/lib/sports-core/predictions/preview/draw-signal";
