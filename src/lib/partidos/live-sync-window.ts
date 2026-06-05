import type { SupabaseClient } from "@supabase/supabase-js";

export interface LiveSyncWindowConfig {
  enabled: boolean;
  /** Minutos antes del kickoff para empezar a pollear. */
  beforeMinutes: number;
  /** Horas tras el kickoff para seguir polleando partidos aún "programado". */
  maxHoursAfterKickoff: number;
}

export function getLiveSyncWindowConfig(): LiveSyncWindowConfig {
  const enabled = process.env.SYNC_LIVE_WINDOW_ENABLED?.toLowerCase() !== "false";
  const beforeMinutes = Number(process.env.SYNC_LIVE_WINDOW_BEFORE_MIN ?? "15");
  const maxHoursAfterKickoff = Number(
    process.env.SYNC_LIVE_WINDOW_MAX_HOURS ?? "3.5",
  );
  return {
    enabled,
    beforeMinutes: Number.isFinite(beforeMinutes) ? beforeMinutes : 15,
    maxHoursAfterKickoff: Number.isFinite(maxHoursAfterKickoff)
      ? maxHoursAfterKickoff
      : 3.5,
  };
}

export type LiveWindowStatus = {
  inWindow: boolean;
  count: number;
  liveNow: number;
  upcoming: number;
};

/** Hay partidos que requieren polling (en vivo o ventana ±15 min / +3.5 h). */
export async function getLiveSyncWindowStatus(
  supabase: SupabaseClient,
  config: LiveSyncWindowConfig = getLiveSyncWindowConfig(),
): Promise<LiveWindowStatus> {
  const { count: liveNow, error: liveErr } = await supabase
    .from("partidos")
    .select("id", { count: "exact", head: true })
    .in("estatus", ["en_vivo", "medio_tiempo"]);

  if (liveErr) throw new Error(liveErr.message);

  const live = liveNow ?? 0;
  if (live > 0) {
    return { inWindow: true, count: live, liveNow: live, upcoming: 0 };
  }

  const now = Date.now();
  const soonIso = new Date(
    now + config.beforeMinutes * 60_000,
  ).toISOString();
  const lookbackIso = new Date(
    now - config.maxHoursAfterKickoff * 60 * 60_000,
  ).toISOString();

  const { count: upcoming, error: upErr } = await supabase
    .from("partidos")
    .select("id", { count: "exact", head: true })
    .eq("estatus", "programado")
    .gte("fecha_kickoff", lookbackIso)
    .lte("fecha_kickoff", soonIso);

  if (upErr) throw new Error(upErr.message);

  const up = upcoming ?? 0;
  return {
    inWindow: up > 0,
    count: up,
    liveNow: 0,
    upcoming: up,
  };
}

export function emptySyncSkippedResult(
  window: LiveWindowStatus,
): {
  fetched: number;
  updated: number;
  live: number;
  goalsNotified: number;
  phasesNotified: number;
  errors: string[];
  skipped: true;
  skipReason: string;
  window: LiveWindowStatus;
  apiRequests: 0;
} {
  return {
    fetched: 0,
    updated: 0,
    live: 0,
    goalsNotified: 0,
    phasesNotified: 0,
    errors: [],
    skipped: true,
    skipReason: "fuera_de_ventana",
    window,
    apiRequests: 0,
  };
}
