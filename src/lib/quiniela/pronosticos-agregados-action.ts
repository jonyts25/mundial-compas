"use server";

import { LIGA_GLOBAL_ID } from "@/lib/constants";
import type { PickInput } from "@/lib/insights/pick-aggregates";
import { assertUsuarioEsMiembro } from "@/lib/liga/grupos-queries";
import { createClient } from "@/lib/supabase/server";

export type FetchPronosticosAgregadosResult =
  | { ok: true; picks: PickInput[]; total: number }
  | { ok: false; error: string };

/**
 * Conteos pre-lock de pronósticos para El Pitoniso (PI-2).
 *
 * Privacidad: solo devuelve marcadores. Sin usuario_id, sin nombres, sin join a usuarios.
 */
export async function fetchPronosticosPartidoAgregados(
  partidoId: string,
  ligaId: string = LIGA_GLOBAL_ID,
): Promise<FetchPronosticosAgregadosResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión" };
  }

  if (ligaId !== LIGA_GLOBAL_ID) {
    const esMiembro = await assertUsuarioEsMiembro(user.id, ligaId);
    if (!esMiembro) {
      return { ok: false, error: "No eres miembro de este grupo" };
    }
  }

  const { data: partido, error: partidoError } = await supabase
    .from("partidos")
    .select("estatus")
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) {
    return { ok: false, error: "Partido no encontrado" };
  }

  if (partido.estatus !== "programado") {
    return {
      ok: false,
      error: "Disponible solo antes del partido (estatus programado)",
    };
  }

  const { data: rows, error } = await supabase
    .from("pronosticos")
    .select("goles_local, goles_visitante")
    .eq("liga_id", ligaId)
    .eq("partido_id", partidoId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const picks: PickInput[] = (rows ?? []).map((row) => ({
    golesLocal: row.goles_local as number,
    golesVisitante: row.goles_visitante as number,
  }));

  return { ok: true, picks, total: picks.length };
}
