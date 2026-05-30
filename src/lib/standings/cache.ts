import { unstable_cache } from "next/cache";
import { fetchApifootballStandings } from "@/lib/apifootball/fetch-standings";
import { getApiFootballEnv } from "@/lib/env";
import { mapStandingsToGroups } from "@/lib/standings/map-standings";
import type { GroupStandingsSnapshot } from "@/lib/standings/types";

/** Tag para invalidar desde webhook/admin en el futuro: revalidateTag(STANDINGS_CACHE_TAG) */
export const STANDINGS_CACHE_TAG = "world-cup-standings";

const DEFAULT_REVALIDATE_SECONDS = 1800;

export function getStandingsRevalidateSeconds(): number {
  const raw = process.env.STANDINGS_CACHE_SECONDS?.trim();
  if (!raw) return DEFAULT_REVALIDATE_SECONDS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REVALIDATE_SECONDS;
}

async function fetchStandingsSnapshot(): Promise<GroupStandingsSnapshot> {
  const { apiKey, leagueId } = getApiFootballEnv();
  const resolvedLeagueId = leagueId ?? "28";
  const rows = await fetchApifootballStandings(apiKey, { leagueId: resolvedLeagueId });
  return mapStandingsToGroups(rows, resolvedLeagueId);
}

/**
 * Posiciones con caché en servidor (Next.js Data Cache).
 * Por defecto 30 min — la tabla no cambia en tiempo real.
 */
export function getCachedGroupStandings(): Promise<GroupStandingsSnapshot> {
  const revalidate = getStandingsRevalidateSeconds();

  return unstable_cache(fetchStandingsSnapshot, ["apifootball-group-standings-v1"], {
    revalidate,
    tags: [STANDINGS_CACHE_TAG],
  })();
}
