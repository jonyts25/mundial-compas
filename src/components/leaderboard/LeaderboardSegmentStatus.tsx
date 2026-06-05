import type { LeaderboardFilters } from "@/lib/leaderboard/filters";
import { leaderboardSegmentLabel } from "@/lib/leaderboard/filters";
import type { LeaderboardSegmentStats } from "@/lib/leaderboard/segment-stats";
import type { TipoQuiniela } from "@/lib/liga/tipo-quiniela";

interface LeaderboardSegmentStatusProps {
  stats: LeaderboardSegmentStats;
  filters: LeaderboardFilters;
  tipoQuiniela: TipoQuiniela;
  totalPuntosEnTabla: number;
}

export function shouldShowLeaderboardTable(
  stats: LeaderboardSegmentStats,
  filters: LeaderboardFilters,
  totalPuntosEnTabla: number,
): boolean {
  if (stats.partidosEnSegmento === 0) return false;
  if (stats.partidosFinalizados > 0) return true;
  if (totalPuntosEnTabla > 0) return true;
  return false;
}

export function LeaderboardSegmentStatus({
  stats,
  filters,
  tipoQuiniela,
  totalPuntosEnTabla,
}: LeaderboardSegmentStatusProps) {
  const segmento = leaderboardSegmentLabel(filters, tipoQuiniela);

  if (stats.partidosEnSegmento === 0) {
    return (
      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center">
        <p className="text-sm font-medium text-zinc-300">
          No hay partidos en este segmento
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          {segmento}: aún no hay encuentros que cuenten para el ranking.
        </p>
      </div>
    );
  }

  if (stats.partidosFinalizados === 0 && totalPuntosEnTabla === 0) {
    if (stats.pronosticosEnSegmento > 0) {
      return (
        <div className="mb-4 rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-6 text-center">
          <p className="text-sm font-medium text-amber-100/90">
            El ranking se actualizará cuando terminen los partidos
          </p>
          <p className="mt-2 text-xs text-amber-200/60">
            Hay pronósticos en {segmento}, pero ningún partido finalizado con
            marcador todavía.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center">
        <p className="text-sm font-medium text-zinc-300">
          Todavía no hay puntos calculados para este segmento
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Guarda pronósticos en la quiniela; los puntos aparecerán al cerrar
          los partidos.
        </p>
      </div>
    );
  }

  if (totalPuntosEnTabla === 0 && stats.partidosFinalizados > 0) {
    return (
      <p className="mb-3 text-center text-xs text-zinc-500">
        Partidos finalizados en {segmento}, pero aún sin puntos en la tabla.
      </p>
    );
  }

  return null;
}
