import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AnalyticsViewTracker } from "@/components/analytics/AnalyticsViewTracker";
import { AppBottomNav } from "@/components/home/AppBottomNav";
import { GrupoPageHeader } from "@/components/grupos/GrupoPageHeader";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { LeaderboardSegmentFilters } from "@/components/leaderboard/LeaderboardSegmentFilters";
import {
  LeaderboardSegmentStatus,
  shouldShowLeaderboardTable,
} from "@/components/leaderboard/LeaderboardSegmentStatus";
import {
  leaderboardSegmentLabel,
  parseFaseParam,
  parseJornadaParam,
  resolveLeaderboardFilters,
} from "@/lib/leaderboard/filters";
import { fetchLeaderboardWithFilters } from "@/lib/leaderboard/queries";
import { fetchLeaderboardSegmentStats } from "@/lib/leaderboard/segment-stats";
import { fetchGrupoBySlug } from "@/lib/liga/grupos-queries";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";
import {
  fetchQuinielaFilterOptions,
  type QuinielaFilterOptions,
} from "@/lib/quiniela/filter-options";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    jornada?: string;
    fase?: string;
    vista?: string;
  }>;
}

export default async function GrupoLeaderboardPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/grupos/${slug}/leaderboard`);

  const grupo = await fetchGrupoBySlug(user.id, slug);
  if (!grupo || !grupo.activa) notFound();

  const jornada = parseJornadaParam(sp.jornada);
  const fase = parseFaseParam(sp.fase);
  const filters = resolveLeaderboardFilters({
    tipoQuiniela: grupo.tipo_quiniela,
    jornadaParam: sp.jornada,
    faseParam: sp.fase,
    vistaParam: sp.vista,
  });

  let filas: Awaited<ReturnType<typeof fetchLeaderboardWithFilters>>["filas"] =
    [];
  let stats: Awaited<ReturnType<typeof fetchLeaderboardSegmentStats>> | null =
    null;
  let filterOptions: QuinielaFilterOptions = { jornadas: [], fases: [] };
  let loadError: string | null = null;

  try {
    const [leaderboard, segmentStats, options] = await Promise.all([
      fetchLeaderboardWithFilters(grupo.id, filters),
      fetchLeaderboardSegmentStats(grupo.id, filters),
      fetchQuinielaFilterOptions(),
    ]);
    filas = leaderboard.filas;
    stats = segmentStats;
    filterOptions = options;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error al cargar";
  }

  const segmentoLabel = leaderboardSegmentLabel(filters, grupo.tipo_quiniela);
  const totalPuntos = filas.reduce((s, f) => s + f.puntos_totales, 0);
  const showTable =
    stats != null &&
    shouldShowLeaderboardTable(stats, filters, totalPuntos);
  const miFila = filas.find((f) => f.usuario_id === user.id);

  return (
    <>
      <AnalyticsViewTracker
        event="leaderboard_viewed"
        properties={{ liga_scope: "grupo" }}
      />
      <GrupoPageHeader
        title={grupo.nombre}
        subtitle={`${TIPO_QUINIELA_LABELS[grupo.tipo_quiniela]} · ${segmentoLabel}`}
        backHref={`/grupos/${slug}`}
      />

      <main className="px-4 py-4 pb-28">
        {loadError && (
          <p className="mb-4 text-center text-sm text-red-400">{loadError}</p>
        )}

        {miFila && showTable && (
          <div className="mb-4 rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/90">
              Tu posición · {segmentoLabel}
            </p>
            <p className="mt-1 font-mono text-2xl font-black text-emerald-300">
              {miFila.posicion}°
              <span className="ml-2 text-base font-semibold text-zinc-400">
                · {miFila.puntos_totales} pts
              </span>
            </p>
          </div>
        )}

        <Suspense fallback={null}>
          <LeaderboardSegmentFilters
            tipoQuiniela={grupo.tipo_quiniela}
            filterOptions={filterOptions}
            jornadaActual={jornada}
            faseActual={fase}
            modoSegmento={filters.modoSegmento}
          />
        </Suspense>

        {stats && (
          <LeaderboardSegmentStatus
            stats={stats}
            filters={filters}
            tipoQuiniela={grupo.tipo_quiniela}
            totalPuntosEnTabla={totalPuntos}
          />
        )}

        {showTable ? (
          <Leaderboard
            filas={filas}
            usuarioActualId={user.id}
            mostrarBadgeQuinielaPaga={false}
          />
        ) : null}

        {showTable && filas.length === 0 && (
          <p className="mt-4 text-center text-sm text-zinc-500">
            Aún no hay miembros con puntos en este segmento.
          </p>
        )}

        <p className="mt-4 text-center text-xs text-zinc-600">
          <Link
            href={`/grupos/${slug}/quiniela`}
            className="text-emerald-500 hover:underline"
          >
            Ir a la quiniela del grupo
          </Link>
        </p>
      </main>

      <AppBottomNav />
    </>
  );
}
