"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";
import type {
  HomeQuinielaStatus,
  HomeQuinielaSummary,
} from "@/lib/home/home-dashboard-queries";

interface MultiQuinielaSummaryCarouselProps {
  summaries: HomeQuinielaSummary[];
}

function statusLabel(status: HomeQuinielaStatus, pendientes: number): string {
  if (status === "al_dia") return "Vas al día";
  if (status === "cierra_pronto") return "Cierra pronto";
  return `Te faltan ${pendientes}`;
}

function statusClass(status: HomeQuinielaStatus): string {
  if (status === "al_dia") return "bg-emerald-500/15 text-emerald-300";
  if (status === "cierra_pronto") return "bg-red-500/15 text-red-300";
  return "bg-amber-500/15 text-amber-300";
}

function QuinielaSummaryCard({
  summary,
  onCtaClick,
}: {
  summary: HomeQuinielaSummary;
  onCtaClick: () => void;
}) {
  const { progress } = summary;
  const barWidth = Math.min(100, Math.max(0, progress.percent));

  return (
    <article
      className="flex w-[min(85vw,18rem)] shrink-0 snap-start flex-col rounded-2xl border border-zinc-700/80 bg-zinc-900/70 p-4 shadow-sm"
      aria-label={`Quiniela ${summary.nombre}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-50">
            {summary.scope === "global" ? "🌍 " : "👥 "}
            {summary.nombre}
          </p>
          {summary.scope === "global" && (
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Global
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(summary.status)}`}
        >
          {statusLabel(summary.status, summary.pendientes)}
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-xs text-zinc-400">
        <div className="flex justify-between gap-2">
          <dt>Ranking</dt>
          <dd className="font-semibold tabular-nums text-zinc-200">
            {summary.loadError && summary.rank == null
              ? "—"
              : summary.rank != null
                ? `#${summary.rank}`
                : "Sin datos"}
          </dd>
        </div>
        {summary.totalParticipantes != null && (
          <div className="flex justify-between gap-2">
            <dt>Participantes</dt>
            <dd className="font-semibold tabular-nums text-zinc-200">
              {summary.totalParticipantes}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt>Enviados</dt>
          <dd className="font-semibold tabular-nums text-zinc-200">
            {summary.pronosticosEnviados}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Pendientes</dt>
          <dd className="font-semibold tabular-nums text-zinc-200">
            {summary.pendientes}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] text-zinc-500">
          <span>Progreso</span>
          <span className="tabular-nums font-semibold text-emerald-400/90">
            {progress.total > 0 ? `${progress.percent}%` : "—"}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {progress.total > 0 && (
          <p className="mt-1 text-[10px] text-zinc-500">
            {progress.enviados} de {progress.total} partidos
          </p>
        )}
      </div>

      <Link
        href={summary.ctaHref}
        onClick={onCtaClick}
        className={`mt-4 flex w-full items-center justify-center rounded-xl py-2 text-sm font-bold text-white transition ${
          summary.status === "cierra_pronto"
            ? "bg-red-600 hover:bg-red-500"
            : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        {summary.ctaLabel}
      </Link>
    </article>
  );
}

export function MultiQuinielaSummaryCarousel({
  summaries,
}: MultiQuinielaSummaryCarouselProps) {
  const shownTracked = useRef(false);

  useEffect(() => {
    if (shownTracked.current || summaries.length === 0) return;
    shownTracked.current = true;
    trackEvent("home_quiniela_summary_shown", { ligas_count: summaries.length });
  }, [summaries.length]);

  if (summaries.length === 0) {
    return null;
  }

  function handleCardClick(summary: HomeQuinielaSummary) {
    trackEvent("home_quiniela_summary_clicked", {
      liga_id: summary.ligaId,
      liga_scope: summary.scope,
    });
  }

  return (
    <section className="mb-4" aria-label="Tus quinielas">
      <h2 className="mb-3 text-sm font-bold text-zinc-100">Tus quinielas</h2>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
          {summaries.map((summary) => (
            <QuinielaSummaryCard
              key={summary.ligaId}
              summary={summary}
              onCtaClick={() => handleCardClick(summary)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
