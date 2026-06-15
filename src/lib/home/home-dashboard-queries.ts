/**
 * Datos del dashboard personal en home (ENGAGEMENT-SPRINT-1).
 * Solo lectura — liga global, sin PII de otros usuarios.
 */

import { filterOutPilotPartidos } from "@/lib/apifootball/pilot-config";
import { LIGA_GLOBAL_ID, LIGA_GLOBAL_SLUG } from "@/lib/constants";
import { isDeadlineUrgent } from "@/lib/home/format-deadline";
import { fetchUserProfile } from "@/lib/insights/profile-data";
import { fetchMisGrupos } from "@/lib/liga/grupos-queries";
import { fetchLeaderboard } from "@/lib/leaderboard/queries";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
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

export interface HomeDashboardData {
  rank: number | null;
  profile: HomeDashboardProfile | null;
  pronosticosEnviados: number;
  pendientes: number;
}

export type FetchHomeDashboardResult =
  | { ok: true; data: HomeDashboardData }
  | { ok: false; error: string };

export type HomeQuinielaScope = "global" | "grupo";

export type HomeQuinielaStatus = "al_dia" | "pendientes" | "cierra_pronto";

export interface HomeQuinielaSummary {
  ligaId: string;
  slug: string;
  nombre: string;
  scope: HomeQuinielaScope;
  rank: number | null;
  totalParticipantes: number | null;
  pronosticosEnviados: number;
  pendientes: number;
  progress: HomeDashboardProgress;
  status: HomeQuinielaStatus;
  ctaHref: string;
  ctaLabel: string;
  loadError: boolean;
}

type PartidoRow = {
  id: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  fecha_kickoff: string;
  estatus: string;
  metadata?: unknown;
};

interface LigaStats {
  progress: HomeDashboardProgress;
  pendientes: number;
  closesSoon: boolean;
}

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

function buildPronosticosByLiga(
  rows: Array<{ liga_id: string; partido_id: string }>,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const ligaId = row.liga_id;
    let set = map.get(ligaId);
    if (!set) {
      set = new Set<string>();
      map.set(ligaId, set);
    }
    set.add(row.partido_id);
  }
  return map;
}

function computeLigaStats(
  savedIds: Set<string>,
  partidosMundial: PartidoRow[],
  nowMs: number,
): LigaStats {
  const pronosticableIds = new Set<string>();
  let pendientes = 0;
  let closesSoon = false;

  for (const row of partidosMundial) {
    if (!PRONOSTICABLE_STATUSES.has(row.estatus)) continue;
    const partidoId = row.id;
    pronosticableIds.add(partidoId);

    if (
      row.estatus === "programado" &&
      !isPronosticoLocked(row.fecha_kickoff, nowMs) &&
      !savedIds.has(partidoId)
    ) {
      pendientes += 1;
      if (isDeadlineUrgent(row.fecha_kickoff, nowMs)) {
        closesSoon = true;
      }
    }
  }

  return {
    progress: computeProgress(pronosticableIds, savedIds),
    pendientes,
    closesSoon: pendientes > 0 && closesSoon,
  };
}

function resolveQuinielaStatus(
  pendientes: number,
  closesSoon: boolean,
): HomeQuinielaStatus {
  if (pendientes === 0) return "al_dia";
  if (closesSoon) return "cierra_pronto";
  return "pendientes";
}

async function fetchMemberCount(ligaId: string): Promise<number | null> {
  const supabase = createServerDataClient();
  const { data, error } = await supabase.rpc("contar_miembros_liga", {
    p_liga_id: ligaId,
  });
  if (error) return null;
  return Number(data ?? 0);
}

async function fetchRankForLiga(
  ligaId: string,
  userId: string,
): Promise<number | null> {
  try {
    const filas = await fetchLeaderboard(ligaId);
    return filas.find((f) => f.usuario_id === userId)?.posicion ?? null;
  } catch {
    return null;
  }
}

