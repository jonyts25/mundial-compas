import {
  sortTeamsByTiebreakers,
  type FinishedGroupMatch,
  type TeamStats,
} from "@/lib/standings/tiebreakers";
import type { StandingGroup, StandingTeamRow } from "@/lib/standings/types";
import {
  groupLabel,
  isWorldCupGroupLetter,
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";

export interface PartidoGrupoRow {
  id: string;
  grupo: string | null;
  fase: string;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  estatus: string;
}

function emptyStats(teamKey: string, teamName: string): TeamStats {
  return {
    teamKey,
    teamName,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

function isCountableMatch(p: PartidoGrupoRow): boolean {
  if (p.marcador_local == null || p.marcador_visitante == null) return false;
  return (
    p.estatus === "finalizado" ||
    p.estatus === "en_vivo" ||
    p.estatus === "medio_tiempo"
  );
}

function applyMatch(
  stats: Map<string, TeamStats>,
  match: FinishedGroupMatch,
): void {
  const home = stats.get(match.homeKey);
  const away = stats.get(match.awayKey);
  if (!home || !away) return;

  home.played += 1;
  away.played += 1;
  home.goalsFor += match.homeGoals;
  home.goalsAgainst += match.awayGoals;
  away.goalsFor += match.awayGoals;
  away.goalsAgainst += match.homeGoals;

  if (match.homeGoals > match.awayGoals) {
    home.wins += 1;
    home.points += 3;
    away.losses += 1;
  } else if (match.homeGoals < match.awayGoals) {
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

function toStandingRow(team: TeamStats, position: number): StandingTeamRow {
  return {
    position,
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
  };
}

export function calculateGroupStandingsFromPartidos(
  partidos: PartidoGrupoRow[],
): {
  groups: StandingGroup[];
  matchesByGroup: Record<WorldCupGroupLetter, FinishedGroupMatch[]>;
} {
  const matchesByGroup = {} as Record<WorldCupGroupLetter, FinishedGroupMatch[]>;
  for (const letter of WORLD_CUP_GROUP_LETTERS) {
    matchesByGroup[letter] = [];
  }

  const statsByGroup = new Map<WorldCupGroupLetter, Map<string, TeamStats>>();

  for (const letter of WORLD_CUP_GROUP_LETTERS) {
    statsByGroup.set(letter, new Map());
  }

  const grupoPartidos = partidos.filter(
    (p) => p.fase === "grupos" && isWorldCupGroupLetter(p.grupo),
  );

  for (const p of grupoPartidos) {
    const letter = p.grupo!.toUpperCase() as WorldCupGroupLetter;
    const groupStats = statsByGroup.get(letter)!;

    if (!groupStats.has(p.equipo_local_codigo)) {
      groupStats.set(
        p.equipo_local_codigo,
        emptyStats(p.equipo_local_codigo, p.equipo_local_nombre),
      );
    }
    if (!groupStats.has(p.equipo_visitante_codigo)) {
      groupStats.set(
        p.equipo_visitante_codigo,
        emptyStats(p.equipo_visitante_codigo, p.equipo_visitante_nombre),
      );
    }

    if (isCountableMatch(p)) {
      const match: FinishedGroupMatch = {
        homeKey: p.equipo_local_codigo,
        awayKey: p.equipo_visitante_codigo,
        homeGoals: p.marcador_local!,
        awayGoals: p.marcador_visitante!,
      };
      matchesByGroup[letter].push(match);
      applyMatch(groupStats, match);
    }
  }

  const groups: StandingGroup[] = WORLD_CUP_GROUP_LETTERS.map((letter) => {
    const groupStats = statsByGroup.get(letter)!;
    const teams = [...groupStats.values()];
    const sorted = sortTeamsByTiebreakers(teams, matchesByGroup[letter]);
    return {
      groupKey: letter,
      groupLabel: groupLabel(letter),
      teams: sorted.map((t, i) => toStandingRow(t, i + 1)),
    };
  });

  return { groups, matchesByGroup };
}

/** ¿La tabla calculada tiene al menos un resultado registrado? */
export function standingsHasResults(groups: StandingGroup[]): boolean {
  return groups.some((g) => g.teams.some((t) => t.played > 0));
}
