"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";
import type { HomeDashboardProfile } from "@/lib/home/home-dashboard-queries";

interface HomePersonalSummaryCardProps {
  nombre: string;
  rank: number | null;
  profile: HomeDashboardProfile | null;
  pronosticosEnviados: number;
  pendientes: number;
  loading?: boolean;
}

function StatSkeleton() {
  return (
    <span className="inline-block h-4 w-8 animate-pulse rounded bg-zinc-700/80" />
  );
}

export function HomePersonalSummaryCard({
  nombre,
  rank,
  profile,
  pronosticosEnviados,
  pendientes,
  loading = false,
}: HomePersonalSummaryCardProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (loading || tracked.current) return;
    tracked.current = true;
    trackEvent("home_summary_shown", {
      has_rank: rank != null,
      has_profile: profile != null,
      pendientes,
    });
  }, [loading, rank, profile, pendientes]);

  const displayName = nombre.trim() || "compa";

  return (
    <section
      className="rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-zinc-900/90 to-zinc-950 px-4 py-4 shadow-sm"
      aria-label="Resumen personal"
    >
      <h2 className="text-lg font-bold text-white">
        Hola {displayName}
      </h2>

      <ul className="mt-3 space-y-2 text-sm text-zinc-200">
        <li className="flex items-center gap-2">
          <span aria-hidden>🏆</span>
          {loading ? (
            <StatSkeleton />
          ) : rank != null ? (
            <span>
              Lugar{" "}
              <Link
                href="/leaderboard"
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                #{rank}
              </Link>
            </span>
          ) : (
            <span className="text-zinc-400">Ranking aún no disponible</span>
          )}
        </li>

        <li className="flex items-center gap-2">
          <span aria-hidden>🎯</span>
          {loading ? (
            <StatSkeleton />
          ) : profile ? (
            <span>
              Perfil:{" "}
              <span className="font-semibold text-zinc-50">
                {profile.emoji} {profile.label}
              </span>
            </span>
          ) : (
            <span className="text-zinc-400">Perfil en camino</span>
          )}
        </li>

        <li className="flex items-center gap-2">
          <span aria-hidden>⚽</span>
          {loading ? (
            <StatSkeleton />
          ) : (
            <span>
              <span className="font-semibold tabular-nums">{pronosticosEnviados}</span>{" "}
              pronóstico{pronosticosEnviados === 1 ? "" : "s"} enviado
              {pronosticosEnviados === 1 ? "" : "s"}
            </span>
          )}
        </li>

        <li className="flex items-center gap-2">
          <span aria-hidden>⏰</span>
          {loading ? (
            <StatSkeleton />
          ) : pendientes > 0 ? (
            <span>
              <span className="font-semibold tabular-nums text-amber-300">
                {pendientes}
              </span>{" "}
              pendiente{pendientes === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-emerald-300/90">Al día — sin pendientes</span>
          )}
        </li>
      </ul>
    </section>
  );
}
