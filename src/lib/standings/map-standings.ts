import type { ApiSportsStandingRow } from "@/lib/api-football/fetch-standings";
import type { GroupStandingsSnapshot, StandingGroup, StandingTeamRow } from "@/lib/standings/types";

function parseGroupKey(groupLabel: string | null | undefined): string {
  if (!groupLabel) return "—";
  const m = groupLabel.match(/group\s+([a-l])/i);
  return m?.[1]?.toUpperCase() ?? "—";
}

function mapRow(row: ApiSportsStandingRow): StandingTeamRow {
  return {
    position: row.rank,
    teamId: String(row.team.id),
    teamName: row.team.name,
    played: row.all.played,
    wins: row.all.win,
    draws: row.all.draw,
    losses: row.all.lose,
    goalsFor: row.all.goals.for,
    goalsAgainst: row.all.goals.against,
    goalDiff: row.goalsDiff,
    points: row.points,
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

export function mapStandingsToGroups(
  rows: ApiSportsStandingRow[],
  leagueId: string | number,
): GroupStandingsSnapshot {
  const byGroup = new Map<string, StandingTeamRow[]>();

  for (const row of rows) {
    const key = parseGroupKey(row.group);
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

  return {
    leagueId: String(leagueId),
    leagueName: "FIFA World Cup",
    fetchedAt: new Date().toISOString(),
    groups,
  };
}

/** @deprecated Compat tests — usa group de api-sports */
export function extractGroupKey(row: { group?: string; league_round?: string; stage_name?: string }): string {
  return parseGroupKey(row.group ?? row.league_round ?? row.stage_name);
}
