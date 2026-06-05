import {
  API_SPORTS_MEXICO_TEAM_ID,
  API_SPORTS_WORLD_CUP_LEAGUE_ID,
} from "@/lib/api-football/constants";
import { fetchApiSportsFixtures } from "@/lib/api-football/fetch-fixtures";
import { getApiSportsEnv } from "@/lib/env";

export interface LoadApiSportsOptions {
  modoPilot?: boolean;
  date?: string;
  team?: number;
  fixture?: number;
  league?: number;
  season?: number;
}

export async function loadApiSportsFixtures(
  options: LoadApiSportsOptions = {},
): Promise<{ items: Awaited<ReturnType<typeof fetchApiSportsFixtures>>; query: Record<string, unknown> }> {
  const env = getApiSportsEnv();
  const isPilot = options.modoPilot === true;

  const query: Record<string, unknown> = {
    timezone: env.timezone,
  };

  if (options.fixture ?? env.pilotFixtureId) {
    query.fixture = options.fixture ?? env.pilotFixtureId;
  } else if (isPilot) {
    query.date = options.date ?? env.pilotDate;
    query.team = options.team ?? env.pilotTeamId ?? API_SPORTS_MEXICO_TEAM_ID;
  } else {
    query.league = options.league ?? env.worldCupLeagueId ?? API_SPORTS_WORLD_CUP_LEAGUE_ID;
    query.season = options.season ?? env.worldCupSeason;
    if (options.date) query.date = options.date;
  }

  const items = await fetchApiSportsFixtures(env.apiKey, {
    date: query.date as string | undefined,
    league: query.league as number | undefined,
    season: query.season as number | undefined,
    team: query.team as number | undefined,
    fixture: query.fixture as number | undefined,
    timezone: env.timezone,
  });

  return { items, query };
}
