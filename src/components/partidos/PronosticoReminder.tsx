"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import type { Partido, PronosticoPartido } from "@/types/database";

interface PronosticoReminderProps {
  partido: Partido;
  pronostico: PronosticoPartido | null;
}

function ScoreDigit({ value }: { value: number }) {
  return (
    <span className="flex h-12 w-11 items-center justify-center rounded-lg bg-zinc-800/90 font-mono text-2xl font-black tabular-nums text-white shadow-inner ring-1 ring-zinc-700/80 sm:h-14 sm:w-12 sm:text-3xl">
      {value}
    </span>
  );
}

function MarcadorDigital({
  local,
  visitante,
  frozen = false,
}: {
  local: number;
  visitante: number;
  frozen?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 ${
        frozen ? "opacity-95" : ""
      }`}
    >
      <ScoreDigit value={local} />
      <span className="px-1 text-xs font-bold uppercase tracking-widest text-zinc-500 sm:text-sm">
        vs
      </span>
      <ScoreDigit value={visitante} />
    </div>
  );
}

function PronosticoAseguradoCard({
  partido,
  pronostico,
  bloqueado,
}: {
  partido: Partido;
  pronostico: PronosticoPartido;
  bloqueado: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border px-4 py-5 text-center shadow-lg ${
        bloqueado
          ? "border-zinc-600/50 bg-zinc-900/50"
          : "border-emerald-500/30 bg-gradient-to-b from-zinc-900/80 via-zinc-900/50 to-emerald-950/20"
      }`}
    >
      {!bloqueado && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent"
          aria-hidden
        />
      )}

      <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
        {bloqueado ? "🔒 Tu pronóstico asegurado" : "✓ Tu pronóstico asegurado"}
      </p>

      <div className="relative mt-4">
        <MarcadorDigital
          local={pronostico.goles_local}
          visitante={pronostico.goles_visitante}
          frozen={bloqueado}
        />
      </div>

      <p className="relative mt-3 truncate text-xs text-zinc-500">
        {partido.equipo_local_nombre}{" "}
        <span className="text-zinc-600">·</span> {partido.equipo_visitante_nombre}
      </p>

      {bloqueado ? (
        <p className="relative mt-2 text-[11px] font-medium text-zinc-500">
          Congelado · Quiniela bloqueada
        </p>
      ) : (
        <Link
          href="/quiniela"
          className="relative mt-4 inline-block rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-emerald-600/50 hover:text-emerald-300"
        >
          Modificar
        </Link>
      )}

      {bloqueado && pronostico.puntos > 0 && (
        <p className="relative mt-2 text-[10px] text-emerald-600/80">
          +{pronostico.puntos} pts en este partido
        </p>
      )}
    </section>
  );
}

export function PronosticoReminder({ partido, pronostico }: PronosticoReminderProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const bloqueado = isPronosticoLocked(partido.fecha_kickoff, nowMs);
  const tienePronostico = Boolean(pronostico);

  if (tienePronostico && pronostico) {
    return (
      <PronosticoAseguradoCard
        partido={partido}
        pronostico={pronostico}
        bloqueado={bloqueado}
      />
    );
  }

  if (!bloqueado) {
    return (
      <section className="rounded-2xl border border-dashed border-amber-600/40 bg-amber-950/20 px-4 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500/90">
          Sin pronóstico
        </p>
        <p className="mt-2 text-sm text-amber-100/90">
          Aún no tienes marcador para este partido.
        </p>
        <Link
          href="/quiniela"
          className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          Ir a la quiniela
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-red-900/30 bg-zinc-900/60 px-4 py-4 text-center">
      <p className="text-sm font-medium text-zinc-500">
        🚫 No registraste pronóstico para este juego
      </p>
      <p className="mt-1 text-xs text-red-400/70">Quiniela bloqueada</p>
    </section>
  );
}

