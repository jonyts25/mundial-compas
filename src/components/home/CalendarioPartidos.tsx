"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatCalendarioTab,
  formatMexicoTime,
  toMexicoDateKey,
} from "@/lib/datetime/mexico";
import { getCanalDisplay, isPartidoEnVivo } from "@/lib/partidos/labels";
import { getFlagImageUrl } from "@/lib/teams/flags";
import type { Partido } from "@/types/database";

export interface CalendarioPartidosProps {
  partidos: Partido[];
  pronosticosGuardados: Record<string, boolean>;
  diasConPartidos: string[];
  /** IDs de partidos del fin de semana de prueba (Champions, etc.) */
  pilotPartidoIds?: string[];
}

function pickInitialDay(dias: string[]): string {
  if (dias.length === 0) return toMexicoDateKey(new Date());
  const hoy = toMexicoDateKey(new Date());
  if (dias.includes(hoy)) return hoy;
  const futuro = dias.find((d) => d >= hoy);
  return futuro ?? dias[dias.length - 1]!;
}

export function CalendarioPartidos({
  partidos,
  pronosticosGuardados,
  diasConPartidos,
  pilotPartidoIds = [],
}: CalendarioPartidosProps) {
  const pilotSet = useMemo(() => new Set(pilotPartidoIds), [pilotPartidoIds]);
  const [selectedDay, setSelectedDay] = useState(() =>
    pickInitialDay(diasConPartidos),
  );

  const partidosPorDia = useMemo(() => {
    const map = new Map<string, Partido[]>();
    for (const p of partidos) {
      const key = toMexicoDateKey(p.fecha_kickoff);
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          new Date(a.fecha_kickoff).getTime() - new Date(b.fecha_kickoff).getTime(),
      );
    }
    return map;
  }, [partidos]);

  const partidosDelDia = partidosPorDia.get(selectedDay) ?? [];

  const statsDia = useMemo(() => {
    const guardados = partidosDelDia.filter((p) => pronosticosGuardados[p.id]).length;
    return { guardados, total: partidosDelDia.length };
  }, [partidosDelDia, pronosticosGuardados]);

  if (diasConPartidos.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
        <p className="text-sm text-zinc-400">No hay partidos en el calendario.</p>
      </section>
    );
  }

  return (
    <section className="mt-8" aria-label="Calendario de partidos">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">
            Partidos del día
          </h2>
          <p className="text-xs text-zinc-500">
            {statsDia.total} partidos · {statsDia.guardados} pronósticos listos
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-xs font-semibold">
          <Link
            href="/posiciones"
            className="text-zinc-400 hover:text-emerald-300"
          >
            Grupos
          </Link>
          <Link
            href="/quiniela"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Quiniela →
          </Link>
        </div>
      </div>

      {/* Barra de fechas */}
      <div className="mb-4 -mx-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {diasConPartidos.map((dateKey) => {
            const { weekdayShort, dayNumber } = formatCalendarioTab(dateKey);
            const isSelected = dateKey === selectedDay;
            const count = partidosPorDia.get(dateKey)?.length ?? 0;
            const isToday = dateKey === toMexicoDateKey(new Date());

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDay(dateKey)}
                className={`flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition ${
                  isSelected
                    ? "border-emerald-500 bg-gradient-to-b from-emerald-600/30 to-emerald-950/50 text-white shadow-md shadow-emerald-900/30"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {weekdayShort}
                </span>
                <span className="text-lg font-black leading-tight">{dayNumber}</span>
                <span
                  className={`mt-0.5 text-[9px] font-medium ${
                    isSelected ? "text-emerald-300" : "text-zinc-600"
                  }`}
                >
                  {count} {count === 1 ? "pj" : "pjs"}
                </span>
                {isToday && (
                  <span className="mt-1 size-1 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista compacta */}
      {partidosDelDia.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Sin partidos este día.
        </p>
      ) : (
        <ul className="space-y-2">
          {partidosDelDia.map((partido) => (
            <li key={partido.id}>
              <CalendarioPartidoCard
                partido={partido}
                tienePronostico={Boolean(pronosticosGuardados[partido.id])}
                esPilot={pilotSet.has(partido.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CalendarioPartidoCard({
  partido,
  tienePronostico,
  esPilot = false,
}: {
  partido: Partido;
  tienePronostico: boolean;
  esPilot?: boolean;
}) {
  const hora = formatMexicoTime(partido.fecha_kickoff);
  const canal = getCanalDisplay(partido.canal_transmision);
  const enVivo = isPartidoEnVivo(partido.estatus);
  const grupo = partido.grupo ? `Grp ${partido.grupo}` : null;

  return (
    <Link
      href={`/partidos/${partido.id}`}
      className={`flex items-center gap-3 rounded-xl border bg-zinc-900/70 px-3 py-2.5 transition active:scale-[0.99] ${
        enVivo
          ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="w-11 shrink-0 text-center">
        <span className="text-xs font-bold tabular-nums text-emerald-400">{hora}</span>
        {enVivo && (
          <span className="mt-0.5 block text-[8px] font-bold uppercase text-red-400">
            Live
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Image
            src={getFlagImageUrl(
              partido.equipo_local_codigo,
              "w40",
              partido.equipo_local_nombre,
            )}
            alt=""
            width={28}
            height={18}
            className="h-4 w-6 shrink-0 rounded object-cover"
            unoptimized
          />
          <span className="truncate text-xs font-semibold text-white">
            {partido.equipo_local_nombre}
          </span>
          {partido.estatus === "finalizado" &&
          partido.marcador_local != null &&
          partido.marcador_visitante != null ? (
            <span className="shrink-0 font-mono text-xs font-bold text-zinc-300">
              {partido.marcador_local}-{partido.marcador_visitante}
            </span>
          ) : (
            <span className="shrink-0 text-[10px] text-zinc-600">vs</span>
          )}
          <Image
            src={getFlagImageUrl(
              partido.equipo_visitante_codigo,
              "w40",
              partido.equipo_visitante_nombre,
            )}
            alt=""
            width={28}
            height={18}
            className="h-4 w-6 shrink-0 rounded object-cover"
            unoptimized
          />
          <span className="truncate text-xs font-semibold text-white">
            {partido.equipo_visitante_nombre}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {esPilot && (
            <span className="rounded bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-400">
              Prueba
            </span>
          )}
          {grupo && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-zinc-400">
              {grupo}
            </span>
          )}
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${canal.className}`}
          >
            📺 {canal.label}
          </span>
        </div>
      </div>

      <PronosticoBadge guardado={tienePronostico} />
    </Link>
  );
}

function PronosticoBadge({ guardado }: { guardado: boolean }) {
  if (guardado) {
    return (
      <span
        className="flex shrink-0 flex-col items-center rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2 py-1.5"
        title="Pronóstico guardado"
      >
        <span className="text-sm leading-none">✓</span>
        <span className="mt-0.5 text-[8px] font-bold uppercase text-emerald-400">
          Listo
        </span>
      </span>
    );
  }

  return (
    <span
      className="flex shrink-0 flex-col items-center rounded-lg border border-amber-500/30 bg-amber-950/20 px-2 py-1.5"
      title="Pronóstico pendiente"
    >
      <span className="text-sm leading-none opacity-80">○</span>
      <span className="mt-0.5 text-[8px] font-bold uppercase text-amber-400/90">
        Falta
      </span>
    </span>
  );
}
