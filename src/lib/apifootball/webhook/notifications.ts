import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { dispatchPushForNotifications } from "@/lib/push/send";

export type PartidoPushTipo =
  | "gol"
  | "gol_anulado"
  | "tarjeta_roja"
  | "inicio_partido"
  | "medio_tiempo"
  | "inicio_segundo_tiempo"
  | "fin_tiempo_reglamentario"
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

  const { data: silenciados } = await supabase
    .from("push_partidos_silenciados")
    .select("usuario_id")
    .eq("partido_id", partidoId);

  const silenciadosSet = new Set(
    (silenciados ?? []).map((r) => r.usuario_id as string),
  );

  const ids = miembros
    .map((m) => m.usuario_id)
    .filter((id) => !silenciadosSet.has(id));
  if (ids.length === 0) return;

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

  if (tipo === "gol") {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count: dupCount } = await supabase
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("partido_id", partidoId)
      .eq("tipo", "gol")
      .eq("titulo", titulo)
      .gte("created_at", since);

    if (dupCount && dupCount > 0) return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("notificaciones")
    .insert(rows)
    .select("id, usuario_id, titulo, cuerpo, partido_id");

  if (insertError) {
    console.error(
      `[push] insert notificaciones (${tipo}, partido ${partidoId}):`,
      insertError.message,
    );
    return;
  }

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
