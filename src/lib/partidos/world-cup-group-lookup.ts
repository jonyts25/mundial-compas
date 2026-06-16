import { apiSportsGet } from "@/lib/api-football/client";
import { normalizeTeamNameForMatch } from "@/lib/partidos/partido-match-key";

export type WorldCupGroupLookup = Map<string, string>;

/** Group A → A desde standings api-sports (World Cup 2026). */
function parseGroupLetter(groupLabel: string | null | undefined): string | null {
  if (!groupLabel) return null;
  const m = groupLabel.match(/group\s+([a-l])\b/i);
  return m?.[1]?.toUpperCase() ?? null;
}

export async function fetchWorldCupGroupLookup(
  apiKey: string,
  season = 2026,
  leagueId = 1,
): Promise<WorldCupGroupLookup> {
  const body = await apiSportsGet<
    Array<{
      league: {
        standings: Array<
          Array<{
            group: string;
            team: { name: string };
          }>
        >;
      };
    }>
  >("/standings", apiKey, { league: leagueId, season });

  const lookup: WorldCupGroupLookup = new Map();

  for (const block of body.response?.[0]?.league?.standings ?? []) {
    for (const row of block) {
      const letter = parseGroupLetter(row.group);
      if (!letter) continue;
      lookup.set(normalizeTeamNameForMatch(row.team.name), letter);
    }
  }

  return lookup;
}

export function resolveGrupoFromTeams(
  lookup: WorldCupGroupLookup,
  localName: string,
  awayName: string,
): string | null {
  const localGrupo = lookup.get(normalizeTeamNameForMatch(localName));
  const awayGrupo = lookup.get(normalizeTeamNameForMatch(awayName));
  if (localGrupo && awayGrupo && localGrupo === awayGrupo) return localGrupo;
  return localGrupo ?? awayGrupo ?? null;
}

export function parseJornadaFromRound(round: string | null | undefined): number | null {
  if (!round) return null;
  const m = round.match(/group\s+stage\s*-\s*(\d+)/i) ?? round.match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isNaN(n) ? null : n;
}
