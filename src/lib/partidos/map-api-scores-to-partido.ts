import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import { normalizeTeamNameForMatch } from "@/lib/partidos/partido-match-key";

/** Mapea goles API (home/away) al local/visitante del row en BD. */
export function mapFixtureScoresToPartido(
  existing: {
    equipo_local_nombre: string;
    equipo_visitante_nombre: string;
  },
  item: ApiFootballFixtureItem,
): { marcador_local: number | null; marcador_visitante: number | null } {
  const apiHome = normalizeTeamNameForMatch(item.teams.home.name);
  const apiAway = normalizeTeamNameForMatch(item.teams.away.name);
  const dbLocal = normalizeTeamNameForMatch(existing.equipo_local_nombre);
  const dbAway = normalizeTeamNameForMatch(existing.equipo_visitante_nombre);
  const homeGoals = item.goals.home;
  const awayGoals = item.goals.away;

  if (apiHome === dbLocal && apiAway === dbAway) {
    return { marcador_local: homeGoals, marcador_visitante: awayGoals };
  }
  if (apiHome === dbAway && apiAway === dbLocal) {
    return { marcador_local: awayGoals, marcador_visitante: homeGoals };
  }
  return { marcador_local: homeGoals, marcador_visitante: awayGoals };
}

export function teamsMatchEitherOrder(
  existing: {
    equipo_local_nombre: string;
    equipo_visitante_nombre: string;
  },
  item: ApiFootballFixtureItem,
): boolean {
  const apiHome = normalizeTeamNameForMatch(item.teams.home.name);
  const apiAway = normalizeTeamNameForMatch(item.teams.away.name);
  const dbLocal = normalizeTeamNameForMatch(existing.equipo_local_nombre);
  const dbAway = normalizeTeamNameForMatch(existing.equipo_visitante_nombre);
  return (
    (apiHome === dbLocal && apiAway === dbAway) ||
    (apiHome === dbAway && apiAway === dbLocal)
  );
}
