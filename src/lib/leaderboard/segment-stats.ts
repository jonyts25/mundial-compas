import { toRpcFilterArgs, type LeaderboardFilters } from "@/lib/leaderboard/filters";
import { createServerDataClient } from "@/lib/supabase/server-data";

export interface LeaderboardSegmentStats {
  partidosEnSegmento: number;
  partidosFinalizados: number;
  pronosticosEnSegmento: number;
}

export async function fetchLeaderboardSegmentStats(
  ligaId: string,
  filters: LeaderboardFilters,
): Promise<LeaderboardSegmentStats> {
  const supabase = createServerDataClient();
  const rpcArgs = toRpcFilterArgs(filters);

  let query = supabase
    .from("partidos")
    .select("id, estatus, marcador_local, marcador_visitante");

  if (rpcArgs.p_jornada != null) {
    query = query.eq("jornada", rpcArgs.p_jornada);
  }
  if (rpcArgs.p_fase) {
    query = query.eq("fase", rpcArgs.p_fase);
  }
  if (rpcArgs.p_date_from) {
    query = query.gte("fecha_kickoff", rpcArgs.p_date_from);
  }
  if (rpcArgs.p_date_to) {
    query = query.lte("fecha_kickoff", rpcArgs.p_date_to);
  }

  const { data: partidos, error } = await query;
  if (error) throw new Error(error.message);

  const rows = partidos ?? [];
  const partidosFinalizados = rows.filter(
    (p) =>
      p.estatus === "finalizado" &&
      p.marcador_local != null &&
      p.marcador_visitante != null,
  ).length;

  const partidoIds = rows.map((p) => p.id as string);
  let pronosticosEnSegmento = 0;
  if (partidoIds.length > 0) {
    const { count } = await supabase
      .from("pronosticos")
      .select("id", { count: "exact", head: true })
      .eq("liga_id", ligaId)
      .in("partido_id", partidoIds);
    pronosticosEnSegmento = count ?? 0;
  }

  return {
    partidosEnSegmento: rows.length,
    partidosFinalizados,
    pronosticosEnSegmento,
  };
}
