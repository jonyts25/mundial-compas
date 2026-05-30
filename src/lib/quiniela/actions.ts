"use server";

import { revalidatePath } from "next/cache";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { fetchCompetenciaLiga } from "@/lib/liga/competencia-queries";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import { createClient } from "@/lib/supabase/server";

export type SavePronosticoResult =
  | { ok: true }
  | { ok: false; error: string };

export async function savePronostico(
  partidoId: string,
  golesLocal: number,
  golesVisitante: number,
): Promise<SavePronosticoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión" };
  }

  const competencia = await fetchCompetenciaLiga().catch(() => ({
    estado: "activa" as const,
  }));
  if (competencia.estado !== "activa") {
    return { ok: false, error: "La competencia ya finalizó" };
  }

  if (
    !Number.isInteger(golesLocal) ||
    !Number.isInteger(golesVisitante) ||
    golesLocal < 0 ||
    golesVisitante < 0 ||
    golesLocal > 20 ||
    golesVisitante > 20
  ) {
    return { ok: false, error: "Marcador inválido (0–20)" };
  }

  const { data: partido, error: partidoError } = await supabase
    .from("partidos")
    .select("fecha_kickoff, estatus")
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) {
    return { ok: false, error: "Partido no encontrado" };
  }

  if (partido.estatus !== "programado" && partido.estatus !== "aplazado") {
    return { ok: false, error: "Este partido ya no acepta pronósticos" };
  }

  if (isPronosticoLocked(partido.fecha_kickoff, Date.now())) {
    return {
      ok: false,
      error: "La quiniela ya está cerrada para este partido (5 min antes del pitazo)",
    };
  }

  const { data: existente } = await supabase
    .from("pronosticos")
    .select("id")
    .eq("liga_id", LIGA_GLOBAL_ID)
    .eq("usuario_id", user.id)
    .eq("partido_id", partidoId)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("pronosticos")
      .update({
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("pronosticos").insert({
      liga_id: LIGA_GLOBAL_ID,
      usuario_id: user.id,
      partido_id: partidoId,
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/quiniela");
  revalidatePath("/");

  return { ok: true };
}
