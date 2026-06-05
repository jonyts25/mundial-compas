import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { filterPartidosPorTipo } from "@/lib/liga/partido-filters";
import {
  parseTipoQuinielaFromConfig,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";
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

export interface FetchQuinielaOptions {
  ligaId?: string;
  tipoQuiniela?: TipoQuiniela;
  jornada?: number | null;
  fase?: Partido["fase"] | null;
}

export async function fetchQuinielaData(
  userId: string,
  options: FetchQuinielaOptions = {},
): Promise<QuinielaPageData> {
  assertAuthenticatedUserId(userId);

  const ligaId = options.ligaId ?? LIGA_GLOBAL_ID;
  const supabase = createServerDataClient();

  let tipo = options.tipoQuiniela;
  if (!tipo && ligaId !== LIGA_GLOBAL_ID) {
    const { data: liga } = await supabase
      .from("ligas_privadas")
      .select("configuracion")
      .eq("id", ligaId)
      .maybeSingle();
    tipo = parseTipoQuinielaFromConfig(liga?.configuracion);
  }
  tipo ??= "mundial_completo";

  const { data: partidos, error: partidosError } = await supabase
    .from("partidos")
    .select(
      "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata",
    )
    .in("estatus", [
      "programado",
      "aplazado",
      "en_vivo",
      "medio_tiempo",
      "finalizado",
    ])
    .order("fecha_kickoff", { ascending: true });

  if (partidosError) {
    throw new Error(partidosError.message);
  }

  const partidosFiltrados = filterPartidosPorTipo(
    (partidos ?? []) as Partido[],
    { tipo, jornada: options.jornada, fase: options.fase },
  );

  const partidoIds = partidosFiltrados.map((p) => p.id);
  let pronosticosQuery = supabase
    .from("pronosticos")
    .select("id, partido_id, goles_local, goles_visitante, puntos")
    .eq("liga_id", ligaId)
    .eq("usuario_id", userId);

  if (partidoIds.length > 0) {
    pronosticosQuery = pronosticosQuery.in("partido_id", partidoIds);
  }

  const { data: pronosticos, error: pronosError } = await pronosticosQuery;

  if (pronosError) {
    throw new Error(pronosError.message);
  }

  const pronosticosPorPartido: Record<string, PronosticoUsuario> = {};
  for (const p of pronosticos ?? []) {
    pronosticosPorPartido[p.partido_id] = p as PronosticoUsuario;
  }

  return {
    partidos: partidosFiltrados,
    pronosticosPorPartido,
  };
}
