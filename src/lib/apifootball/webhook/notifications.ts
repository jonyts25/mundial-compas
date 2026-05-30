import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";

/** Encola notificaciones en BD para miembros con push_habilitado (sin worker de envío aún). */
export async function queuePartidoGoalNotifications(
  supabase: SupabaseClient,
  partidoId: string,
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
    tipo: "gol" as const,
    titulo,
    cuerpo,
    partido_id: partidoId,
    liga_id: LIGA_GLOBAL_ID,
    metadata,
  }));

  if (rows.length > 0) {
    await supabase.from("notificaciones").insert(rows);
  }
}
