import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { tryClaimLiveEvent } from "@/lib/api-football/push/claim-event";
import type { PartidoPushTipo } from "@/lib/api-football/push/types";
import { dispatchPushForNotifications } from "@/lib/push/send";

export type { PartidoPushTipo } from "@/lib/api-football/push/types";

/** Encola notificaciones y las envía por Web Push si hay suscripción activa. */
export async function queuePartidoPushNotifications(
  supabase: SupabaseClient,
  partidoId: string,
  tipo: PartidoPushTipo,
  titulo: string,
  cuerpo: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const eventKey =
    typeof metadata.event_key === "string" && metadata.event_key.trim()
      ? metadata.event_key.trim()
      : `${tipo}:${titulo}`;

  if (metadata.skip_claim !== true) {
    if (
      !(await tryClaimLiveEvent(supabase, partidoId, eventKey, `push:${tipo}`))
    ) {
      return;
    }
  }

  const metaWithKey = { ...metadata, event_key: eventKey };

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
    metadata: metaWithKey,
  }));

  if (rows.length === 0) return;

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
