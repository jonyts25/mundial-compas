import type { ApifootballStandingRow } from "@/lib/apifootball/types";
import type { GroupStandingsSnapshot, StandingGroup, StandingTeamRow } from "@/lib/standings/types";

function parseNum(value: string | undefined): number {
  const n = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Extrae letra de grupo desde league_round / stage_name (ej. "Group A", "Grupo B"). */
export function extractGroupKey(row: ApifootballStandingRow): string {
  const candidates = [row.league_round, row.stage_name].filter(Boolean) as string[];

  for (const raw of candidates) {
    const text = raw.trim();
    const letterMatch =
      text.match(/(?:group|grupo)\s*([A-Z])/i) ??
      text.match(/^([A-Z])$/i);
    if (letterMatch?.[1]) {
      return letterMatch[1].toUpperCase();
    }
  }

  return "—";
}

function mapRow(row: ApifootballStandingRow): StandingTeamRow {
  const goalsFor = parseNum(row.overall_league_GF);
  const goalsAgainst = parseNum(row.overall_league_GA);

  return {
    position: parseNum(row.overall_league_position),
    teamId: row.team_id,
    teamName: row.team_name,
    played: parseNum(row.overall_league_payed),
    wins: parseNum(row.overall_league_W),
    draws: parseNum(row.overall_league_D),
    losses: parseNum(row.overall_league_L),
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    points: parseNum(row.overall_league_PTS),
  };
}

function groupLabelFromKey(key: string): string {
  if (key === "—") return "Clasificación general";
  return `Grupo ${key}`;
}

function sortGroups(a: StandingGroup, b: StandingGroup): number {
  if (a.groupKey === "—") return 1;
  if (b.groupKey === "—") return -1;
  return a.groupKey.localeCompare(b.groupKey);
}

/**
 * Agrupa filas de get_standings por fase de grupos del Mundial.
 */
export function mapStandingsToGroups(
  rows: ApifootballStandingRow[],
  leagueId: string,
): GroupStandingsSnapshot {
  const byGroup = new Map<string, StandingTeamRow[]>();

  for (const row of rows) {
    const key = extractGroupKey(row);
    const team = mapRow(row);
    const list = byGroup.get(key) ?? [];
    list.push(team);
    byGroup.set(key, list);
  }

  const groups: StandingGroup[] = [...byGroup.entries()].map(([groupKey, teams]) => {
    teams.sort((a, b) => a.position - b.position || a.teamName.localeCompare(b.teamName));
    return {
      groupKey,
      groupLabel: groupLabelFromKey(groupKey),
      teams,
    };
  });

  groups.sort(sortGroups);

  const leagueName = rows[0]?.league_name ?? null;

  return {
    leagueId,
    leagueName,
    fetchedAt: new Date().toISOString(),
    groups,
  };
}
