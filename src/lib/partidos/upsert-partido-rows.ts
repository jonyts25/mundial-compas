import type { SupabaseClient } from "@supabase/supabase-js";
import { alignPartidoUpsertRowsToExistingMatches } from "@/lib/partidos/align-partido-upsert-rows";
import { mergePartidoUpsertRowsWithStoredMetadata } from "@/lib/partidos/merge-upsert-metadata";

type PartidoUpsertRow = {
  api_football_fixture_id: number;
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  metadata: Record<string, unknown>;
};

export async function upsertPartidoRows<T extends PartidoUpsertRow>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<{ upserted: number; batchErrors: string[] }> {
  const merged = await mergePartidoUpsertRowsWithStoredMetadata(supabase, rows);
  const aligned = await alignPartidoUpsertRowsToExistingMatches(supabase, merged);

  const batchErrors: string[] = [];
  let upserted = 0;
  const BATCH = 50;

  for (const update of aligned.updates) {
    const { id, ...patch } = update;
    const { error } = await supabase
      .from("partidos")
      .update(patch as Record<string, unknown>)
      .eq("id", id);
    if (error) {
      batchErrors.push(`update ${id}: ${error.message}`);
    } else {
      upserted += 1;
    }
  }

  for (let i = 0; i < aligned.inserts.length; i += BATCH) {
    const batch = aligned.inserts.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const { error } = await supabase.from("partidos").upsert(batch, {
      onConflict: "api_football_fixture_id",
      ignoreDuplicates: false,
    });
    if (error) {
      batchErrors.push(`Lote ${batchNum}: ${error.message}`);
    } else {
      upserted += batch.length;
    }
  }

  return { upserted, batchErrors };
}
