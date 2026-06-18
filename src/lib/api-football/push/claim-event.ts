import type { SupabaseClient } from "@supabase/supabase-js";

const PROVEEDOR = "api-sports-live";
const SYNC_LOCK_PROVEEDOR = "sync-live-lock";

/** Evita dos POST /sync-live en paralelo (p. ej. dos réplicas del cron). */
export async function tryClaimSyncLiveRun(
  supabase: SupabaseClient,
  windowMs = 90_000,
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / windowMs);
  const { error } = await supabase.from("webhook_eventos").insert({
    proveedor: SYNC_LOCK_PROVEEDOR,
    evento_externo_id: String(bucket),
    tipo_evento: "run",
    payload: {},
    procesado: true,
    processed_at: new Date().toISOString(),
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

/** Reserva un evento live antes de chat/push (evita duplicados por polls concurrentes). */
export async function tryClaimLiveEvent(
  supabase: SupabaseClient,
  partidoId: string,
  eventKey: string,
  tipoEvento: string,
): Promise<boolean> {
  const { error } = await supabase.from("webhook_eventos").insert({
    proveedor: PROVEEDOR,
    evento_externo_id: `${partidoId}:${eventKey}`,
    tipo_evento: tipoEvento,
    payload: {},
    partido_id: partidoId,
    procesado: true,
    processed_at: new Date().toISOString(),
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}
