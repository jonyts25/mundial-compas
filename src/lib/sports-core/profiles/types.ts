/**
 * Sports Core — contratos de perfil de pronosticador.
 * TypeScript puro.
 */

export type ProfileId =
  | "novato"
  | "francotirador"
  | "brujula"
  | "diferencial"
  | "amante_empate"
  | "en_racha"
  | "equilibrado";

export type ProfileFamily = "precision" | "estilo" | "momentum" | "fallback";

export interface ProfileBadge {
  id: ProfileId;
  label: string;
  emoji: string;
  strength: number;
  family: ProfileFamily;
}

/** Métricas de entrada al motor de perfiles (rule-based). */
export interface ProfileMetrics {
  scoredPredictions: number;
  totalPredictions: number;
  exactHits: number;
  tendencyHits: number;
  exactRate: number;
  hitRate: number;
  precision: number;
  drawRate: number;
  minorityRate: number;
  exactStreak: number;
}

export interface PlayerProfile {
  primary: ProfileBadge;
  secondary: ProfileBadge[];
  phrase: string;
  metrics: ProfileMetrics;
  sampleOk: boolean;
}

/**
 * Métricas legacy (`src/lib/insights/profiles.ts`).
 * @deprecated Adapter SC-6: N→scoredPredictions, P→totalPredictions, etc.
 */
export interface LegacyProfileMetrics {
  N: number;
  P: number;
  exactos: number;
  tendencias: number;
  exactRate: number;
  hitRate: number;
  precision: number;
  drawRate: number;
  minorityRate: number;
  exactStreak: number;
}

/**
 * Perfil legacy en producción.
 * @deprecated Usar `PlayerProfile` en sports-core.
 */
export type UserProfileCompat = PlayerProfile;
