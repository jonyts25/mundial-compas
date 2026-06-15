"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { formatMexicoKickoff } from "@/lib/datetime/mexico";
import {
  formatDeadlineCountdown,
  isDeadlineUrgent,
} from "@/lib/home/format-deadline";
import type { HomeDashboardNextDeadline } from "@/lib/home/home-dashboard-queries";

interface NextDeadlineCardProps {
  deadline: HomeDashboardNextDeadline | null;
  loading?: boolean;
}

function subscribeToMinuteTick(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(id);
}

function getNowMs() {
  return Date.now();
}

export function NextDeadlineCard({ deadline, loading = false }: NextDeadlineCardProps) {
  const tracked = useRef(false);
  const nowMs = useSyncExternalStore(subscribeToMinuteTick, getNowMs, getNowMs);

  useEffect(() => {
    if (loading || !deadline || tracked.current) return;
    tracked.current = true;
    trackEvent("next_deadline_shown", { partido_id: deadline.partidoId });
  }, [loading, deadline]);

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-4"
        aria-label="Próximo cierre"
      >
        <h2 className="text-sm font-bold text-zinc-100">Próximo cierre</h2>
        <div className="mt-3 space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-700/80" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-700/80" />
        </div>
      </section>
    );
  }

  if (!deadline) {
    return (
      <section
        className="rounded-2xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-4"
        aria-label="Próximo cierre"
      >
        <h2 className="text-sm font-bold text-zinc-100">Próximo cierre</h2>
        <p className="mt-2 text-sm text-zinc-400">
          No hay partidos abiertos para pronosticar por ahora.
        </p>
      </section>
    );
  }

  const urgent = isDeadlineUrgent(deadline.fechaKickoff, nowMs);
  const countdown = formatDeadlineCountdown(deadline.fechaKickoff, nowMs);
  const { fecha, hora } = formatMexicoKickoff(deadline.fechaKickoff);

  return (
    <section
      className={`rounded-2xl border px-4 py-4 ${
        urgent
          ? "border-red-500/40 bg-gradient-to-b from-red-950/30 to-zinc-900/60 shadow-sm shadow-red-950/20"
          : "border-zinc-700/80 bg-zinc-900/60"
      }`}
      aria-label="Próximo cierre"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-100">Próximo cierre</h2>
        {urgent && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
            Urgente
          </span>
        )}
      </div>

      <p className="mt-3 text-center text-base font-bold leading-snug text-zinc-50">
        {deadline.equipoLocalNombre}
        <span className="mx-2 font-normal text-zinc-500">vs</span>
        {deadline.equipoVisitanteNombre}
      </p>

      <p className="mt-1 text-center text-xs text-zinc-400">
        {fecha} · {hora} CDMX
      </p>

      <p
        className={`mt-2 text-center text-sm font-semibold ${
          urgent ? "text-red-300" : "text-amber-300/90"
        }`}
      >
        {countdown}
      </p>

      <Link
        href={`/partidos/${deadline.partidoId}`}
        className={`mt-4 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-bold text-white transition ${
          urgent
            ? "bg-red-600 hover:bg-red-500"
            : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        Pronosticar
      </Link>
    </section>
  );
}
