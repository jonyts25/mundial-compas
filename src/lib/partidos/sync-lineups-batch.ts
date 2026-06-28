import type { SupabaseClient } from "@supabase/supabase-js";
import { syncPartidoLineups } from "@/lib/partidos/sync-lineups";

const PARTIDO_SELECT =
  "id, api_football_fixture_id, fecha_kickoff, estatus, equipo_local_nombre, equipo_visitante_nombre, metadata";

export type SyncLineupsBatchResult = {
  checked: number;
  synced: number;
  withLineups: number;
  notified: number;
};

/** Partidos en ventana de alineaciones (4 h antes → 30 min después del pitazo). */
export async function syncPartidosLineupsInWindow(
  supabase: SupabaseClient,
): Promise<SyncLineupsBatchResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(PARTIDO_SELECT)
    .in("estatus", ["programado", "en_vivo"])
    .gte("fecha_kickoff", windowStart.toISOString())
    .lte("fecha_kickoff", windowEnd.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  let synced = 0;
  let withLineups = 0;
  let notified = 0;

  for (const partido of partidos ?? []) {
    const meta = partido.metadata as Record<string, unknown> | null;
    const existing = meta?.alineaciones as { notifiedAt?: string | null } | undefined;
    const hadNotified = Boolean(existing?.notifiedAt);

    const result = await syncPartidoLineups(supabase, partido);
    if (!result.fromCache && result.lineups) synced += 1;
    if (result.available) withLineups += 1;
    if (result.lineups?.notifiedAt && !hadNotified) notified += 1;
  }

  return {
    checked: partidos?.length ?? 0,
    synced,
    withLineups,
    notified,
  };
}
