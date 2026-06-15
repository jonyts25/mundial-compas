/**
 * Capa de lectura para perfiles de pronosticador (Sprint 1 · Fase C).
 *
 * Solo lectura sobre `pronosticos` + `partidos`. Reutiliza pick-aggregates y pick-value
 * para minorityRate. Sin tablas nuevas, sin migraciones.
 */

import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { computePickAggregates } from "@/lib/insights/pick-aggregates";
import {
  computeUserProfile,
  type ProfileMetrics,
  type UserProfile,
} from "@/lib/insights/profiles";
import { computePickValue } from "@/lib/prediction-engine/pick-value";
import { createClient } from "@/lib/supabase/server";

interface PronosticoRow {
  partido_id: string;
  goles_local: number;
  goles_visitante: number;
  puntos: number;
  puntos_calculados_at: string | null;
  partidos: {
    estatus: string;
    fecha_kickoff: string;
    marcador_local: number | null;
    marcador_visitante: number | null;
  };
}

function isScored(row: PronosticoRow): boolean {
  return (
    row.partidos.estatus === "finalizado" &&
    row.puntos_calculados_at != null
  );
}

function computeExactStreak(scored: PronosticoRow[]): number {
  const sorted = [...scored].sort(
    (a, b) =>
      new Date(b.partidos.fecha_kickoff).getTime() -
      new Date(a.partidos.fecha_kickoff).getTime(),
  );
  let streak = 0;
  for (const row of sorted) {
    if (row.puntos === 3) streak += 1;
    else break;
  }
  return streak;
}

function computeMinorityRate(
  scored: PronosticoRow[],
  picksByPartido: Map<string, { goles_local: number; goles_visitante: number }[]>,
): number {
  if (scored.length === 0) return 0;

  let minorityCount = 0;

  for (const row of scored) {
    const all = picksByPartido.get(row.partido_id);
    if (!all || all.length === 0) continue;

    const resultadoReal =
      row.partidos.marcador_local != null &&
      row.partidos.marcador_visitante != null
        ? {
            local: row.partidos.marcador_local,
            visitante: row.partidos.marcador_visitante,
          }
        : null;

    const aggregates = computePickAggregates(
      all.map((p) => ({
        golesLocal: p.goles_local,
        golesVisitante: p.goles_visitante,
      })),
      resultadoReal,
    );
    const pickValue = computePickValue(aggregates, {
      local: row.goles_local,
      visitante: row.goles_visitante,
    });

    if (pickValue.kind === "diferencial" || pickValue.kind === "raro") {
      minorityCount += 1;
    }
  }

  return minorityCount / scored.length;
}

function buildMetrics(
  rows: PronosticoRow[],
  picksByPartido: Map<string, { goles_local: number; goles_visitante: number }[]>,
): ProfileMetrics {
  const P = rows.length;
  const scored = rows.filter(isScored);
  const N = scored.length;

  const exactos = scored.filter((r) => r.puntos === 3).length;
  const tendencias = scored.filter((r) => r.puntos === 1).length;
  const totalPuntos = scored.reduce((s, r) => s + r.puntos, 0);

  const draws = rows.filter(
    (r) => r.goles_local === r.goles_visitante,
  ).length;

  return {
    N,
    P,
    exactos,
    tendencias,
    exactRate: N > 0 ? exactos / N : 0,
    hitRate: N > 0 ? (exactos + tendencias) / N : 0,
    precision: N > 0 ? totalPuntos / N / 3 : 0,
    drawRate: P > 0 ? draws / P : 0,
    minorityRate: computeMinorityRate(scored, picksByPartido),
    exactStreak: computeExactStreak(scored),
  };
}

/**
 * Obtiene el perfil del usuario para una liga (lectura on-demand).
 */
export async function fetchUserProfile(
  userId: string,
  ligaId: string = LIGA_GLOBAL_ID,
): Promise<UserProfile> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("pronosticos")
    .select(
      `
      partido_id,
      goles_local,
      goles_visitante,
      puntos,
      puntos_calculados_at,
      partidos!inner (
        estatus,
        fecha_kickoff,
        marcador_local,
        marcador_visitante
      )
    `,
    )
    .eq("liga_id", ligaId)
    .eq("usuario_id", userId);

  if (error || !rows?.length) {
    const empty: ProfileMetrics = {
      N: 0,
      P: 0,
      exactos: 0,
      tendencias: 0,
      exactRate: 0,
      hitRate: 0,
      precision: 0,
      drawRate: 0,
      minorityRate: 0,
      exactStreak: 0,
    };
    return computeUserProfile(empty);
  }

  const typed = rows as unknown as PronosticoRow[];
  const scoredPartidoIds = [
    ...new Set(typed.filter(isScored).map((r) => r.partido_id)),
  ];

  const picksByPartido = new Map<
    string,
    { goles_local: number; goles_visitante: number }[]
  >();

  if (scoredPartidoIds.length > 0) {
    const { data: allPicks } = await supabase
      .from("pronosticos")
      .select("partido_id, goles_local, goles_visitante")
      .eq("liga_id", ligaId)
      .in("partido_id", scoredPartidoIds);

    for (const p of allPicks ?? []) {
      const list = picksByPartido.get(p.partido_id as string) ?? [];
      list.push({
        goles_local: p.goles_local as number,
        goles_visitante: p.goles_visitante as number,
      });
      picksByPartido.set(p.partido_id as string, list);
    }
  }

  const metrics = buildMetrics(typed, picksByPartido);
  return computeUserProfile(metrics);
}
