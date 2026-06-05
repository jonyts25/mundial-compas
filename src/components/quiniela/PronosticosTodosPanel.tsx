"use client";

import { useState, useTransition } from "react";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
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
