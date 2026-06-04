import {
  BEST_THIRD_TIEBREAKER_ORDER,
  sortTeamsByTiebreakers,
  type FinishedGroupMatch,
  type TeamStats,
} from "@/lib/standings/tiebreakers";
import {
  BEST_THIRD_PLACES_QUALIFY_COUNT,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import type { StandingGroup } from "@/lib/standings/types";

export interface BestThirdPlaceRow {
  rank: number;
  groupKey: WorldCupGroupLetter;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  /** Entre los 8 mejores terceros que avanzan a dieciseisavos */
  qualifies: boolean;
}

/**
 * Los 8 mejores terceros (FIFA): 2 primeros por grupo + 8 mejores 3.º = 32 en ronda de 32.
 */
export function buildBestThirdPlacesRanking(
  groups: StandingGroup[],
): BestThirdPlaceRow[] {
  const thirds: { stats: TeamStats; groupKey: WorldCupGroupLetter }[] = [];
  const pseudoMatches: FinishedGroupMatch[] = [];

  for (const group of groups) {
    const third = group.teams.find((t) => t.position === 3);
    if (!third) continue;
    thirds.push({
      groupKey: group.groupKey as WorldCupGroupLetter,
      stats: {
        teamKey: third.teamId,
        teamName: third.teamName,
        played: third.played,
        wins: third.wins,
        draws: third.draws,
        losses: third.losses,
        goalsFor: third.goalsFor,
        goalsAgainst: third.goalsAgainst,
        points: third.points,
      },
    });
  }

  const sorted = sortTeamsByTiebreakers(
    thirds.map((t) => t.stats),
    pseudoMatches,
    BEST_THIRD_TIEBREAKER_ORDER,
  );

  return sorted.map((team, index) => {
    const entry = thirds.find((t) => t.stats.teamKey === team.teamKey)!;

    return {
      rank: index + 1,
      groupKey: entry.groupKey,
      teamId: team.teamKey,
      teamName: team.teamName,
      played: team.played,
      wins: team.wins,
      draws: team.draws,
      losses: team.losses,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDiff: team.goalsFor - team.goalsAgainst,
      points: team.points,
      qualifies: index < BEST_THIRD_PLACES_QUALIFY_COUNT,
    };
  });
}
