import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

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

export async function fetchLeaderboard(
  ligaId: string = LIGA_GLOBAL_ID,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("tabla_liderato_quiniela", {
    p_liga_id: ligaId,
  });

  if (error) {
    throw new Error(`No se pudo cargar el liderato: ${error.message}`);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
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
