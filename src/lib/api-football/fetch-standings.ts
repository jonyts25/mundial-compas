import { apiSportsGet } from "@/lib/api-football/client";
import { getApiSportsEnv } from "@/lib/env";

export type ApiSportsStandingRow = {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
};

export async function fetchApiSportsStandings(
  apiKey?: string,
  opts: { leagueId?: number; season?: number } = {},
): Promise<ApiSportsStandingRow[]> {
  const env = getApiSportsEnv();
  const key = apiKey ?? env.apiKey;
  const leagueId = opts.leagueId ?? env.worldCupLeagueId;
  const season = opts.season ?? env.worldCupSeason;

  const body = await apiSportsGet<
    Array<{
      league: {
        id: number;
        standings: ApiSportsStandingRow[][];
      };
    }>
  >("/standings", key, { league: leagueId, season });

  const rows: ApiSportsStandingRow[] = [];
  for (const block of body.response?.[0]?.league?.standings ?? []) {
    for (const row of block) {
      rows.push(row);
    }
  }
  return rows;
}
