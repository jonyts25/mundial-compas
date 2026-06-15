/**
 * Datos del dashboard personal en home (ENGAGEMENT-SPRINT-1).
 * Solo lectura — liga global, sin PII de otros usuarios.
 */

import { filterOutPilotPartidos } from "@/lib/apifootball/pilot-config";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { fetchUserProfile } from "@/lib/insights/profile-data";
import { fetchLeaderboard } from "@/lib/leaderboard/queries";
import { getLockAtMs, isPronosticoLocked } from "@/lib/quiniela/lock";
import {
  assertAuthenticatedUserId,
  createServerDataClient,
} from "@/lib/supabase/server-data";

const PARTIDO_SELECT =
  "id, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, metadata";

const PRONOSTICABLE_STATUSES = new Set(["programado", "finalizado"]);

export interface HomeDashboardProfile {
  id: string;
  label: string;
  emoji: string;
}

export interface HomeDashboardProgress {
  enviados: number;
  total: number;
  percent: number;
}

export interface HomeDashboardNextDeadline {
  partidoId: string;
  equipoLocalNombre: string;
  equipoVisitanteNombre: string;
  fechaKickoff: string;
}

export interface HomeDashboardData {
  rank: number | null;
  profile: HomeDashboardProfile | null;
  pronosticosEnviados: number;
  pendientes: number;
  progress: HomeDashboardProgress;
  nextDeadline: HomeDashboardNextDeadline | null;
}

export type FetchHomeDashboardResult =
  | { ok: true; data: HomeDashboardData }
  | { ok: false; error: string };

function computeProgress(
  partidoIds: Set<string>,
  savedIds: Set<string>,
): HomeDashboardProgress {
  const total = partidoIds.size;
  let enviados = 0;
  for (const id of partidoIds) {
    if (savedIds.has(id)) enviados += 1;
  }
  const percent = total > 0 ? Math.round((enviados / total) * 100) : 0;
  return { enviados, total, percent };
}

function findNextDeadline(
  partidos: Array<{
    id: string;
    equipo_local_nombre: string;
    equipo_visitante_nombre: string;
    fecha_kickoff: string;
    estatus: string;
  }>,
  nowMs: number,
): HomeDashboardNextDeadline | null {
  const open = partidos
    .filter((row) => row.estatus === "programado")
    .filter((row) => !isPronosticoLocked(row.fecha_kickoff, nowMs))
    .sort((a, b) => getLockAtMs(a.fecha_kickoff) - getLockAtMs(b.fecha_kickoff));

  const next = open[0];
  if (!next) return null;

  return {
    partidoId: next.id,
    equipoLocalNombre: next.equipo_local_nombre,
    equipoVisitanteNombre: next.equipo_visitante_nombre,
    fechaKickoff: next.fecha_kickoff,
  };
}

export async function fetchHomeDashboardData(
  userId: string,
): Promise<FetchHomeDashboardResult> {
  assertAuthenticatedUserId(userId);

  const supabase = createServerDataClient();
  const nowMs = Date.now();

  const [partidosResult, pronosResult, rankResult, profileResult] =
    await Promise.all([
      supabase
        .from("partidos")
        .select(PARTIDO_SELECT)
        .in("estatus", ["programado", "finalizado"])
        .order("fecha_kickoff", { ascending: true }),
      supabase
        .from("pronosticos")
        .select("partido_id")
        .eq("liga_id", LIGA_GLOBAL_ID)
        .eq("usuario_id", userId),
      fetchLeaderboard(LIGA_GLOBAL_ID).catch(() => null),
      fetchUserProfile(userId).catch(() => null),
    ]);

  if (partidosResult.error) {
    return { ok: false, error: partidosResult.error.message };
  }
  if (pronosResult.error) {
    return { ok: false, error: pronosResult.error.message };
  }

  const partidosMundial = filterOutPilotPartidos(partidosResult.data ?? []);
  const savedIds = new Set(
    (pronosResult.data ?? []).map((p) => p.partido_id as string),
  );

  const pronosticableIds = new Set<string>();
  let pendientes = 0;

  for (const row of partidosMundial) {
    if (!PRONOSTICABLE_STATUSES.has(row.estatus as string)) continue;
    const partidoId = row.id as string;
    pronosticableIds.add(partidoId);

    if (
      row.estatus === "programado" &&
      !isPronosticoLocked(row.fecha_kickoff as string, nowMs) &&
      !savedIds.has(partidoId)
    ) {
      pendientes += 1;
    }
  }

  const progress = computeProgress(pronosticableIds, savedIds);

  const nextDeadline = findNextDeadline(partidosMundial, nowMs);

  const rank =
    rankResult?.find((fila) => fila.usuario_id === userId)?.posicion ?? null;

  const profile = profileResult
    ? {
        id: profileResult.primary.id,
        label: profileResult.primary.label,
        emoji: profileResult.primary.emoji,
      }
    : null;

  return {
    ok: true,
    data: {
      rank,
      profile,
      pronosticosEnviados: progress.enviados,
      pendientes,
      progress,
      nextDeadline,
    },
  };
}
