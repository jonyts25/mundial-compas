import type { SupabaseClient } from "@supabase/supabase-js";
import { alignPartidoUpsertRowsToExistingMatches } from "@/lib/partidos/align-partido-upsert-rows";
import { mergePartidoCatalogUpdate } from "@/lib/partidos/merge-partido-update";
import { mergePartidoUpsertRowsWithStoredMetadata } from "@/lib/partidos/merge-upsert-metadata";
import {
  fetchWorldCupGroupLookup,
  parseJornadaFromRound,
  resolveGrupoFromTeams,
} from "@/lib/partidos/world-cup-group-lookup";
import { withSeasonId } from "@/lib/partidos/with-season-id";
import { getApiSportsEnv } from "@/lib/env";

type PartidoUpsertRow = {
  api_football_fixture_id: number;
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  metadata: Record<string, unknown>;
  fase?: string;
  grupo?: string | null;
  jornada?: number | null;
  season_id?: string | null;
};

export async function upsertPartidoRows<T extends PartidoUpsertRow>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<{ upserted: number; batchErrors: string[] }> {
  const merged = await mergePartidoUpsertRowsWithStoredMetadata(supabase, rows);
  const aligned = await alignPartidoUpsertRowsToExistingMatches(supabase, merged);

  let groupLookup: Awaited<ReturnType<typeof fetchWorldCupGroupLookup>> | null = null;
  try {
    const { apiKey } = getApiSportsEnv();
    groupLookup = await fetchWorldCupGroupLookup(apiKey);
  } catch {
    groupLookup = null;
  }

  const enrichRow = (row: T): T => {
    if (!groupLookup || row.fase !== "grupos") return row;
    const round =
      typeof row.metadata?.api_football === "object" &&
      row.metadata.api_football !== null
        ? (row.metadata.api_football as Record<string, unknown>).round
        : null;
    const grupo =
      row.grupo ??
      resolveGrupoFromTeams(
        groupLookup,
        row.equipo_local_nombre,
        row.equipo_visitante_nombre,
      );
    const jornada =
      row.jornada ??
      parseJornadaFromRound(typeof round === "string" ? round : null);
    return withSeasonId({ ...row, grupo, jornada });
  };

  const batchErrors: string[] = [];
  let upserted = 0;
  const BATCH = 50;

  const updateIds = aligned.updates.map((u) => u.id);
  const existingById = new Map<string, Record<string, unknown>>();

  if (updateIds.length > 0) {
    const { data: existingRows } = await supabase
      .from("partidos")
      .select(
        "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, canal_transmision, sede, metadata, marcador_local, marcador_visitante, estatus, minuto_actual",
      )
      .in("id", updateIds);
    for (const row of existingRows ?? []) {
      existingById.set(row.id as string, row as Record<string, unknown>);
    }
  }

  for (const update of aligned.updates) {
    const enriched = enrichRow(update);
    const { id, ...incoming } = enriched as T & { id: string };
    const existing = existingById.get(id) ?? {};
    const patch = mergePartidoCatalogUpdate(
      existing as Parameters<typeof mergePartidoCatalogUpdate>[0],
      incoming as Parameters<typeof mergePartidoCatalogUpdate>[1],
    );
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
    const batch = aligned.inserts.slice(i, i + BATCH).map(enrichRow);
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
