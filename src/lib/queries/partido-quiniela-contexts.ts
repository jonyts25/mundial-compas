/**
 * Contextos de quiniela para detalle de partido (MATCH-MULTI-QUINIELA-1).
 * Solo pronósticos del usuario autenticado — sin PII ni picks ajenos.
 */

import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";

export type QuinielaContext = {
  ligaId: string;
  ligaNombre: string;
  ligaScope: "global" | "grupo";
  grupoSlug?: string;
  pronostico?: {
    golesLocal: number;
    golesVisitante: number;
  } | null;
};

function mapPronostico(
  row: { goles_local: number; goles_visitante: number } | undefined,
): QuinielaContext["pronostico"] {
  if (!row) return null;
  return {
    golesLocal: row.goles_local,
    golesVisitante: row.goles_visitante,
  };
}

export async function fetchPartidoQuinielaContexts(
  partidoId: string,
  userId: string,
): Promise<QuinielaContext[]> {
  assertAuthenticatedUserId(userId);

  const supabase = createServerDataClient();

  const [{ data: globalLiga }, { data: membresias, error: memError }] =
    await Promise.all([
      supabase
        .from("ligas_privadas")
        .select("id, nombre, slug")
        .eq("id", LIGA_GLOBAL_ID)
        .single(),
      supabase.from("liga_miembros").select("liga_id").eq("usuario_id", userId),
    ]);

  if (memError) {
    throw new Error(memError.message);
  }

  const memberLigaIds = new Set(
    (membresias ?? []).map((m) => m.liga_id as string),
  );

  const privateIds = [...memberLigaIds].filter((id) => id !== LIGA_GLOBAL_ID);

  let privateLigas: Array<{ id: string; nombre: string; slug: string }> = [];
  if (privateIds.length > 0) {
    const { data, error } = await supabase
      .from("ligas_privadas")
      .select("id, nombre, slug")
      .in("id", privateIds)
      .eq("activa", true)
      .eq("es_sistema", false)
      .order("nombre", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    privateLigas = (data ?? []) as Array<{ id: string; nombre: string; slug: string }>;
  }

  const allLigaIds = [LIGA_GLOBAL_ID, ...privateLigas.map((l) => l.id)];

  const { data: pronosticos, error: pronosError } = await supabase
    .from("pronosticos")
    .select("liga_id, goles_local, goles_visitante")
    .eq("usuario_id", userId)
    .eq("partido_id", partidoId)
    .in("liga_id", allLigaIds);

  if (pronosError) {
    throw new Error(pronosError.message);
  }

  const pronosByLiga = new Map<string, { goles_local: number; goles_visitante: number }>();
  for (const row of pronosticos ?? []) {
    pronosByLiga.set(row.liga_id as string, {
      goles_local: row.goles_local as number,
      goles_visitante: row.goles_visitante as number,
    });
  }

  const contexts: QuinielaContext[] = [
    {
      ligaId: LIGA_GLOBAL_ID,
      ligaNombre: globalLiga?.nombre ?? "Mundial Compas",
      ligaScope: "global",
      pronostico: mapPronostico(pronosByLiga.get(LIGA_GLOBAL_ID)),
    },
    ...privateLigas.map((liga) => ({
      ligaId: liga.id,
      ligaNombre: liga.nombre,
      ligaScope: "grupo" as const,
      grupoSlug: liga.slug,
      pronostico: mapPronostico(pronosByLiga.get(liga.id)),
    })),
  ];

  return contexts;
}
