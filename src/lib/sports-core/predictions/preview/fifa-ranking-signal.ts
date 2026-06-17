/**
 * Señal FIFA ranking — Sports Core preview (Pitoniso v2).
 * TypeScript puro; sin fetch ni Supabase.
 */

import { lookupFifaRank } from "@/lib/sports-core/data/fifa-ranking-2026-06";

export type FifaRankingLeader = "local" | "visitante" | "neutral";

export type FifaRankingConfidence = "low" | "medium" | "high";

export interface FifaRankingSignal {
  leader: FifaRankingLeader;
  rankDiff: number;
  confidence: FifaRankingConfidence;
  label: string;
  localRank: number;
  visitanteRank: number;
}


function confidenceFromDiff(diff: number): FifaRankingConfidence {
  if (diff <= 5) return "low";
  if (diff <= 20) return "medium";
  return "high";
}

function labelFromDiff(diff: number, leader: FifaRankingLeader): string {
  if (leader === "neutral") {
    return "Ranking FIFA casi empatado";
  }
  if (diff <= 5) {
    return "Ranking FIFA muy parejo";
  }
  if (diff <= 20) {
    return leader === "local"
      ? "Ligera ventaja local en el ranking mundial"
      : "Ligera ventaja visitante en el ranking mundial";
  }
  if (diff <= 50) {
    return leader === "local"
      ? "Ventaja clara del local en el ranking mundial"
      : "Ventaja clara del visitante en el ranking mundial";
  }
  return leader === "local"
    ? "Fuerte ventaja del local en el ranking mundial"
    : "Fuerte ventaja del visitante en el ranking mundial";
}

/**
 * Compara posiciones FIFA de ambos equipos.
 * Devuelve null si falta ranking para alguno.
 */
export function getFifaRankingSignal(
  localCode: string,
  visitanteCode: string,
): FifaRankingSignal | null {
  const localEntry = lookupFifaRank(localCode);
  const awayEntry = lookupFifaRank(visitanteCode);
  if (!localEntry || !awayEntry) return null;

  const localRank = localEntry.rank;
  const visitanteRank = awayEntry.rank;
  const rankDiff = Math.abs(localRank - visitanteRank);

  let leader: FifaRankingLeader;
  if (rankDiff <= 5) {
    leader = "neutral";
  } else if (localRank < visitanteRank) {
    leader = "local";
  } else {
    leader = "visitante";
  }

  return {
    leader,
    rankDiff,
    confidence: confidenceFromDiff(rankDiff),
    label: labelFromDiff(rankDiff, leader),
    localRank,
    visitanteRank,
  };
}

/** Valor normalizado 0–1 para el motor (rank 1 → ~1). */
export function fifaRankNorm(rank: number): number {
  const maxRank = 210;
  return Math.min(1, Math.max(0, 1 - (rank - 1) / (maxRank - 1)));
}

export function rankingSignalAnalyticsValue(
  signal: FifaRankingSignal | null,
): "none" | FifaRankingLeader {
  if (!signal) return "none";
  return signal.leader;
}
