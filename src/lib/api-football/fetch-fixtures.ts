import { apiSportsGet } from "@/lib/api-football/client";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";

export interface FetchApiSportsFixturesOptions {
  date?: string;
  league?: number;
  season?: number;
  team?: number;
  fixture?: number;
  /** "all" o ids de liga: "1" o "1-2-140" */
  live?: string;
  timezone?: string;
}

export async function fetchApiSportsFixtures(
  apiKey: string,
  options: FetchApiSportsFixturesOptions = {},
): Promise<ApiFootballFixtureItem[]> {
  const envelope = await apiSportsGet<ApiFootballFixtureItem[]>(
    "/fixtures",
    apiKey,
    {
      date: options.date,
      league: options.league,
      season: options.season,
      team: options.team,
      id: options.fixture,
      live: options.live,
      timezone: options.timezone,
    },
  );
  return envelope.response ?? [];
}

export async function fetchApiSportsLiveFixtures(
  apiKey: string,
  timezone?: string,
  live: string = "all",
): Promise<ApiFootballFixtureItem[]> {
  return fetchApiSportsFixtures(apiKey, { live, timezone });
}
