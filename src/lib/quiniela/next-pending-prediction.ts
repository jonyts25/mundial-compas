/**
 * Próximo pronóstico pendiente — liga global (NEXT-PENDING-PREDICTION-1).
 *
 * Solo lectura. Sin PII de otros usuarios.
 */

import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { filterOutPilotPartidos } from "@/lib/api-football/pilot-config";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import {
  isGroupStageClosedForQuiniela,
} from "@/lib/quiniela/knockout-rounds";
import { isKnockoutPronosticable } from "@/lib/world-cup/knockout-participant-utils";
import { dedupePartidosForDisplay } from "@/lib/partidos/partido-match-key";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";
import type { FaseMundial } from "@/types/database";

const PARTIDO_SELECT =
  "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, metadata";

export interface NextPendingPredictionItem {
  partidoId: string;
  equipoLocalNombre: string;
  equipoVisitanteNombre: string;
  equipoLocalCodigo: string;
  equipoVisitanteCodigo: string;
  fechaKickoff: string;
  grupo: string | null;
  fase: FaseMundial;
  jornada: number | null;
}

export type FetchNextPendingPredictionResult =
  | { ok: true; item: NextPendingPredictionItem | null }
  | { ok: false; error: string };

/**
 * Primer partido `programado` no bloqueado sin pronóstico del usuario en liga global.
 * Orden: `fecha_kickoff` ascendente.
 */
export async function fetchNextPendingPredictionForUser(
  userId: string,
): Promise<FetchNextPendingPredictionResult> {
  assertAuthenticatedUserId(userId);

  const supabase = createServerDataClient();
  const nowMs = Date.now();

  const { data: partidos, error: partidosError } = await supabase
    .from("partidos")
    .select(PARTIDO_SELECT)
    .eq("estatus", "programado")
    .order("fecha_kickoff", { ascending: true });

  if (partidosError) {
    return { ok: false, error: partidosError.message };
  }

  const { data: pronosticos, error: pronosError } = await supabase
    .from("pronosticos")
    .select("partido_id")
    .eq("liga_id", LIGA_GLOBAL_ID)
    .eq("usuario_id", userId);

  if (pronosError) {
    return { ok: false, error: pronosError.message };
  }

  const savedIds = new Set((pronosticos ?? []).map((p) => p.partido_id as string));
  const candidatos = dedupePartidosForDisplay(filterOutPilotPartidos(partidos ?? []));
  const skipGrupos = isGroupStageClosedForQuiniela(candidatos, nowMs);

  for (const row of candidatos) {
    const partidoId = row.id as string;
    if (savedIds.has(partidoId)) continue;
    const fechaKickoff = row.fecha_kickoff as string;
    if (isPronosticoLocked(fechaKickoff, nowMs)) continue;

    const fase = row.fase as FaseMundial;
    if (skipGrupos && fase === "grupos") continue;

    const partidoLike = {
      fase,
      equipo_local_codigo: row.equipo_local_codigo as string,
      equipo_visitante_codigo: row.equipo_visitante_codigo as string,
      equipo_local_nombre: row.equipo_local_nombre as string,
      equipo_visitante_nombre: row.equipo_visitante_nombre as string,
    };
    if (!isKnockoutPronosticable(partidoLike)) continue;

    return {
      ok: true,
      item: {
        partidoId,
        equipoLocalNombre: row.equipo_local_nombre as string,
        equipoVisitanteNombre: row.equipo_visitante_nombre as string,
        equipoLocalCodigo: row.equipo_local_codigo as string,
        equipoVisitanteCodigo: row.equipo_visitante_codigo as string,
        fechaKickoff,
        grupo: row.grupo as string | null,
        fase: row.fase as FaseMundial,
        jornada: row.jornada as number | null,
      },
    };
  }

  return { ok: true, item: null };
}
