import { knockoutKickoffIso } from "@/lib/standings/world-cup-knockout-kickoffs";
import type { PartidoUpsertRow } from "@/lib/api-football/map-fixture-row";
import {
  buildKnockoutAdvancementMap,
  faseFromKnockoutPhase,
  knockoutMatchIdForEntry,
  loserNextMatchId,
  placeholderFixtureId,
  serializeKnockoutFeedSlot,
  winnerNextMatchId,
} from "@/lib/world-cup/knockout-match-ids";
import { indexKnockoutPartidosByMatchNumber } from "@/lib/standings/knockout-schedule-utils";
import { WORLD_CUP_KNOCKOUT_SCHEDULE } from "@/lib/standings/world-cup-knockout-schedule";
import type { Partido } from "@/types/database";

const TBD_CODE = "TBD";
const TBD2_CODE = "TBD2";

export function buildKnockoutFixtureRowMetadata(
  entry: (typeof WORLD_CUP_KNOCKOUT_SCHEDULE)[number],
): Record<string, unknown> {
  const knockoutMatchId = knockoutMatchIdForEntry(entry);
  return {
    placeholder: true,
    fifa_match_number: entry.matchNumber,
    knockout_round: entry.phase,
    knockout_match_id: knockoutMatchId,
    home_slot: serializeKnockoutFeedSlot(entry.home),
    away_slot: serializeKnockoutFeedSlot(entry.away),
    next_match_id: winnerNextMatchId(entry.matchNumber),
    loser_next_match_id: loserNextMatchId(entry.matchNumber),
    source: "world-cup-knockout-schedule",
    schedule_source: "fifa_2026",
    knockout_phase: entry.phase,
  };
}

export function buildKnockoutFixtureUpsertRow(
  entry: (typeof WORLD_CUP_KNOCKOUT_SCHEDULE)[number],
): PartidoUpsertRow {
  const knockoutMatchId = knockoutMatchIdForEntry(entry);
  return {
    api_football_fixture_id: placeholderFixtureId(entry.matchNumber),
    fase: faseFromKnockoutPhase(entry.phase),
    grupo: null,
    jornada: null,
    equipo_local_codigo: TBD_CODE,
    equipo_visitante_codigo: TBD2_CODE,
    equipo_local_nombre: `Equipo por definir (${knockoutMatchId}-L)`,
    equipo_visitante_nombre: `Equipo por definir (${knockoutMatchId}-V)`,
    sede: entry.venue,
    fecha_kickoff: knockoutKickoffIso(entry.matchNumber, entry.date),
    estatus: "programado",
    marcador_local: null,
    marcador_visitante: null,
    canal_transmision: "sin_asignar",
    minuto_actual: null,
    metadata: buildKnockoutFixtureRowMetadata(entry),
  };
}

/** All 32 knockout rows; skips match numbers already indexed in BD. */
export function buildMissingKnockoutFixtureRows(
  existingKnockout: Partido[],
): PartidoUpsertRow[] {
  const indexed = indexKnockoutPartidosByMatchNumber(existingKnockout);
  return WORLD_CUP_KNOCKOUT_SCHEDULE.filter(
    (entry) => !indexed.has(entry.matchNumber),
  ).map(buildKnockoutFixtureUpsertRow);
}

/** Full catalog of 32 rows (for validation / dry-run). */
export function buildAllKnockoutFixtureRows(): PartidoUpsertRow[] {
  return WORLD_CUP_KNOCKOUT_SCHEDULE.map(buildKnockoutFixtureUpsertRow);
}

export function countKnockoutScheduleByPhase(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of WORLD_CUP_KNOCKOUT_SCHEDULE) {
    counts[entry.phase] = (counts[entry.phase] ?? 0) + 1;
  }
  return counts;
}

/** Validates schedule totals (16+8+4+2+1+1 = 32). */
export function validateKnockoutScheduleCounts(): {
  ok: boolean;
  total: number;
  byPhase: Record<string, number>;
} {
  const byPhase = countKnockoutScheduleByPhase();
  const total = Object.values(byPhase).reduce((a, b) => a + b, 0);
  const ok =
    total === 32 &&
    byPhase.r32 === 16 &&
    byPhase.r16 === 8 &&
    byPhase.qf === 4 &&
    byPhase.sf === 2 &&
    byPhase.third === 1 &&
    byPhase.final === 1;
  return { ok, total, byPhase };
}

export { buildKnockoutAdvancementMap };
