import { createClient } from "@/lib/supabase/server";

export interface PronosticoFusionPendiente {
  id: string;
  partidoId: string;
  ligaId: string;
  keptLocal: number;
  keptVisitante: number;
  discardedLocal: number;
  discardedVisitante: number;
  equipoLocalNombre: string;
  equipoVisitanteNombre: string;
  fechaKickoff: string;
}

export async function fetchPronosticoFusionPendientes(
  usuarioId: string,
  ligaId?: string,
): Promise<PronosticoFusionPendiente[]> {
  const supabase = await createClient();

  let query = supabase
    .from("pronostico_fusion_auditoria")
    .select(
      `
      id,
      partido_id,
      liga_id,
      kept_goles_local,
      kept_goles_visitante,
      discarded_goles_local,
      discarded_goles_visitante,
      partidos!inner (
        equipo_local_nombre,
        equipo_visitante_nombre,
        fecha_kickoff
      )
    `,
    )
    .eq("usuario_id", usuarioId)
    .eq("scores_equal", false)
    .in("estado", ["conflicto_pendiente", "notificado"]);

  if (ligaId) {
    query = query.eq("liga_id", ligaId);
  }

  const { data, error } = await query;

  if (error || !data?.length) return [];

  return data.map((row) => {
    const partidoRaw = row.partidos as unknown;
    const partido = (Array.isArray(partidoRaw) ? partidoRaw[0] : partidoRaw) as {
      equipo_local_nombre: string;
      equipo_visitante_nombre: string;
      fecha_kickoff: string;
    };
    return {
      id: row.id,
      partidoId: row.partido_id,
      ligaId: row.liga_id,
      keptLocal: row.kept_goles_local,
      keptVisitante: row.kept_goles_visitante,
      discardedLocal: row.discarded_goles_local,
      discardedVisitante: row.discarded_goles_visitante,
      equipoLocalNombre: partido.equipo_local_nombre,
      equipoVisitanteNombre: partido.equipo_visitante_nombre,
      fechaKickoff: partido.fecha_kickoff,
    };
  });
}
