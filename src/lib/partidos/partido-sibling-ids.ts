import type { SupabaseClient } from "@supabase/supabase-js";
import {
  arePartidosDisplaySiblings,
  type PartidoMatchKeyFields,
} from "@/lib/partidos/partido-match-key";

const SIBLING_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const SIBLING_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

const PARTIDO_SIBLING_SELECT =
  "id, fecha_kickoff, equipo_local_nombre, equipo_visitante_nombre, fase, metadata, api_football_fixture_id, estatus, marcador_local, marcador_visitante";

/** IDs de filas duplicadas del mismo encuentro (placeholder, api-sports, kickoff distinto). */
export async function fetchSiblingPartidoIds(
  supabase: SupabaseClient,
  partido: PartidoMatchKeyFields,
): Promise<string[]> {
  const ids = new Set<string>([partido.id]);

  if (!partido.fase || partido.fase === "grupos") {
    return [...ids];
  }

  const kickoffMs = new Date(partido.fecha_kickoff).getTime();
  const fromIso = new Date(kickoffMs - SIBLING_LOOKBACK_MS).toISOString();
  const toIso = new Date(kickoffMs + SIBLING_LOOKAHEAD_MS).toISOString();

  const { data: candidates, error } = await supabase
    .from("partidos")
    .select(PARTIDO_SIBLING_SELECT)
    .neq("fase", "grupos")
    .gte("fecha_kickoff", fromIso)
    .lte("fecha_kickoff", toIso);

  if (error) throw new Error(error.message);

  for (const row of candidates ?? []) {
    if (row.id === partido.id) continue;
    if (arePartidosDisplaySiblings(partido, row as PartidoMatchKeyFields)) {
      ids.add(row.id as string);
    }
  }

  return [...ids];
}
