import { apiSportsGet } from "@/lib/api-football/client";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";

export interface FetchApiSportsFixturesOptions {
  date?: string;
  league?: number;
  season?: number;
  team?: number;
  fixture?: number;
  /** Hasta 20 ids: "1208021-1208022" */
  ids?: string;
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
      ids: options.ids,
      live: options.live,
      timezone: options.timezone,
    },
  );
  return envelope.response ?? [];
}

/** Consulta fixtures por id (máx. 20 por request). */
export async function fetchApiSportsFixturesByIds(
  apiKey: string,
  fixtureIds: number[],
  timezone?: string,
): Promise<ApiFootballFixtureItem[]> {
  if (fixtureIds.length === 0) return [];

  const items: ApiFootballFixtureItem[] = [];
  for (let i = 0; i < fixtureIds.length; i += 20) {
    const chunk = fixtureIds.slice(i, i + 20);
    const batch = await fetchApiSportsFixtures(apiKey, {
      ids: chunk.join("-"),
      timezone,
    });
    items.push(...batch);
  }
  return items;
}

export async function fetchApiSportsLiveFixtures(
  apiKey: string,
  timezone?: string,
  live: string = "all",
): Promise<ApiFootballFixtureItem[]> {
  return fetchApiSportsFixtures(apiKey, { live, timezone });
}
