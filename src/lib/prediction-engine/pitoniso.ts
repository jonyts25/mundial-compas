/**
 * El Pitoniso — barrel de exports públicos (PI-1).
 */

export {
  computeMatchPreviewVerdict,
  matchPreviewMinSample,
  matchPreviewWeights,
  type MatchPreviewConfidence,
  type MatchPreviewFavorite,
  type MatchPreviewInput,
  type MatchPreviewScores,
  type MatchPreviewSignals,
  type MatchPreviewTeamInput,
  type MatchPreviewVerdict,
} from "./match-preview";

export {
  buildPitonisoMessage,
  confidenceUiEmoji,
  confidenceUiLabel,
  favoriteDisplayName,
  PITONISO_DISCLAIMER_LONG,
  PITONISO_DISCLAIMER_SHORT,
  type PitonisoMessage,
  type PitonisoMessageInput,
} from "./pitoniso-message";

export {
  intuitionCopy,
  intuitionSeed,
  type IntuitionSignal,
} from "./pitoniso-intuition";

export { computeMatchPreviewVerdict as computePitonisoVerdict } from "./match-preview";
