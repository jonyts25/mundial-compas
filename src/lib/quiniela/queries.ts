import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";
import type { Partido } from "@/types/database";

export interface PronosticoUsuario {
  id: string;
  partido_id: string;
  goles_local: number;
  goles_visitante: number;
  puntos: number;
}

export interface QuinielaPageData {
  partidos: Partido[];
  pronosticosPorPartido: Record<string, PronosticoUsuario>;
}

export async function fetchQuinielaData(userId: string): Promise<QuinielaPageData> {
  assertAuthenticatedUserId(userId);

  const supabase = createServerDataClient();

  const { data: partidos, error: partidosError } = await supabase
    .from("partidos")
    .select(
      "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual",
    )
    .in("estatus", ["programado", "aplazado", "en_vivo", "medio_tiempo"])
    .order("fecha_kickoff", { ascending: true });

  if (partidosError) {
    throw new Error(partidosError.message);
  }

  const { data: pronosticos, error: pronosError } = await supabase
    .from("pronosticos")
    .select("id, partido_id, goles_local, goles_visitante, puntos")
    .eq("liga_id", LIGA_GLOBAL_ID)
    .eq("usuario_id", userId);

  if (pronosError) {
    throw new Error(pronosError.message);
  }

  const pronosticosPorPartido: Record<string, PronosticoUsuario> = {};
  for (const p of pronosticos ?? []) {
    pronosticosPorPartido[p.partido_id] = p as PronosticoUsuario;
  }

  return {
    partidos: (partidos ?? []) as Partido[],
    pronosticosPorPartido,
  };
}
