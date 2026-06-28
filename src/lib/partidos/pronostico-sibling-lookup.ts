import type { SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { buildPartidoMatchKey } from "@/lib/partidos/partido-match-key";

type PartidoKeyFields = {
  id: string;
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
};

type PronosticoRow = {
  id: string;
  goles_local: number;
  goles_visitante: number;
  puntos: number;
};

/** Busca pronóstico en fila duplicada del mismo encuentro (placeholder vs api-sports). */
export async function fetchPronosticoForPartidoOrSibling(
  supabase: SupabaseClient,
  userId: string,
  ligaId: string,
  partido: PartidoKeyFields,
): Promise<PronosticoRow | null> {
  const { data: direct, error: directError } = await supabase
    .from("pronosticos")
    .select("id, goles_local, goles_visitante, puntos")
    .eq("liga_id", ligaId)
    .eq("usuario_id", userId)
    .eq("partido_id", partido.id)
    .maybeSingle();

  if (directError) throw new Error(directError.message);
  if (direct) return direct as PronosticoRow;

  const kickoffMs = new Date(partido.fecha_kickoff).getTime();
  const fromIso = new Date(kickoffMs - 3 * 60 * 60 * 1000).toISOString();
  const toIso = new Date(kickoffMs + 3 * 60 * 60 * 1000).toISOString();
  const matchKey = buildPartidoMatchKey(partido);

  const { data: siblings, error: siblingsError } = await supabase
    .from("partidos")
    .select("id, fecha_kickoff, equipo_local_nombre, equipo_visitante_nombre")
    .gte("fecha_kickoff", fromIso)
    .lte("fecha_kickoff", toIso);

  if (siblingsError) throw new Error(siblingsError.message);

  const siblingIds = (siblings ?? [])
    .filter(
      (row) =>
        row.id !== partido.id && buildPartidoMatchKey(row as PartidoKeyFields) === matchKey,
    )
    .map((row) => row.id as string);

  if (siblingIds.length === 0) return null;

  const { data: siblingPronostico, error: pronError } = await supabase
    .from("pronosticos")
    .select("id, goles_local, goles_visitante, puntos")
    .eq("liga_id", ligaId)
    .eq("usuario_id", userId)
    .in("partido_id", siblingIds)
    .limit(1)
    .maybeSingle();

  if (pronError) throw new Error(pronError.message);
  return (siblingPronostico as PronosticoRow | null) ?? null;
}

export async function fetchGlobalPronosticoForPartidoOrSibling(
  supabase: SupabaseClient,
  userId: string,
  partido: PartidoKeyFields,
): Promise<PronosticoRow | null> {
  return fetchPronosticoForPartidoOrSibling(
    supabase,
    userId,
    LIGA_GLOBAL_ID,
    partido,
  );
}
