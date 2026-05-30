import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { toMexicoDateKey } from "@/lib/datetime/mexico";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";
import type { Partido } from "@/types/database";

const PARTIDO_SELECT =
  "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata";

export interface CalendarioPartidosData {
  partidos: Partido[];
  /** partido_id → true si el usuario ya tiene pronóstico en la liga global */
  pronosticosGuardados: Record<string, boolean>;
  /** Días con al menos un partido (YYYY-MM-DD en CDMX), ordenados */
  diasConPartidos: string[];
}

/**
 * Carga calendario en servidor con service role (evita RLS recursivo en liga_miembros).
 * Siempre invocar con userId de auth.getUser() — nunca desde el cliente.
 */
export async function fetchCalendarioPartidosData(
  userId: string,
): Promise<CalendarioPartidosData> {
  assertAuthenticatedUserId(userId);

  const supabase = createServerDataClient();

  const { data: partidos, error: partidosError } = await supabase
    .from("partidos")
    .select(PARTIDO_SELECT)
    .order("fecha_kickoff", { ascending: true });

  if (partidosError) {
    throw new Error(partidosError.message);
  }

  const { data: pronosticos, error: pronosError } = await supabase
    .from("pronosticos")
    .select("partido_id")
    .eq("liga_id", LIGA_GLOBAL_ID)
    .eq("usuario_id", userId);

  if (pronosError) {
    throw new Error(pronosError.message);
  }

  const pronosticosGuardados: Record<string, boolean> = {};
  for (const p of pronosticos ?? []) {
    pronosticosGuardados[p.partido_id] = true;
  }

  const diaSet = new Set<string>();
  for (const p of partidos ?? []) {
    diaSet.add(toMexicoDateKey(p.fecha_kickoff));
  }
  const diasConPartidos = Array.from(diaSet).sort();

  return {
    partidos: (partidos ?? []) as Partido[],
    pronosticosGuardados,
    diasConPartidos,
  };
}
