import { buildKickoffIsoFromApi } from "@/lib/datetime/kickoff";
import type { PartidoUpsertRow } from "@/lib/api-football/map-fixture-row";
import { indexKnockoutPartidosByMatchNumber } from "@/lib/standings/knockout-schedule-utils";
import {
  WORLD_CUP_KNOCKOUT_SCHEDULE,
  type KnockoutPhaseId,
} from "@/lib/standings/world-cup-knockout-schedule";
import type { FaseMundial, Partido } from "@/types/database";

/** IDs sintéticos para placeholders (no colisionan con API-Sports). */
const PLACEHOLDER_FIXTURE_BASE = 9_000_000;

const PHASE_TO_FASE: Record<KnockoutPhaseId, FaseMundial> = {
  r32: "dieciseisavos",
  r16: "octavos",
  qf: "cuartos",
  sf: "semifinal",
  third: "tercer_lugar",
  final: "final",
};

/**
 * Filas placeholder para cruces FIFA 73–104 aún sin fixture en BD.
 * Se upsertean tras cargar partidos desde API para habilitar /partidos/[id].
 */
export function buildKnockoutPlaceholderRows(
  existingKnockout: Partido[],
): PartidoUpsertRow[] {
  const indexed = indexKnockoutPartidosByMatchNumber(existingKnockout);
  const rows: PartidoUpsertRow[] = [];

  for (const entry of WORLD_CUP_KNOCKOUT_SCHEDULE) {
    if (indexed.has(entry.matchNumber)) continue;

    rows.push({
      api_football_fixture_id: PLACEHOLDER_FIXTURE_BASE + entry.matchNumber,
      fase: PHASE_TO_FASE[entry.phase],
      grupo: null,
      jornada: null,
      equipo_local_codigo: "TBD",
      equipo_visitante_codigo: "TBD2",
      equipo_local_nombre: "Por definir",
      equipo_visitante_nombre: "Por definir",
      sede: entry.venue,
      fecha_kickoff: buildKickoffIsoFromApi(entry.date),
      estatus: "programado",
      marcador_local: null,
      marcador_visitante: null,
      canal_transmision: "sin_asignar",
      minuto_actual: null,
      metadata: {
        placeholder: true,
        fifa_match_number: entry.matchNumber,
        knockout_phase: entry.phase,
        schedule_source: "fifa_2026",
      },
    });
  }

  return rows;
}
