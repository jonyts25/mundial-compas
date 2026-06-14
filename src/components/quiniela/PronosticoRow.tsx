"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { PronosticosTodosPanel } from "@/components/quiniela/PronosticosTodosPanel";
import { SilenciarPartidoToggle } from "@/components/push/SilenciarPartidoToggle";
import { trackEvent } from "@/lib/analytics/track";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { formatMexicoKickoff } from "@/lib/datetime/mexico";
import { getEscudoFromMetadata } from "@/lib/partidos/escudos";
import { labelFase } from "@/lib/partidos/labels";
import { savePronostico } from "@/lib/quiniela/actions";
import {
  formatTimeUntilLock,
  isPronosticoLocked,
  QUINIELA_LOCK_MINUTES_BEFORE,
} from "@/lib/quiniela/lock";
import { getTeamImageUrl } from "@/lib/teams/flags";
import type { PronosticoUsuario } from "@/lib/quiniela/queries";
import type { Partido } from "@/types/database";

type ScoreValue = number | null;

interface PronosticoRowProps {
  partido: Partido;
  pronostico?: PronosticoUsuario;
  soloLectura?: boolean;
  ligaId?: string;
}

function initialScore(pronostico: PronosticoUsuario | undefined, side: "local" | "visitante"): ScoreValue {
  if (!pronostico) return null;
  return side === "local" ? pronostico.goles_local : pronostico.goles_visitante;
}

export function PronosticoRow({
  partido,
  pronostico,
  soloLectura = false,
  ligaId,
}: PronosticoRowProps) {
  const [local, setLocal] = useState<ScoreValue>(() => initialScore(pronostico, "local"));
  const [visitante, setVisitante] = useState<ScoreValue>(() =>
    initialScore(pronostico, "visitante"),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const locked =
    soloLectura || isPronosticoLocked(partido.fecha_kickoff, nowMs);
  const cierreLabel = formatTimeUntilLock(partido.fecha_kickoff, nowMs);
  const { fecha: fechaPartido, hora: horaPartido } = formatMexicoKickoff(
    partido.fecha_kickoff,
  );
  const savedLocal = pronostico ? pronostico.goles_local : null;
  const savedVisitante = pronostico ? pronostico.goles_visitante : null;
  const dirty = local !== savedLocal || visitante !== savedVisitante;
  const canSave =
    !locked && local !== null && visitante !== null && local >= 0 && visitante >= 0;

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setLocal(initialScore(pronostico, "local"));
    setVisitante(initialScore(pronostico, "visitante"));
  }, [pronostico?.goles_local, pronostico?.goles_visitante, pronostico]);

  function handleSave() {
    if (local === null || visitante === null) {
      setMessage("Ingresa ambos marcadores");
      return;
    }

    setMessage(null);
    const hadPronostico = Boolean(pronostico);
    startTransition(async () => {
      const result = await savePronostico(partido.id, local, visitante, ligaId);
      if (result.ok) {
        const liga_scope =
          !ligaId || ligaId === LIGA_GLOBAL_ID ? "global" : "grupo";
        if (hadPronostico) {
          trackEvent("prediction_updated", { liga_scope, partido_id: partido.id });
        } else {
          trackEvent("pronostico_saved", { liga_scope, partido_id: partido.id });
        }
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
        <div className="flex shrink-0 items-center gap-2">
          {locked ? (
            <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-400">
              🔒 Cerrado
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500">{cierreLabel}</span>
          )}
          <SilenciarPartidoToggle partidoId={partido.id} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamMini
          nombre={partido.equipo_local_nombre}
          codigo={partido.equipo_local_codigo}
          escudoUrl={getEscudoFromMetadata(partido.metadata, "local")}
        />

        <div className="flex items-center gap-1.5">
          <ScoreInput
            value={local}
            onChange={setLocal}
            disabled={locked}
            aria-label={`Goles ${partido.equipo_local_nombre}`}
          />
          <span className="px-0.5 text-sm font-bold text-zinc-500">vs</span>
          <ScoreInput
            value={visitante}
            onChange={setVisitante}
            disabled={locked}
            aria-label={`Goles ${partido.equipo_visitante_nombre}`}
          />
        </div>

        <TeamMini
          nombre={partido.equipo_visitante_nombre}
          codigo={partido.equipo_visitante_codigo}
          escudoUrl={getEscudoFromMetadata(partido.metadata, "visitante")}
          align="right"
        />
      </div>

      {!locked && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty || !canSave}
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

      {pronostico && locked && pronostico.puntos > 0 && (
        <p className="mt-2 text-center text-[10px] text-emerald-500/80">
          +{pronostico.puntos} pts en este partido
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

      <PronosticosTodosPanel partido={partido} ligaId={ligaId} />
    </article>
  );
}

function ScoreInput({
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: ScoreValue;
  onChange: (v: ScoreValue) => void;
  disabled: boolean;
  "aria-label": string;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder="—"
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        if (raw === "") {
          setDraft("");
          onChange(null);
          return;
        }
        const n = Number.parseInt(raw, 10);
        if (Number.isNaN(n)) return;
        const clamped = Math.min(20, n);
        setDraft(String(clamped));
        onChange(clamped);
      }}
      onBlur={() => {
        if (draft === "") {
          onChange(null);
        }
      }}
      className="h-14 w-14 rounded-xl border-2 border-zinc-700 bg-zinc-950 text-center text-2xl font-black tabular-nums text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
    />
  );
}

function TeamMini({
  nombre,
  codigo,
  escudoUrl,
  align = "left",
}: {
  nombre: string;
  codigo: string;
  escudoUrl?: string | null;
  align?: "left" | "right";
}) {
  const isEscudo = Boolean(escudoUrl?.trim());
  return (
    <div
      className={`flex flex-col gap-1 ${
        align === "right" ? "items-end text-right" : "items-start"
      }`}
    >
      <Image
        src={getTeamImageUrl(codigo, "w40", nombre, escudoUrl)}
        alt=""
        width={36}
        height={36}
        className={
          isEscudo
            ? "h-9 w-9 rounded object-contain shadow"
            : "h-6 w-9 rounded object-cover shadow"
        }
        unoptimized
      />
      <span className="max-w-[4.5rem] text-[10px] font-semibold leading-tight text-zinc-300">
        {nombre}
      </span>
    </div>
  );
}