async function buildQuinielaSummary(
  liga: {
    id: string;
    slug: string;
    nombre: string;
    scope: HomeQuinielaScope;
    miembrosCount?: number;
  },
  userId: string,
  pronosByLiga: Map<string, Set<string>>,
  partidosMundial: PartidoRow[],
  nowMs: number,
): Promise<HomeQuinielaSummary> {
  const savedIds = pronosByLiga.get(liga.id) ?? new Set<string>();
  const stats = computeLigaStats(savedIds, partidosMundial, nowMs);

  let rank: number | null = null;
  let totalParticipantes: number | null = liga.miembrosCount ?? null;
  let loadError = false;

  try {
    const [rankResult, countResult] = await Promise.all([
      fetchRankForLiga(liga.id, userId),
      liga.miembrosCount != null
        ? Promise.resolve(liga.miembrosCount)
        : fetchMemberCount(liga.id),
    ]);
    rank = rankResult;
    if (countResult != null) totalParticipantes = countResult;
  } catch {
    loadError = true;
  }

  const ctaHref =
    liga.scope === "global" ? "/quiniela" : `/grupos/${liga.slug}/quiniela`;
  const ctaLabel =
    stats.pendientes > 0 ? "Pronosticar" : "Ir a quiniela";

  return {
    ligaId: liga.id,
    slug: liga.slug,
    nombre: liga.nombre,
    scope: liga.scope,
    rank,
    totalParticipantes,
    pronosticosEnviados: stats.progress.enviados,
    pendientes: stats.pendientes,
    progress: stats.progress,
    status: resolveQuinielaStatus(stats.pendientes, stats.closesSoon),
    ctaHref,
    ctaLabel,
    loadError,
  };
}

export async function fetchHomeQuinielaSummaries(
  userId: string,
): Promise<HomeQuinielaSummary[]> {
  assertAuthenticatedUserId(userId);

  const supabase = createServerDataClient();
  const nowMs = Date.now();

  const [partidosResult, pronosResult, grupos, globalLigaResult] =
    await Promise.all([
      supabase
        .from("partidos")
        .select(PARTIDO_SELECT)
        .in("estatus", ["programado", "finalizado"])
        .order("fecha_kickoff", { ascending: true }),
      supabase
        .from("pronosticos")
        .select("liga_id, partido_id")
        .eq("usuario_id", userId),
      fetchMisGrupos(userId).catch(() => []),
      supabase
        .from("ligas_privadas")
        .select("nombre")
        .eq("id", LIGA_GLOBAL_ID)
        .maybeSingle(),
    ]);

  const partidosMundial = filterOutPilotPartidos(
    (partidosResult.error ? [] : partidosResult.data ?? []) as PartidoRow[],
  );
  const pronosByLiga = buildPronosticosByLiga(
    (pronosResult.error ? [] : pronosResult.data ?? []) as Array<{
      liga_id: string;
      partido_id: string;
    }>,
  );

  const ligas: Array<{
    id: string;
    slug: string;
    nombre: string;
    scope: HomeQuinielaScope;
    miembrosCount?: number;
  }> = [
    {
      id: LIGA_GLOBAL_ID,
      slug: LIGA_GLOBAL_SLUG,
      nombre: globalLigaResult.data?.nombre ?? "Mundial Compas",
      scope: "global",
    },
    ...grupos.map((g) => ({
      id: g.id,
      slug: g.slug,
      nombre: g.nombre,
      scope: "grupo" as const,
      miembrosCount: g.miembros_count,
    })),
  ];

  const summaries = await Promise.all(
    ligas.map((liga) =>
      buildQuinielaSummary(liga, userId, pronosByLiga, partidosMundial, nowMs),
    ),
  );

  return summaries.sort((a, b) => {
    if (a.scope === "global") return -1;
    if (b.scope === "global") return 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
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

  const stats = computeLigaStats(savedIds, partidosMundial as PartidoRow[], nowMs);

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
      pronosticosEnviados: stats.progress.enviados,
      pendientes: stats.pendientes,
    },
  };
}
