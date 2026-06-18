import type { SupabaseClient } from "@supabase/supabase-js";
import { syncLiveScoresFromApiSports } from "@/lib/partidos/sync-live-scores-api-sports";
import {
  emptySyncSkippedResult,
  getLiveSyncWindowConfig,
  getLiveSyncWindowStatus,
} from "@/lib/partidos/live-sync-window";

export type SyncLiveResult = {
  fetched: number;
  updated: number;
  live: number;
  goalsNotified: number;
  redCardsNotified: number;
  phasesNotified: number;
  errors: string[];
  skipped?: boolean;
  skipReason?: string;
  window?: {
    inWindow: boolean;
    count: number;
    liveNow: number;
    upcoming: number;
  };
  apiRequests?: number;
  phases?: string[];
};

/** Polling de marcador vía api-sports.io (api-football). */
export async function syncLiveScoresFromApi(
  supabase: SupabaseClient,
  options: { pilotOnly?: boolean; force?: boolean } = {},
): Promise<SyncLiveResult> {
  const windowConfig = getLiveSyncWindowConfig();
  const window = await getLiveSyncWindowStatus(supabase, windowConfig);

  if (windowConfig.enabled && !options.force && !window.inWindow) {
    return emptySyncSkippedResult(window);
  }

  const result = await syncLiveScoresFromApiSports(supabase);
  return { ...result, window, apiRequests: result.apiRequests ?? 1 };
}
