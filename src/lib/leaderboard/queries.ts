import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  toRpcFilterArgs,
  type LeaderboardFilters,
} from "@/lib/leaderboard/filters";
import { createClient } from "@/lib/supabase/server";

async function assertLigaLeaderboardActiva(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ligaId: string,
): Promise<void> {
  if (ligaId === LIGA_GLOBAL_ID) return;

  const { data: liga } = await supabase
    .from("ligas_privadas")
    .select("activa, es_sistema")
    .eq("id", ligaId)
    .maybeSingle();

  if (!liga || liga.es_sistema || !liga.activa) {
    throw new Error("Este grupo ya no está activo");
  }
}

export interface LeaderboardRow {
  posicion: number;
  usuario_id: string;
  nombre_visible: string;
  avatar_url: string | null;
  quiniela_paga: boolean;
  puntos_totales: number;
  exactos: number;
  tendencias: number;
  joined_at: string;
}

export interface LeaderboardResult {
  filas: LeaderboardRow[];
  filters: LeaderboardFilters;
}

function mapRows(data: Record<string, unknown>[]): LeaderboardRow[] {
  return data.map((row) => ({
    posicion: Number(row.posicion),
    usuario_id: row.usuario_id as string,
    nombre_visible: row.nombre_visible as string,
    avatar_url: (row.avatar_url as string | null) ?? null,
    quiniela_paga: Boolean(row.quiniela_paga),
    puntos_totales: Number(row.puntos_totales),
    exactos: Number(row.exactos),
    tendencias: Number(row.tendencias),
    joined_at: row.joined_at as string,
  }));
}

/**
 * Tabla de liderato por liga. Sin `filters` = acumulado total (comportamiento original).
 */
export async function fetchLeaderboard(
  ligaId: string = LIGA_GLOBAL_ID,
  filters?: LeaderboardFilters,
): Promise<LeaderboardRow[]> {
  const result = await fetchLeaderboardWithFilters(ligaId, filters);
  return result.filas;
}

export async function fetchLeaderboardWithFilters(
  ligaId: string,
  filters?: LeaderboardFilters,
): Promise<LeaderboardResult> {
  const resolved: LeaderboardFilters = filters ?? { modoSegmento: "acumulado" };
  const supabase = await createClient();
  await assertLigaLeaderboardActiva(supabase, ligaId);
  const rpcArgs = toRpcFilterArgs(resolved);

  const { data, error } = await supabase.rpc("tabla_liderato_quiniela", {
    p_liga_id: ligaId,
    p_jornada: rpcArgs.p_jornada,
    p_fase: rpcArgs.p_fase,
    p_date_from: rpcArgs.p_date_from,
    p_date_to: rpcArgs.p_date_to,
  });

  if (error) {
    throw new Error(`No se pudo cargar el liderato: ${error.message}`);
  }

  return {
    filas: mapRows((data ?? []) as Record<string, unknown>[]),
    filters: resolved,
  };
}
