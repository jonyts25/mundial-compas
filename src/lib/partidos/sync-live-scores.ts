import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLeagueEvents } from "@/lib/apifootball/fetch-world-cup-events";
import {
  buildClockState,
  hasPenaltyShootoutPayload,
  parseApiMatchMinute,
  parsePenaltyScores,
  parseRelojFromMetadata,
  relojToMetadata,
} from "@/lib/partidos/match-clock";
import { mapEventToPartidoRow } from "@/lib/apifootball/map-event-to-partido";
import { getPilotConfig } from "@/lib/apifootball/pilot-config";
import { getApiFootballEnv, getFootballDataProvider } from "@/lib/env";
import {
  emptySyncSkippedResult,
  getLiveSyncWindowConfig,
  getLiveSyncWindowStatus,
} from "@/lib/partidos/live-sync-window";
import { syncLiveScoresFromApiSports } from "@/lib/partidos/sync-live-scores-api-sports";

function todayMexicoDate(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  });
}

function pilotDateRange(pilotFrom: string, pilotTo: string): { from: string; to: string } {
  const today = todayMexicoDate();
  const from = pilotFrom < today ? pilotFrom : today;
  const to = pilotTo > today ? pilotTo : today;
  if (from > to) return { from: today, to: today };
  return { from, to };
}

export type SyncLiveResult = {
  fetched: number;
  updated: number;
  live: number;
  goalsNotified: number;
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

/** Polling de marcador según proveedor activo (FOOTBALL_DATA_PROVIDER). */
export async function syncLiveScoresFromApi(
  supabase: SupabaseClient,
  options: { pilotOnly?: boolean; force?: boolean } = {},
): Promise<SyncLiveResult> {
  const windowConfig = getLiveSyncWindowConfig();
  const window = await getLiveSyncWindowStatus(supabase, windowConfig);

  if (windowConfig.enabled && !options.force && !window.inWindow) {
    return emptySyncSkippedResult(window);
  }

  if (getFootballDataProvider() === "api-sports") {
    const result = await syncLiveScoresFromApiSports(supabase);
    return { ...result, window, apiRequests: 1 };
  }

  const { apiKey, timezone } = getApiFootballEnv();
  const pilot = getPilotConfig();
  const result: SyncLiveResult = {
    fetched: 0,
    updated: 0,
    live: 0,
    goalsNotified: 0,
    phasesNotified: 0,
    errors: [],
  };

  const today = todayMexicoDate();
  const range =
    pilot.enabled && options.pilotOnly !== false
      ? pilotDateRange(pilot.from, pilot.to)
      : { from: today, to: today };

  const events = await fetchLeagueEvents(apiKey, {
    from: range.from,
    to: range.to,
    leagueId: pilot.enabled ? pilot.leagueId ?? undefined : undefined,
    resolveChampions: pilot.enabled && !pilot.leagueId,
    timezone,
  });

  result.fetched = events.length;

  for (const event of events) {
    try {
      const row = mapEventToPartidoRow(event, {
        timezone,
        pilot: pilot.enabled
          ? { label: pilot.label }
          : undefined,
      });

      const { data: existing, error: findError } = await supabase
        .from("partidos")
        .select("id, metadata")
        .eq("api_football_fixture_id", row.api_football_fixture_id)
        .maybeSingle();

      if (findError) {
        result.errors.push(findError.message);
        continue;
      }
      if (!existing) continue;

      const prevReloj = parseRelojFromMetadata(existing.metadata);
      const statusRaw = event.match_status ?? "";
      const apiMinute = parseApiMatchMinute(statusRaw);
      const penaltyScores = hasPenaltyShootoutPayload(event);
      const pen = parsePenaltyScores(event);
      const reloj = buildClockState(
        statusRaw,
        row.estatus,
        apiMinute ?? row.minuto_actual,
        prevReloj,
        { hasPenaltyScores: penaltyScores },
      );

      const metadata = {
        ...(typeof existing.metadata === "object" && existing.metadata !== null
          ? (existing.metadata as Record<string, unknown>)
          : {}),
        apifootball: {
          ...((existing.metadata as Record<string, unknown>)?.apifootball as object),
          match_status: event.match_status,
          match_live: event.match_live,
          last_live_sync: new Date().toISOString(),
        },
        reloj: relojToMetadata(reloj),
        ...(pen.local != null ? { marcador_penales_local: pen.local } : {}),
        ...(pen.visitante != null ? { marcador_penales_visitante: pen.visitante } : {}),
      };

      const { error: updateError } = await supabase
        .from("partidos")
        .update({
          estatus: row.estatus,
          marcador_local: row.marcador_local,
          marcador_visitante: row.marcador_visitante,
          minuto_actual: reloj.ticking ? reloj.anchorMinute : null,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        result.errors.push(updateError.message);
        continue;
      }

      result.updated += 1;
      if (row.estatus === "en_vivo" || row.estatus === "medio_tiempo") {
        result.live += 1;
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { ...result, window, apiRequests: 1 };
}
