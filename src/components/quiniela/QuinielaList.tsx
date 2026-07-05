"use client";

import { useEffect, useMemo, useState } from "react";
import { QuinielaRoundSection } from "@/components/quiniela/QuinielaRoundSection";
import {
  detectActiveQuinielaPhase,
  computeQuinielaTotalPoints,
  groupPartidosByQuinielaRound,
} from "@/lib/quiniela/knockout-rounds";
import { toMexicoDateKey } from "@/lib/datetime/mexico";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import { isKnockoutPronosticable } from "@/lib/world-cup/knockout-participant-utils";
import type { TipoQuiniela } from "@/lib/liga/tipo-quiniela";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";
import type { PronosticoUsuario } from "@/lib/quiniela/queries";
import type { Partido } from "@/types/database";

type Filtro =
  | "todos"
  | "pendientes"
  | "guardados"
  | "cerrados"
  | "hoy"
  | "proximos";

interface QuinielaListProps {
  partidos: Partido[];
  pronosticosPorPartido: Record<string, PronosticoUsuario>;
  ligaId?: string;
  tipoQuiniela?: TipoQuiniela;
  emptyHint?: string;
}

const CIERRE_PROXIMO_MS = 2 * 60 * 60 * 1000;

export function QuinielaList({
  partidos,
  pronosticosPorPartido,
  ligaId,
  tipoQuiniela,
  emptyHint,
}: QuinielaListProps) {
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const hoyKey = useMemo(
    () => toMexicoDateKey(new Date(nowMs).toISOString()),
    [nowMs],
  );

  const pronosticosGuardados = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const [id] of Object.entries(pronosticosPorPartido)) {
      map[id] = true;
    }
    return map;
  }, [pronosticosPorPartido]);

  const stats = useMemo(() => {
    const now = nowMs;
    let pendientes = 0;
    let guardados = 0;
    let cierranPronto = 0;

    for (const p of partidos) {
      const locked = isPronosticoLocked(p.fecha_kickoff, now);
      const pronosticable = isKnockoutPronosticable(p);
      const tiene = Boolean(pronosticosPorPartido[p.id]);
      if (tiene) guardados += 1;
      if (!locked && !tiene && pronosticable) pendientes += 1;
      if (!locked && !tiene && pronosticable) {
        const kickoff = new Date(p.fecha_kickoff).getTime();
        if (kickoff - now <= CIERRE_PROXIMO_MS && kickoff > now) {
          cierranPronto += 1;
        }
      }
    }

    return {
      pendientes,
      guardados,
      cierranPronto,
      total: partidos.length,
    };
  }, [partidos, pronosticosPorPartido, nowMs]);

  const filtrados = useMemo(() => {
    const now = nowMs;
    return partidos.filter((p) => {
      const locked = isPronosticoLocked(p.fecha_kickoff, now);
      const pronosticable = isKnockoutPronosticable(p);
      const tiene = Boolean(pronosticosPorPartido[p.id]);
      const esHoy = toMexicoDateKey(p.fecha_kickoff) === hoyKey;
      const kickoff = new Date(p.fecha_kickoff).getTime();
      const esProximo = kickoff > now && kickoff - now <= 7 * 24 * 60 * 60 * 1000;

      switch (filtro) {
        case "pendientes":
          return !locked && !tiene && pronosticable;
        case "guardados":
          return tiene;
        case "cerrados":
          return locked;
        case "hoy":
          return esHoy && !locked && pronosticable;
        case "proximos":
          return esProximo && !locked && pronosticable;
        default:
          return true;
      }
    });
  }, [partidos, pronosticosPorPartido, filtro, hoyKey, nowMs]);

  const activePhase = useMemo(
    () => detectActiveQuinielaPhase(partidos, nowMs),
    [partidos, nowMs],
  );

  const totalPuntos = useMemo(
    () => computeQuinielaTotalPoints(partidos, pronosticosPorPartido),
    [partidos, pronosticosPorPartido],
  );

  const roundGroups = useMemo(
    () =>
      groupPartidosByQuinielaRound({
        partidos,
        filteredPartidos: filtrados,
        pronosticosPorPartido: pronosticosGuardados,
        pronosticosConPuntos: pronosticosPorPartido,
        nowMs,
      }),
    [partidos, filtrados, pronosticosGuardados, pronosticosPorPartido, nowMs],
  );

  const visibleRoundGroups = useMemo(
    () => roundGroups.filter((g) => g.visibility !== "empty"),
    [roundGroups],
  );

  if (partidos.length === 0) {
    const tipoLabel = tipoQuiniela ? TIPO_QUINIELA_LABELS[tipoQuiniela] : null;
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 px-6 py-10 text-center">
        <p className="text-2xl" aria-hidden>
          📅
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {emptyHint ??
            (tipoLabel
              ? `No hay partidos para «${tipoLabel}» en este momento.`
              : "No hay partidos cargados.")}
        </p>
        {!emptyHint && !tipoQuiniela && (
          <p className="mt-2 text-xs text-zinc-600">
            Los partidos aparecerán cuando estén disponibles en el calendario.
          </p>
        )}
      </div>
    );
  }

  const emptyMessage = (() => {
    if (filtro === "pendientes" && stats.pendientes === 0) {
      return "¡Ya guardaste todo! 🎉 Revisa «Mis picks» o el calendario.";
    }
    if (filtro === "guardados" && stats.guardados === 0) {
      return "Aún no tienes pronósticos guardados.";
    }
    if (filtro === "hoy") {
      return "No hay partidos abiertos para hoy con este filtro.";
    }
    if (filtro === "proximos") {
      return "No hay partidos próximos abiertos.";
    }
    return "Nada en este filtro. Prueba otro chip.";
  })();

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500/80">
          Tus puntos en esta quiniela
        </p>
        <p className="mt-0.5 text-2xl font-black tabular-nums text-emerald-300">
          {totalPuntos}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          Suma de partidos finalizados con pronóstico guardado
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Pendientes" value={stats.pendientes} accent="amber" />
        <StatCard label="Guardados" value={stats.guardados} accent="emerald" />
        <StatCard label="Cierran pronto" value={stats.cierranPronto} />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            ["pendientes", "Pendientes"],
            ["guardados", "Mis picks"],
            ["hoy", "Hoy"],
            ["proximos", "Próximos"],
            ["todos", "Todos"],
            ["cerrados", "Cerrados"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFiltro(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filtro === key
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleRoundGroups.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {visibleRoundGroups.map((group) => (
            <QuinielaRoundSection
              key={group.fase}
              group={group}
              pronosticosPorPartido={pronosticosPorPartido}
              ligaId={ligaId}
              defaultExpanded={group.fase === activePhase}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "amber"
        ? "text-amber-400"
        : "text-white";

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-2 py-2 text-center">
      <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
    </div>
  );
}
