import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { dispatchPushForNotifications } from "@/lib/push/send";

export type PartidoPushTipo =
  | "gol"
  | "tarjeta_roja"
  | "inicio_partido"
  | "medio_tiempo"
  | "inicio_segundo_tiempo"
  | "inicio_tiempo_extra"
  | "inicio_penales"
  | "penal_fallado"
  | "fin_partido"
  | "alineaciones";

/** Encola notificaciones y las envía por Web Push si hay suscripción activa. */
export async function queuePartidoPushNotifications(
  supabase: SupabaseClient,
  partidoId: string,
  tipo: PartidoPushTipo,
  titulo: string,
  cuerpo: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { data: miembros } = await supabase
    .from("liga_miembros")
    .select("usuario_id")
    .eq("liga_id", LIGA_GLOBAL_ID);

  if (!miembros?.length) return;

  const ids = miembros.map((m) => m.usuario_id);
  const { data: usuariosPush } = await supabase
    .from("usuarios")
    .select("id")
    .in("id", ids)
    .eq("push_habilitado", true);

  const rows = (usuariosPush ?? []).map((u) => ({
    usuario_id: u.id,
    tipo,
    titulo,
    cuerpo,
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    metadata,
  }));

  if (rows.length === 0) return;

  const { data: inserted } = await supabase
    .from("notificaciones")
    .insert(rows)
    .select("id, usuario_id, titulo, cuerpo, partido_id");

  if (inserted?.length) {
    await dispatchPushForNotifications(supabase, inserted);
  }
}

/** @deprecated Usar queuePartidoPushNotifications */
export async function queuePartidoGoalNotifications(
  supabase: SupabaseClient,
  partidoId: string,
  titulo: string,
  cuerpo: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  return queuePartidoPushNotifications(
    supabase,
    partidoId,
    "gol",
    titulo,
    cuerpo,
    metadata,
  );
}
