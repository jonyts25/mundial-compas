/**
 * Perfiles de pronosticador — rule-based (Sprint 1 · Fase C).
 *
 * Función pura sobre métricas ya calculadas. Sin IA, sin BD, sin PII.
 * Todos los perfiles usan tono positivo (anti-estigma).
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

/** Métricas de entrada (calculadas en profile-data.ts). */
export interface ProfileMetrics {
  /** Picks puntuados (partido finalizado). */
  N: number;
  /** Total de picks (incluye pendientes). */
  P: number;
  exactos: number;
  tendencias: number;
  exactRate: number;
  hitRate: number;
  /** Precisión normalizada 0–1 (ppp / 3). */
  precision: number;
  drawRate: number;
  /** Fracción de picks puntuados con pick diferencial/raro (via pick-value). */
  minorityRate: number;
  exactStreak: number;
}

export interface UserProfile {
  primary: ProfileBadge;
  secondary: ProfileBadge[];
  phrase: string;
  metrics: ProfileMetrics;
  sampleOk: boolean;
}

export const profileThresholds = {
  minSample: 5,
  francotiradorExactRate: 0.25,
  brujulaHitRate: 0.6,
  brujulaMaxExactRate: 0.15,
  diferencialMinorityRate: 0.4,
  amanteEmpateDrawRate: 0.3,
  enRachaExactStreak: 2,
} as const;

interface ProfileRule {
  id: ProfileId;
  label: string;
  emoji: string;
  family: ProfileFamily;
  matches: (m: ProfileMetrics) => boolean;
  strength: (m: ProfileMetrics) => number;
}

const PROFILE_RULES: ProfileRule[] = [
  {
    id: "francotirador",
    label: "Francotirador",
    emoji: "🎯",
    family: "precision",
    matches: (m) => m.exactRate >= profileThresholds.francotiradorExactRate,
    strength: (m) => m.exactRate,
  },
  {
    id: "brujula",
    label: "Brújula",
    emoji: "🧭",
    family: "precision",
    matches: (m) =>
      m.hitRate >= profileThresholds.brujulaHitRate &&
      m.exactRate < profileThresholds.brujulaMaxExactRate,
    strength: (m) => m.hitRate - m.exactRate,
  },
  {
    id: "diferencial",
    label: "Apostador Diferencial",
    emoji: "🃏",
    family: "estilo",
    matches: (m) => m.minorityRate >= profileThresholds.diferencialMinorityRate,
    strength: (m) => m.minorityRate,
  },
  {
    id: "amante_empate",
    label: "Amante del Empate",
    emoji: "🤝",
    family: "estilo",
    matches: (m) => m.drawRate >= profileThresholds.amanteEmpateDrawRate,
    strength: (m) => m.drawRate,
  },
  {
    id: "en_racha",
    label: "En Racha",
    emoji: "🔥",
    family: "momentum",
    matches: (m) => m.exactStreak >= profileThresholds.enRachaExactStreak,
    strength: (m) => (m.N > 0 ? m.exactStreak / m.N : 0),
  },
];

const NOVATO: ProfileBadge = {
  id: "novato",
  label: "Novato",
  emoji: "🌱",
  strength: 0,
  family: "fallback",
};

const EQUILIBRADO: ProfileBadge = {
  id: "equilibrado",
  label: "El Equilibrado",
  emoji: "⚖️",
  strength: 0.5,
  family: "fallback",
};

function evaluateCandidates(metrics: ProfileMetrics): ProfileBadge[] {
  return PROFILE_RULES.filter((r) => r.matches(metrics))
    .map((r) => ({
      id: r.id,
      label: r.label,
      emoji: r.emoji,
      family: r.family,
      strength: r.strength(metrics),
    }))
    .sort((a, b) => b.strength - a.strength);
}

function pickSecondary(
  candidates: ProfileBadge[],
  primary: ProfileBadge,
  max: number,
): ProfileBadge[] {
  const out: ProfileBadge[] = [];
  for (const c of candidates) {
    if (c.id === primary.id) continue;
    if (c.family === primary.family) continue;
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/** Frase breve positiva según perfil principal. */
export function buildProfilePhrase(primary: ProfileBadge): string {
  if (primary.id === "novato") {
    return "Sigue pronosticando: tu estilo se define con más partidos.";
  }

  switch (primary.id) {
    case "francotirador":
      return "Aciertas el marcador exacto más que la mayoría. Precisión letal.";
    case "brujula":
      return "Lees bien la tendencia del partido aunque el marcador exacto se te escape.";
    case "diferencial":
      return "Te atreves con picks poco populares. Cuando pegas, subes fuerte.";
    case "amante_empate":
      return "No le temes al empate. Un estilo que pocos se animan a jugar.";
    case "en_racha":
      return "Vienes encendido con aciertos exactos seguidos. Aprovecha el momentum.";
    case "equilibrado":
      return "Pronosticas con equilibrio: ni muy conservador ni muy arriesgado.";
    default:
      return "Tu estilo de pronosticador tiene personalidad propia.";
  }
}

/**
 * Calcula el perfil del usuario a partir de métricas (pura).
 */
export function computeUserProfile(metrics: ProfileMetrics): UserProfile {
  const sampleOk = metrics.N >= profileThresholds.minSample;

  if (!sampleOk) {
    return {
      primary: NOVATO,
      secondary: [],
      phrase: buildProfilePhrase(NOVATO),
      metrics,
      sampleOk: false,
    };
  }

  const candidates = evaluateCandidates(metrics);

  const primary =
    candidates.length > 0
      ? candidates[0]
      : { ...EQUILIBRADO };

  const secondary = pickSecondary(candidates, primary, 2);

  return {
    primary,
    secondary,
    phrase: buildProfilePhrase(primary),
    metrics,
    sampleOk: true,
  };
}
