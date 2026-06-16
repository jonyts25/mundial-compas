"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResolveFusionChoice = "kept" | "discarded";

export type ResolveFusionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resolvePronosticoFusionConflict(
  auditoriaId: string,
  choice: ResolveFusionChoice,
): Promise<ResolveFusionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión" };
  }

  const { data: audit, error: auditError } = await supabase
    .from("pronostico_fusion_auditoria")
    .select(
      "id, usuario_id, liga_id, partido_id, kept_goles_local, kept_goles_visitante, discarded_goles_local, discarded_goles_visitante, estado",
    )
    .eq("id", auditoriaId)
    .maybeSingle();

  if (auditError || !audit) {
    return { ok: false, error: "Conflicto no encontrado" };
  }

  if (audit.usuario_id !== user.id) {
    return { ok: false, error: "No autorizado" };
  }

  if (
    audit.estado === "resuelto_usuario" ||
    audit.estado === "resuelto_auto" ||
    audit.estado === "scores_iguales"
  ) {
    return { ok: true };
  }

  const golesLocal =
    choice === "kept" ? audit.kept_goles_local : audit.discarded_goles_local;
  const golesVisitante =
    choice === "kept"
      ? audit.kept_goles_visitante
      : audit.discarded_goles_visitante;

  const { error: pronosticoError } = await supabase
    .from("pronosticos")
    .update({
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      updated_at: new Date().toISOString(),
    })
    .eq("usuario_id", user.id)
    .eq("liga_id", audit.liga_id)
    .eq("partido_id", audit.partido_id);

  if (pronosticoError) {
    return { ok: false, error: pronosticoError.message };
  }

  const { error: resolveError } = await supabase
    .from("pronostico_fusion_auditoria")
    .update({
      estado: "resuelto_usuario",
      resuelto_at: new Date().toISOString(),
    })
    .eq("id", auditoriaId);

  if (resolveError) {
    return { ok: false, error: resolveError.message };
  }

  revalidatePath("/quiniela");
  revalidatePath("/");
  revalidatePath(`/partidos/${audit.partido_id}`);

  return { ok: true };
}
