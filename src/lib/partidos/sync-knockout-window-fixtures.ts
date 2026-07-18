import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchApiSportsFixtures } from "@/lib/api-football/fetch-fixtures";
import { mapFixtureToPartidoRow, resolveFifaMatchNumber } from "@/lib/api-football/map-fixture-row";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import { toMexicoDateKey } from "@/lib/datetime/mexico";
import { getApiSportsEnv } from "@/lib/env";
import {
  getLiveSyncWindowConfig,
  type LiveSyncWindowConfig,
} from "@/lib/partidos/live-sync-window";
import type { SyncLiveResult } from "@/lib/partidos/sync-live-scores";

type SyncFixtureFn = (item: ApiFootballFixtureItem) => Promise<void>;

function isKnockoutFixture(item: ApiFootballFixtureItem): boolean {
  const round = (item.league.round ?? "").toLowerCase();
  if (round.includes("group")) return false;
  return (
    round.includes("round of") ||
    round.includes("8th finals") ||
    round.includes("quarter") ||
    round.includes("semi") ||
    round.includes("3rd") ||
    round.includes("third") ||
    round === "final" ||
    round.endsWith(" - final") ||
    resolveFifaMatchNumber(item) != null
  );
}

/** Respaldo: fixtures del día para KO en ventana (no depende solo de live=all). */
export async function syncKnockoutFixturesByDateInWindow(
  supabase: SupabaseClient,
  apiKey: string,
  timezone: string,
  syncFixture: SyncFixtureFn,
  result: SyncLiveResult,
  skipFixtureIds: Set<number>,
  config: LiveSyncWindowConfig = getLiveSyncWindowConfig(),
): Promise<void> {
  const now = Date.now();
  const lookbackIso = new Date(
    now - config.maxHoursAfterKickoff * 60 * 60_000,
  ).toISOString();
  const soonIso = new Date(
    now + config.beforeMinutes * 60_000,
  ).toISOString();

  const { data: knockoutRows, error } = await supabase
    .from("partidos")
    .select("id, fase, fecha_kickoff, estatus")
    .neq("fase", "grupos")
    .in("estatus", ["programado", "en_vivo", "medio_tiempo"])
    .gte("fecha_kickoff", lookbackIso)
    .lte("fecha_kickoff", soonIso);

  if (error) {
    result.errors.push(`knockout-window: ${error.message}`);
    return;
  }
  if (!knockoutRows?.length) return;

  const dates = [
    ...new Set(knockoutRows.map((r) => toMexicoDateKey(String(r.fecha_kickoff)))),
  ];
  const { worldCupLeagueId, worldCupSeason } = getApiSportsEnv();

  for (const date of dates) {
    try {
      const items = await fetchApiSportsFixtures(apiKey, {
        date,
        league: worldCupLeagueId,
        season: worldCupSeason,
        timezone,
      });
      result.apiRequests = (result.apiRequests ?? 0) + 1;

      for (const item of items) {
        if (!isKnockoutFixture(item)) continue;
        if (skipFixtureIds.has(item.fixture.id)) continue;
        await syncFixture(item);
      }
    } catch (e) {
      result.errors.push(
        `knockout-date ${date}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
