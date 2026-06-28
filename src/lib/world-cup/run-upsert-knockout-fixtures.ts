import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAllKnockoutFixtureRows,
  buildMissingKnockoutFixtureRows,
  validateKnockoutScheduleCounts,
} from "@/lib/world-cup/build-knockout-fixture-rows";
import { KNOCKOUT_SCHEDULE_BY_MATCH } from "@/lib/standings/world-cup-knockout-schedule";
import { knockoutMatchIdFromNumber } from "@/lib/world-cup/knockout-match-ids";
import { extractFifaMatchNumber } from "@/lib/standings/knockout-schedule-utils";
import { upsertPartidoRows } from "@/lib/partidos/upsert-partido-rows";
import { withSeasonIdRows } from "@/lib/partidos/with-season-id";
import type { Partido } from "@/types/database";

const PARTIDO_SELECT =
  "id, fase, grupo, jornada, sede, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante, canal_transmision, minuto_actual, metadata, api_football_fixture_id";

export interface UpsertKnockoutFixturesResult {
  dryRun: boolean;
  scheduleValid: ReturnType<typeof validateKnockoutScheduleCounts>;
  existingKnockout: number;
  toInsert: number;
  toUpdateMetadata: number;
  upserted: number;
  batchErrors: string[];
}

function readKnockoutMatchId(partido: Partido): string | null {
  const meta = partido.metadata as Record<string, unknown> | null;
  if (meta && typeof meta.knockout_match_id === "string") {
    return meta.knockout_match_id;
  }
  const matchNum = extractFifaMatchNumber(partido);
  return matchNum != null ? knockoutMatchIdFromNumber(matchNum) : null;
}

/** Enrich existing knockout rows missing metadata slots (no team/score changes). */
async function patchMissingMetadata(
  supabase: SupabaseClient,
  existing: Partido[],
  dryRun: boolean,
): Promise<number> {
  let patched = 0;

  for (const partido of existing) {
    const matchNum = extractFifaMatchNumber(partido);
    if (matchNum == null) continue;

    const meta =
      typeof partido.metadata === "object" && partido.metadata !== null
        ? (partido.metadata as Record<string, unknown>)
        : {};

    if (meta.knockout_match_id && meta.home_slot && meta.away_slot) continue;

    const scheduleEntry = KNOCKOUT_SCHEDULE_BY_MATCH[matchNum];
    const catalog = buildAllKnockoutFixtureRows().find(
      (r) => (r.metadata.fifa_match_number as number) === matchNum,
    );
    if (!scheduleEntry || !catalog) continue;

    const fullMeta = catalog.metadata;

    if (dryRun) {
      patched += 1;
      continue;
    }

    const { error } = await supabase
      .from("partidos")
      .update({ metadata: { ...meta, ...fullMeta } })
      .eq("id", partido.id);

    if (!error) patched += 1;
  }

  return patched;
}

export async function runUpsertKnockoutFixtures(
  supabase: SupabaseClient,
  options: { dryRun?: boolean } = {},
): Promise<UpsertKnockoutFixturesResult> {
  const dryRun = options.dryRun ?? false;
  const scheduleValid = validateKnockoutScheduleCounts();

  const { data: existingRaw, error } = await supabase
    .from("partidos")
    .select(PARTIDO_SELECT)
    .neq("fase", "grupos");

  if (error) throw new Error(error.message);

  const existing = (existingRaw ?? []) as Partido[];
  const missingRows = buildMissingKnockoutFixtureRows(existing);

  let upserted = 0;
  const batchErrors: string[] = [];

  if (!dryRun && missingRows.length > 0) {
    const result = await upsertPartidoRows(
      supabase,
      withSeasonIdRows(missingRows),
    );
    upserted = result.upserted;
    batchErrors.push(...result.batchErrors);
  }

  const toUpdateMetadata = await patchMissingMetadata(
    supabase,
    existing,
    dryRun,
  );

  return {
    dryRun,
    scheduleValid,
    existingKnockout: existing.length,
    toInsert: missingRows.length,
    toUpdateMetadata,
    upserted: dryRun ? 0 : upserted,
    batchErrors,
  };
}

export { readKnockoutMatchId };
