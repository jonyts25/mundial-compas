/**
 * Criterios de desempate FIFA — Mundial 2026 (fase de grupos y mejores terceros).
 * @see https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/groups-how-teams-qualify-tie-breakers
 *
 * Datos NO disponibles en BD hoy → fallback documentado:
 * - Fair play (tarjetas): sin agregado por partido → se omite (0) y pasa al siguiente criterio.
 * - Ranking FIFA: sin snapshot en app → orden alfabético por teamKey como último recurso estable.
 */

export interface TeamStats {
  teamKey: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface FinishedGroupMatch {
  homeKey: string;
  awayKey: string;
  homeGoals: number;
  awayGoals: number;
}

export type TiebreakerCriterion =
  | "points"
  | "goal_diff_all"
  | "goals_for_all"
  | "fair_play"
  | "fifa_ranking_fallback"
  | "head_to_head_points"
  | "head_to_head_goal_diff"
  | "head_to_head_goals_for";

export const GROUP_TIEBREAKER_ORDER: TiebreakerCriterion[] = [
  "points",
  "head_to_head_points",
  "head_to_head_goal_diff",
  "head_to_head_goals_for",
  "goal_diff_all",
  "goals_for_all",
  "fair_play",
  "fifa_ranking_fallback",
];

export const BEST_THIRD_TIEBREAKER_ORDER: TiebreakerCriterion[] = [
  "points",
  "goal_diff_all",
  "goals_for_all",
  "fair_play",
  "fifa_ranking_fallback",
];

export function goalDiff(team: TeamStats): number {
  return team.goalsFor - team.goalsAgainst;
}

function matchesAmong(
  teams: TeamStats[],
  allMatches: FinishedGroupMatch[],
): FinishedGroupMatch[] {
  const keys = new Set(teams.map((t) => t.teamKey));
  return allMatches.filter(
    (m) => keys.has(m.homeKey) && keys.has(m.awayKey),
  );
}

function miniStats(
  teams: TeamStats[],
  matches: FinishedGroupMatch[],
): Map<string, TeamStats> {
  const map = new Map<string, TeamStats>();
  for (const t of teams) {
    map.set(t.teamKey, {
      ...t,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    const home = map.get(m.homeKey);
    const away = map.get(m.awayKey);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeGoals;
    home.goalsAgainst += m.awayGoals;
    away.goalsFor += m.awayGoals;
    away.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (m.homeGoals < m.awayGoals) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return map;
}

function compareByCriterion(
  a: TeamStats,
  b: TeamStats,
  criterion: TiebreakerCriterion,
  subset: TeamStats[],
  allMatches: FinishedGroupMatch[],
): number {
  switch (criterion) {
    case "points":
      return b.points - a.points;
    case "goal_diff_all":
      return goalDiff(b) - goalDiff(a);
    case "goals_for_all":
      return b.goalsFor - a.goalsFor;
    case "fair_play":
      /** Sin datos de tarjetas por equipo — empate neutro. */
      return 0;
    case "fifa_ranking_fallback":
      return a.teamKey.localeCompare(b.teamKey);
    case "head_to_head_points":
    case "head_to_head_goal_diff":
    case "head_to_head_goals_for": {
      const h2h = miniStats(subset, matchesAmong(subset, allMatches));
      const ah = h2h.get(a.teamKey)!;
      const bh = h2h.get(b.teamKey)!;
      if (criterion === "head_to_head_points") return bh.points - ah.points;
      if (criterion === "head_to_head_goal_diff") return goalDiff(bh) - goalDiff(ah);
      return bh.goalsFor - ah.goalsFor;
    }
    default:
      return 0;
  }
}

/** Ordena equipos según criterios FIFA (fase de grupos). */
export function sortTeamsByTiebreakers(
  teams: TeamStats[],
  matches: FinishedGroupMatch[],
  order: TiebreakerCriterion[] = GROUP_TIEBREAKER_ORDER,
): TeamStats[] {
  const sorted = [...teams];

  sorted.sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    const tied = sorted.filter((t) => t.points === a.points);
    if (tied.length <= 1) {
      return compareByCriterion(a, b, "goal_diff_all", tied, matches);
    }

    for (const criterion of order) {
      if (criterion === "points") continue;
      const cmp = compareByCriterion(a, b, criterion, tied, matches);
      if (cmp !== 0) return cmp;
    }

    return a.teamName.localeCompare(b.teamName);
  });

  return sorted;
}
