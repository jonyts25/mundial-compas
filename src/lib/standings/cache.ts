import { unstable_cache } from "next/cache";
import { fetchApiSportsStandings } from "@/lib/api-football/fetch-standings";
import { getApiSportsEnv } from "@/lib/env";
import { mapStandingsToGroups } from "@/lib/standings/map-standings";
import type { GroupStandingsSnapshot } from "@/lib/standings/types";

export const STANDINGS_CACHE_TAG = "world-cup-standings";

const DEFAULT_REVALIDATE_SECONDS = 1800;

export function getStandingsRevalidateSeconds(): number {
  const raw = process.env.STANDINGS_CACHE_SECONDS?.trim();
  if (!raw) return DEFAULT_REVALIDATE_SECONDS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REVALIDATE_SECONDS;
}

async function fetchStandingsSnapshot(): Promise<GroupStandingsSnapshot> {
  const { worldCupLeagueId } = getApiSportsEnv();
  const rows = await fetchApiSportsStandings();
  return mapStandingsToGroups(rows, worldCupLeagueId);
}

export function getCachedGroupStandings(): Promise<GroupStandingsSnapshot> {
  const revalidate = getStandingsRevalidateSeconds();

  return unstable_cache(fetchStandingsSnapshot, ["api-sports-group-standings-v1"], {
    revalidate,
    tags: [STANDINGS_CACHE_TAG],
  })();
}
