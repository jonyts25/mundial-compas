import {
  GROUP_TIEBREAKER_ORDER,
  sortTeamsByTiebreakers,
  type FinishedGroupMatch,
  type TeamStats,
  type TiebreakerCriterion,
} from "@/lib/standings/tiebreakers";

export interface TiebreakerDecision {
  higherTeamId: string;
  lowerTeamId: string;
  /** Primer criterio FIFA que separa el orden (excluye empate). */
  decidingCriterion: TiebreakerCriterion | "team_name";
  explanation: string;
}

function compareCriterion(
  a: TeamStats,
  b: TeamStats,
  criterion: TiebreakerCriterion,
  tied: TeamStats[],
  matches: FinishedGroupMatch[],
): number {
  const sorted = sortTeamsByTiebreakers(tied, matches);
  const posA = sorted.findIndex((t) => t.teamKey === a.teamKey);
  const posB = sorted.findIndex((t) => t.teamKey === b.teamKey);
  if (posA === posB) return 0;
  return posA < posB ? -1 : 1;
}

const CRITERION_LABELS: Record<TiebreakerCriterion | "team_name", string> = {
  points: "puntos totales",
  head_to_head_points: "puntos en enfrentamiento directo",
  head_to_head_goal_diff: "diferencia de goles en enfrentamiento directo",
  head_to_head_goals_for: "goles a favor en enfrentamiento directo",
  goal_diff_all: "diferencia de goles en el grupo",
  goals_for_all: "goles a favor en el grupo",
  fair_play: "fair play (sin datos — empate neutro en la app)",
  fifa_ranking_fallback: "orden alfabético (fallback sin ranking FIFA)",
  team_name: "nombre del equipo (desempate final)",
};

/**
 * Explica por qué `higher` queda por encima de `lower` según el motor FIFA actual.
 * Usa la misma función `sortTeamsByTiebreakers` que la tabla.
 */
export function explainRankBetweenTeams(
  teams: TeamStats[],
  matches: FinishedGroupMatch[],
  higherTeamId: string,
  lowerTeamId: string,
): TiebreakerDecision | null {
  const higher = teams.find((t) => t.teamKey === higherTeamId);
  const lower = teams.find((t) => t.teamKey === lowerTeamId);
  if (!higher || !lower) return null;

  const sorted = sortTeamsByTiebreakers(teams, matches);
  const hi = sorted.findIndex((t) => t.teamKey === higherTeamId);
  const lo = sorted.findIndex((t) => t.teamKey === lowerTeamId);
  if (hi < 0 || lo < 0 || hi >= lo) return null;

  const tied = teams.filter((t) => t.points === higher.points && t.points === lower.points);
  const pool = tied.length > 1 ? tied : teams;

  for (const criterion of GROUP_TIEBREAKER_ORDER) {
    if (criterion === "points") continue;
    const cmp = compareCriterion(higher, lower, criterion, pool, matches);
    if (cmp !== 0) {
      return {
        higherTeamId,
        lowerTeamId,
        decidingCriterion: criterion,
        explanation: `${higher.teamName} queda por encima de ${lower.teamName} por ${CRITERION_LABELS[criterion]}.`,
      };
    }
  }

  return {
    higherTeamId,
    lowerTeamId,
    decidingCriterion: "team_name",
    explanation: `${higher.teamName} queda por encima de ${lower.teamName} por ${CRITERION_LABELS.team_name}.`,
  };
}

export function getTeamPositionInGroup(
  teams: TeamStats[],
  matches: FinishedGroupMatch[],
  teamId: string,
): number {
  const sorted = sortTeamsByTiebreakers(teams, matches);
  const idx = sorted.findIndex((t) => t.teamKey === teamId);
  return idx >= 0 ? idx + 1 : -1;
}
