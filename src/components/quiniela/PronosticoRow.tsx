"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { KnockoutQuinielaRulesHint } from "@/components/quiniela/KnockoutQuinielaRulesHint";
import { ScoreInput, type ScoreValue } from "@/components/quiniela/ScoreInput";
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
import { resolvePronosticoPuntosForPartido } from "@/lib/quiniela/knockout-rounds";
import {
  areBothTeamsConfirmed,
  isKnockoutPartido,
  isKnockoutPronosticable,
  knockoutTeamDisplayLabel,
} from "@/lib/world-cup/knockout-participant-utils";
import { getTeamImageUrl } from "@/lib/teams/flags";
import type { PronosticoUsuario } from "@/lib/quiniela/queries";
import type { Partido } from "@/types/database";

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
  const teamsPending =
    isKnockoutPartido(partido) && !areBothTeamsConfirmed(partido);
  const pronosticable = isKnockoutPronosticable(partido);
  const inputLocked = locked || !pronosticable;
  const localLabel = knockoutTeamDisplayLabel(
    partido.equipo_local_nombre,
    partido.equipo_local_codigo,
  );
  const awayLabel = knockoutTeamDisplayLabel(
    partido.equipo_visitante_nombre,
    partido.equipo_visitante_codigo,
  );
  const cierreLabel = formatTimeUntilLock(partido.fecha_kickoff, nowMs);
  const { fecha: fechaPartido, hora: horaPartido } = formatMexicoKickoff(
    partido.fecha_kickoff,
  );
  const savedLocal = pronostico ? pronostico.goles_local : null;
  const savedVisitante = pronostico ? pronostico.goles_visitante : null;
  const dirty = local !== savedLocal || visitante !== savedVisitante;
  const canSave =
    !inputLocked &&
    pronosticable &&
    local !== null &&
    visitante !== null &&
    local >= 0 &&
    visitante >= 0;
  const puntosPartido = resolvePronosticoPuntosForPartido(partido, pronostico);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

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
        inputLocked
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
          ) : teamsPending ? (
            <span className="rounded-full bg-amber-900/40 px-2 py-1 text-[10px] font-bold text-amber-300/90">
              Equipos TBD
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500">{cierreLabel}</span>
          )}
          <SilenciarPartidoToggle partidoId={partido.id} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamMini
          nombre={localLabel}
          codigo={partido.equipo_local_codigo}
          escudoUrl={getEscudoFromMetadata(partido.metadata, "local")}
        />

        <div className="flex items-center gap-1.5">
          <ScoreInput
            key={`local-${savedLocal ?? "none"}`}
            value={local}
            onChange={setLocal}
            disabled={inputLocked}
            aria-label={`Goles ${localLabel}`}
          />
          <span className="px-0.5 text-sm font-bold text-zinc-500">vs</span>
          <ScoreInput
            key={`away-${savedVisitante ?? "none"}`}
            value={visitante}
            onChange={setVisitante}
            disabled={inputLocked}
            aria-label={`Goles ${awayLabel}`}
          />
        </div>

        <TeamMini
          nombre={awayLabel}
          codigo={partido.equipo_visitante_codigo}
          escudoUrl={getEscudoFromMetadata(partido.metadata, "visitante")}
          align="right"
        />
      </div>

      {teamsPending && !locked && (
        <p className="mt-3 text-center text-[11px] text-amber-300/80">
          Pronóstico disponible cuando se confirmen ambos equipos.
        </p>
      )}

      {pronosticable && !locked && isKnockoutPartido(partido) && (
        <KnockoutQuinielaRulesHint partido={partido} className="mt-3 text-center" />
      )}

      {!inputLocked && (
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
          Puntos al cierre: {puntosPartido} (máx. 3 por acierto)
        </p>
      )}

      {pronostico && locked && puntosPartido > 0 && (
        <p className="mt-2 text-center text-[10px] text-emerald-500/80">
          +{puntosPartido} pts en este partido
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
