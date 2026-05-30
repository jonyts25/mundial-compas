"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { savePronostico } from "@/lib/quiniela/actions";
import {
  formatTimeUntilLock,
  isPronosticoLocked,
  QUINIELA_LOCK_MINUTES_BEFORE,
} from "@/lib/quiniela/lock";
import { formatMexicoKickoff } from "@/lib/datetime/mexico";
import { getFlagImageUrl } from "@/lib/teams/flags";
import { labelFase } from "@/lib/partidos/labels";
import type { PronosticoUsuario } from "@/lib/quiniela/queries";
import type { Partido } from "@/types/database";

interface PronosticoRowProps {
  partido: Partido;
  pronostico?: PronosticoUsuario;
  soloLectura?: boolean;
}

export function PronosticoRow({
  partido,
  pronostico,
  soloLectura = false,
}: PronosticoRowProps) {
  const [local, setLocal] = useState(pronostico?.goles_local ?? 0);
  const [visitante, setVisitante] = useState(pronostico?.goles_visitante ?? 0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const locked =
    soloLectura || isPronosticoLocked(partido.fecha_kickoff, nowMs);
  const cierreLabel = formatTimeUntilLock(partido.fecha_kickoff, nowMs);
  const { fecha: fechaPartido, hora: horaPartido } = formatMexicoKickoff(
    partido.fecha_kickoff,
  );
  const dirty =
    local !== (pronostico?.goles_local ?? 0) ||
    visitante !== (pronostico?.goles_visitante ?? 0);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setLocal(pronostico?.goles_local ?? 0);
    setVisitante(pronostico?.goles_visitante ?? 0);
  }, [pronostico?.goles_local, pronostico?.goles_visitante]);

  function clampScore(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(20, Math.max(0, Math.floor(value)));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await savePronostico(partido.id, local, visitante);
      if (result.ok) {
        setMessage("Guardado ✓");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        locked
          ? "border-zinc-700/80 bg-zinc-900/40 opacity-90"
          : "border-zinc-800 bg-zinc-900/70"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500/90">
            {labelFase(partido.fase)}
            {partido.grupo ? ` · Grp ${partido.grupo}` : ""}
          </p>
          <p className="text-xs text-zinc-400">
            {fechaPartido} · {horaPartido} CDMX
          </p>
        </div>
        {locked ? (
          <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-400">
            🔒 Cerrado
          </span>
        ) : (
          <span className="text-[10px] text-zinc-500">{cierreLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamMini
          nombre={partido.equipo_local_nombre}
          codigo={partido.equipo_local_codigo}
        />

        <div className="flex items-center gap-1.5">
          <ScoreInput
            value={local}
            onChange={(v) => setLocal(clampScore(v))}
            disabled={locked}
            aria-label={`Goles ${partido.equipo_local_nombre}`}
          />
          <span className="px-0.5 text-sm font-bold text-zinc-500">vs</span>
          <ScoreInput
            value={visitante}
            onChange={(v) => setVisitante(clampScore(v))}
            disabled={locked}
            aria-label={`Goles ${partido.equipo_visitante_nombre}`}
          />
        </div>

        <TeamMini
          nombre={partido.equipo_visitante_nombre}
          codigo={partido.equipo_visitante_codigo}
          align="right"
        />
      </div>

      {!locked && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Guardando…" : pronostico ? "Actualizar pronóstico" : "Guardar pronóstico"}
        </button>
      )}

      {locked && (
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          Candado activo: {QUINIELA_LOCK_MINUTES_BEFORE} min antes del pitazo o partido
          iniciado.
        </p>
      )}

      {pronostico && !locked && (
        <p className="mt-2 text-center text-[10px] text-zinc-600">
          Puntos al cierre: {pronostico.puntos} (máx. 3 por acierto)
        </p>
      )}

      {message && (
        <p
          className={`mt-2 text-center text-xs ${
            message.startsWith("Guardado") ? "text-emerald-400" : "text-red-400"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </article>
  );
}

function ScoreInput({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  "aria-label": string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min={0}
      max={20}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? 0 : Number(raw));
      }}
      className="h-14 w-14 rounded-xl border-2 border-zinc-700 bg-zinc-950 text-center text-2xl font-black tabular-nums text-white outline-none [appearance:textfield] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

function TeamMini({
  nombre,
  codigo,
  align = "left",
}: {
  nombre: string;
  codigo: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-col gap-1 ${
        align === "right" ? "items-end text-right" : "items-start"
      }`}
    >
      <Image
        src={getFlagImageUrl(codigo, "w40", nombre)}
        alt=""
        width={36}
        height={24}
        className="h-6 w-9 rounded object-cover shadow"
        unoptimized
      />
      <span className="max-w-[4.5rem] text-[10px] font-semibold leading-tight text-zinc-300">
        {nombre}
      </span>
    </div>
  );
}
