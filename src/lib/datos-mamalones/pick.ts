import type { SupabaseClient } from "@supabase/supabase-js";

export interface DatoMamalonPick {
  id: string;
  titulo: string;
  contenido: string;
}

const RECENT_IDS_LIMIT = 12;

/** Evita repetir los mismos datos mamalones en el chat. */
export async function pickDatoMamalonVariado(
  admin: SupabaseClient,
  options?: { ligaId?: string; partidoId?: string | null },
): Promise<DatoMamalonPick | null> {
  const { data: candidatos, error } = await admin
    .from("datos_mamalones")
    .select("id, titulo, contenido")
    .eq("activo", true)
    .order("prioridad", { ascending: false })
    .limit(50);

  if (error || !candidatos?.length) return null;

  let recentQuery = admin
    .from("mensajes_chat")
    .select("*")
    .eq("tipo", "dato_mamalón")
    .order("created_at", { ascending: false })
    .limit(RECENT_IDS_LIMIT);

  if (options?.ligaId) {
    recentQuery = recentQuery.eq("liga_id", options.ligaId);
  }
  if (options?.partidoId === null) {
    recentQuery = recentQuery.is("partido_id", null);
  } else if (options?.partidoId) {
    recentQuery = recentQuery.eq("partido_id", options.partidoId);
  }

  const { data: recientes } = await recentQuery;
  const usados = new Set(
    (recientes ?? [])
      .map((r) => {
        const row = r as { dato_mamalón_id?: string | null };
        return row.dato_mamalón_id ?? null;
      })
      .filter((id): id is string => Boolean(id)),
  );

  const pool = candidatos.filter((d) => !usados.has(d.id));
  const lista = pool.length > 0 ? pool : candidatos;

  const index = Math.floor(Math.random() * lista.length);
  const pick = lista[index]!;

  return {
    id: pick.id,
    titulo: pick.titulo as string,
    contenido: pick.contenido as string,
  };
}

export function formatVarDatoMamalonMessage(pick: DatoMamalonPick): string {
  return `🤖 VAR · ${pick.titulo}: ${pick.contenido}`;
}
