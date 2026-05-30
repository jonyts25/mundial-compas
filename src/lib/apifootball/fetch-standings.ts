import { apifootballGet } from "@/lib/apifootball/client";
import type { ApifootballStandingRow } from "@/lib/apifootball/types";

const DEFAULT_WORLD_CUP_LEAGUE_ID = "28";

export interface FetchStandingsOptions {
  leagueId?: string;
}

/**
 * Tabla de posiciones — action=get_standings&league_id=…
 * @see https://apifootball.com/documentation/
 */
export async function fetchApifootballStandings(
  apiKey: string,
  options: FetchStandingsOptions = {},
): Promise<ApifootballStandingRow[]> {
  const leagueId = options.leagueId?.trim() || DEFAULT_WORLD_CUP_LEAGUE_ID;

  const data = await apifootballGet<
    ApifootballStandingRow[] | { error: number; message?: string }
  >("get_standings", apiKey, { league_id: leagueId });

  if (!Array.isArray(data)) {
    throw new Error(
      `get_standings inesperado: ${JSON.stringify(data).slice(0, 300)}`,
    );
  }

  return data;
}
