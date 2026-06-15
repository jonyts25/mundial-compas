"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";
import type { HomeDashboardProgress } from "@/lib/home/home-dashboard-queries";

interface PredictionProgressCardProps {
  progress: HomeDashboardProgress;
  loading?: boolean;
}

export function PredictionProgressCard({
  progress,
  loading = false,
}: PredictionProgressCardProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (loading || tracked.current) return;
    tracked.current = true;
    trackEvent("prediction_progress_shown", {
      enviados: progress.enviados,
      total: progress.total,
      percent: progress.percent,
    });
  }, [loading, progress.enviados, progress.total, progress.percent]);

  const { enviados, total, percent } = progress;
  const barWidth = loading ? 0 : Math.min(100, Math.max(0, percent));

  return (
    <section
      className="rounded-2xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-4"
      aria-label="Progreso de pronósticos"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-100">Tus pronósticos</h2>
        {!loading && total > 0 && (
          <span className="text-xs font-semibold tabular-nums text-emerald-400">
            {percent}%
          </span>
        )}
      </div>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuenow={loading ? undefined : percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          loading
            ? "Cargando progreso"
            : `${enviados} de ${total} partidos pronosticados`
        }
      >
        {loading ? (
          <div className="h-full w-full animate-pulse bg-zinc-700/80" />
        ) : (
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        )}
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        {loading ? (
          <span className="inline-block h-4 w-40 animate-pulse rounded bg-zinc-700/80" />
        ) : total === 0 ? (
          "Aún no hay partidos pronosticables"
        ) : (
          <>
            <span className="font-semibold tabular-nums text-zinc-200">
              {enviados}
            </span>{" "}
            de{" "}
            <span className="font-semibold tabular-nums text-zinc-200">
              {total}
            </span>{" "}
            partidos pronosticados
          </>
        )}
      </p>
    </section>
  );
}
