import type { SupabaseClient } from "@supabase/supabase-js";
import { relojToMetadata } from "@/lib/partidos/match-clock";
import type { EstatusPartido } from "@/types/database";

const LIVE_ESTATUS = new Set<EstatusPartido>(["en_vivo", "medio_tiempo"]);
const HALTED_ESTATUS = new Set<EstatusPartido>([
  "programado",
  "aplazado",
  "suspendido",
  "cancelado",
]);

const LIVE_NOTIFY_KEYS = [
  "announced_phases",
  "gol_notify_score",
  "pen_notify_score",
  "notified_red_cards",
  "notified_penal_fallados",
  "notified_cancelled_goals",
] as const;

/** True si el partido dejó de estar en juego (aplazado, suspendido, etc.). */
export function shouldResetLiveNotifyState(
  prevEstatus: EstatusPartido,
  nextEstatus: EstatusPartido,
): boolean {
  if (nextEstatus === "aplazado" || nextEstatus === "suspendido" || nextEstatus === "cancelado") {
    return true;
  }
  if (LIVE_ESTATUS.has(prevEstatus) && HALTED_ESTATUS.has(nextEstatus)) {
    return true;
  }
  return false;
}

/** Limpia estado de dedup de fases/goles para permitir notificaciones tras un aplazamiento. */
export function clearLiveNotifyMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...metadata };
  for (const key of LIVE_NOTIFY_KEYS) {
    delete next[key];
  }
  next.reloj = relojToMetadata({
    period: "NS",
    anchorMinute: null,
    anchoredAt: new Date().toISOString(),
    ticking: false,
  });
  return next;
}

const LIVE_EVENT_PROVEEDOR = "api-sports-live";

/** Elimina claims de eventos live para que kickoff/goles/fases puedan re-notificarse. */
export async function clearLiveEventClaims(
  supabase: SupabaseClient,
  partidoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("webhook_eventos")
    .delete()
    .eq("proveedor", LIVE_EVENT_PROVEEDOR)
    .eq("partido_id", partidoId);

  if (error) {
    console.warn(`[push] clear claims partido=${partidoId}:`, error.message);
  }
}

export async function resetPartidoLiveNotifyState(
  supabase: SupabaseClient,
  partidoId: string,
  metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await clearLiveEventClaims(supabase, partidoId);
  return clearLiveNotifyMetadata(metadata);
}
