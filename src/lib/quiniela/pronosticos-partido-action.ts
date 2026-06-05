"use server";

import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { assertUsuarioEsMiembro } from "@/lib/liga/grupos-queries";
import { createClient } from "@/lib/supabase/server";

export interface PronosticoParticipante {
  usuarioId: string;
  nombreVisible: string;
  golesLocal: number;
  golesVisitante: number;
  puntos: number;
  esYo: boolean;
}

export type FetchPronosticosPartidoResult =
  | {
      ok: true;
      participantes: PronosticoParticipante[];
      resultadoReal: { local: number; visitante: number } | null;
    }
  | { ok: false; error: string };

export async function fetchPronosticosPartidoTodos(
  partidoId: string,
  ligaId: string = LIGA_GLOBAL_ID,
): Promise<FetchPronosticosPartidoResult> {
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
    .select("estatus, marcador_local, marcador_visitante")
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) {
    return { ok: false, error: "Partido no encontrado" };
  }

  if (partido.estatus !== "finalizado") {
    return { ok: false, error: "Disponible cuando el partido haya terminado" };
  }

  const { data: rows, error } = await supabase
    .from("pronosticos")
    .select(
      "usuario_id, goles_local, goles_visitante, puntos, usuarios!inner(nombre_visible)",
    )
    .eq("liga_id", ligaId)
    .eq("partido_id", partidoId)
    .order("puntos", { ascending: false })
    .order("goles_local", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const participantes: PronosticoParticipante[] = (rows ?? []).map((row) => {
    const usuario = row.usuarios as { nombre_visible: string } | { nombre_visible: string }[];
    const nombre =
      Array.isArray(usuario) ? usuario[0]?.nombre_visible : usuario?.nombre_visible;
    return {
      usuarioId: row.usuario_id as string,
      nombreVisible: nombre ?? "Compa",
      golesLocal: row.goles_local as number,
      golesVisitante: row.goles_visitante as number,
      puntos: row.puntos as number,
      esYo: row.usuario_id === user.id,
    };
  });

  const resultadoReal =
    partido.marcador_local != null && partido.marcador_visitante != null
      ? {
          local: partido.marcador_local,
          visitante: partido.marcador_visitante,
        }
      : null;

  return { ok: true, participantes, resultadoReal };
}
