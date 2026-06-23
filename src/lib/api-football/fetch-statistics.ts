import { apiSportsGet } from "@/lib/api-football/client";

export interface ApiSportsTeamStatistic {
  type: string;
  value: number | string | null;
}

export interface ApiSportsFixtureStatisticsTeam {
  team: { id: number; name: string };
  statistics: ApiSportsTeamStatistic[];
}

export async function fetchApiSportsFixtureStatistics(
  apiKey: string,
  fixtureId: number,
): Promise<ApiSportsFixtureStatisticsTeam[]> {
  const envelope = await apiSportsGet<ApiSportsFixtureStatisticsTeam[]>(
    "/fixtures/statistics",
    apiKey,
    { fixture: fixtureId },
  );
  return envelope.response ?? [];
}
