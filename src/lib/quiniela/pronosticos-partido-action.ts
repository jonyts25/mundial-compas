"use server";

import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { assertUsuarioEsMiembro } from "@/lib/liga/grupos-queries";
import { enrichPronosticoPuntosFromPartido } from "@/lib/partidos/partido-match-key";
import { fetchSiblingPartidoIds } from "@/lib/partidos/partido-sibling-ids";
import { createClient } from "@/lib/supabase/server";
import { createServerDataClient } from "@/lib/supabase/server-data";

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

function mergeParticipantesPorUsuario(
  participantes: PronosticoParticipante[],
): PronosticoParticipante[] {
  const byUser = new Map<string, PronosticoParticipante>();

  for (const row of participantes) {
    const existing = byUser.get(row.usuarioId);
    if (
      !existing ||
      row.puntos > existing.puntos ||
      (row.puntos === existing.puntos &&
        row.golesLocal + row.golesVisitante >
          existing.golesLocal + existing.golesVisitante)
    ) {
      byUser.set(row.usuarioId, row);
    }
  }

  return [...byUser.values()].sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (a.golesLocal !== b.golesLocal) return a.golesLocal - b.golesLocal;
    return a.golesVisitante - b.golesVisitante;
  });
}

export async function fetchPronosticosPartidoTodos(
  partidoId: string,
  ligaId: string = LIGA_GLOBAL_ID,
): Promise<FetchPronosticosPartidoResult> {
  const supabase = await createClient();
  const admin = createServerDataClient();
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

  const { data: partido, error: partidoError } = await admin
    .from("partidos")
    .select(
      "id, fase, fecha_kickoff, equipo_local_nombre, equipo_visitante_nombre, metadata, api_football_fixture_id, estatus, marcador_local, marcador_visitante",
    )
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) {
    return { ok: false, error: "Partido no encontrado" };
  }

  if (partido.estatus !== "finalizado") {
    return { ok: false, error: "Disponible cuando el partido haya terminado" };
  }

  const siblingIds = await fetchSiblingPartidoIds(admin, partido);

  const { data: rows, error } = await supabase
    .from("pronosticos")
    .select(
      "usuario_id, goles_local, goles_visitante, puntos, usuarios!inner(nombre_visible)",
    )
    .eq("liga_id", ligaId)
    .in("partido_id", siblingIds)
    .order("puntos", { ascending: false })
    .order("goles_local", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const participantes = mergeParticipantesPorUsuario(
    (rows ?? []).map((row) => {
      const usuario = row.usuarios as
        | { nombre_visible: string }
        | { nombre_visible: string }[];
      const nombre = Array.isArray(usuario)
        ? usuario[0]?.nombre_visible
        : usuario?.nombre_visible;
      const enriched = enrichPronosticoPuntosFromPartido(partido, {
        goles_local: row.goles_local as number,
        goles_visitante: row.goles_visitante as number,
        puntos: row.puntos as number,
      });
      return {
        usuarioId: row.usuario_id as string,
        nombreVisible: nombre ?? "Compa",
        golesLocal: enriched.goles_local,
        golesVisitante: enriched.goles_visitante,
        puntos: enriched.puntos,
        esYo: row.usuario_id === user.id,
      };
    }),
  );

  const resultadoReal =
    partido.marcador_local != null && partido.marcador_visitante != null
      ? {
          local: partido.marcador_local,
          visitante: partido.marcador_visitante,
        }
      : null;

  return { ok: true, participantes, resultadoReal };
}
