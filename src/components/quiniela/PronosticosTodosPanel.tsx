"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics/track";
import {
  computePickAggregates,
  outcomeLabel,
} from "@/lib/insights/pick-aggregates";
import {
  computePickValue,
  pickKindEmoji,
  pickKindLabel,
  pickRiskLabel,
  DISCLAIMER,
} from "@/lib/prediction-engine/pick-value";
import {
  fetchPronosticosPartidoTodos,
  type PronosticoParticipante,
} from "@/lib/quiniela/pronosticos-partido-action";
import type { Partido } from "@/types/database";

interface PronosticosTodosPanelProps {
  partido: Partido;
  ligaId?: string;
}

export function PronosticosTodosPanel({
  partido,
  ligaId = LIGA_GLOBAL_ID,
}: PronosticosTodosPanelProps) {
  const [abierto, setAbierto] = useState(false);
  const [participantes, setParticipantes] = useState<PronosticoParticipante[] | null>(
    null,
  );
  const [resultadoReal, setResultadoReal] = useState<{
    local: number;
    visitante: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const aggregates = useMemo(
    () =>
      participantes ? computePickAggregates(participantes, resultadoReal) : null,
    [participantes, resultadoReal],
  );

  const pickValue = useMemo(() => {
    if (!aggregates || !aggregates.userScore || aggregates.total === 0) {
      return null;
    }
    return computePickValue(aggregates, aggregates.userScore, {
      context: {
        homeName: partido.equipo_local_nombre,
        awayName: partido.equipo_visitante_nombre,
      },
    });
  }, [aggregates, partido.equipo_local_nombre, partido.equipo_visitante_nombre]);

  const pickValueTracked = useRef(false);
  useEffect(() => {
    if (!abierto || pickValueTracked.current) return;
    if (!pickValue || !pickValue.sampleOk) return;
    pickValueTracked.current = true;
    trackEvent("pick_value_shown", {
      liga_scope: ligaId === LIGA_GLOBAL_ID ? "global" : "grupo",
      kind: pickValue.kind,
      risk: pickValue.risk,
    });
  }, [abierto, pickValue, ligaId]);

  if (partido.estatus !== "finalizado") {
    return null;
  }

  function toggle() {
    if (abierto) {
      setAbierto(false);
      return;
    }

    if (participantes) {
      setAbierto(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await fetchPronosticosPartidoTodos(partido.id, ligaId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setParticipantes(result.participantes);
      setResultadoReal(result.resultadoReal);
      setAbierto(true);
    });
  }

  return (
    <div className="mt-3 border-t border-zinc-800/80 pt-3">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-emerald-600/40 hover:bg-zinc-800 disabled:opacity-50"
      >
        {isPending
          ? "Cargando…"
          : abierto
            ? "Ocultar predicciones"
            : "Predicciones de todos"}
      </button>

      {error && (
        <p className="mt-2 text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      {abierto && participantes && (
        <div className="mt-3 space-y-2">
          {resultadoReal && (
            <p className="text-center text-xs text-zinc-400">
              Resultado real:{" "}
              <span className="font-bold tabular-nums text-white">
                {resultadoReal.local}-{resultadoReal.visitante}
              </span>
            </p>
          )}

          {aggregates && aggregates.total > 0 && (
            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="grid grid-cols-2 gap-2">
                {aggregates.mostPopularScore && (
                  <div className="rounded-lg bg-zinc-950/60 px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Marcador más elegido
                    </p>
                    <p className="mt-0.5 text-sm font-black tabular-nums text-white">
                      {aggregates.mostPopularScore.local}-
                      {aggregates.mostPopularScore.visitante}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-400">
                      {aggregates.mostPopularScore.pct}%
                    </p>
                  </div>
                )}
                {aggregates.mostPopularOutcome && (
                  <div className="rounded-lg bg-zinc-950/60 px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Resultado más elegido
                    </p>
                    <p className="mt-0.5 text-sm font-black text-white">
                      {outcomeLabel(aggregates.mostPopularOutcome.outcome)}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-400">
                      {aggregates.mostPopularOutcome.pct}%
                    </p>
                  </div>
                )}
              </div>

              {aggregates.userScore && aggregates.userScoreSharePct != null && (
                <p className="text-center text-xs text-zinc-400">
                  Solo el{" "}
                  <span className="font-bold text-white">
                    {aggregates.userScoreSharePct}%
                  </span>{" "}
                  eligió tu marcador{" "}
                  <span className="font-semibold tabular-nums text-zinc-300">
                    ({aggregates.userScore.local}-{aggregates.userScore.visitante})
                  </span>
                </p>
              )}

              {aggregates.exactMatchPct != null && (
                <p className="text-center text-xs text-zinc-400">
                  Solo el{" "}
                  <span className="font-bold text-emerald-400">
                    {aggregates.exactMatchPct}%
                  </span>{" "}
                  acertó el marcador exacto
                  {aggregates.userMatchedExact ? " · ¡tú incluido! 🎯" : ""}
                </p>
              )}
            </div>
          )}

          {pickValue && pickValue.sampleOk && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <p className="text-center text-xs font-semibold text-zinc-200">
                {pickKindEmoji(pickValue.kind)} {pickKindLabel(pickValue.kind)} ·{" "}
                {pickRiskLabel(pickValue.risk)}
              </p>
              <p className="mt-1 text-center text-xs text-zinc-400">
                {pickValue.message}
              </p>
              <p className="mt-1 text-center text-[10px] text-zinc-600">
                {DISCLAIMER}
              </p>
            </div>
          )}

          {participantes.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Nadie registró pronóstico para este partido.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
              {participantes.map((p) => {
                const acertoExacto =
                  resultadoReal != null &&
                  p.golesLocal === resultadoReal.local &&
                  p.golesVisitante === resultadoReal.visitante;

                return (
                  <li
                    key={p.usuarioId}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                      p.esYo
                        ? "bg-emerald-950/40 ring-1 ring-emerald-600/30"
                        : "bg-zinc-900/50"
                    }`}
                  >
                    <span
                      className={`min-w-0 truncate font-medium ${
                        p.esYo ? "text-emerald-300" : "text-zinc-200"
                      }`}
                    >
                      {p.nombreVisible}
                      {p.esYo ? " (tú)" : ""}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 tabular-nums">
                      <span className="font-bold text-white">
                        {p.golesLocal}-{p.golesVisitante}
                      </span>
                      {acertoExacto && (
                        <span className="text-[10px] font-bold text-emerald-400">
                          🎯
                        </span>
                      )}
                      <span
                        className={`w-8 text-right text-xs font-semibold ${
                          p.puntos > 0 ? "text-emerald-400" : "text-zinc-600"
                        }`}
                      >
                        {p.puntos}pt
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
