"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMatchClockDisplay } from "@/hooks/useMatchClock";
import type { EstatusPartido } from "@/types/database";

export interface PartidoLiveState {
  partidoId: string;
  marcadorLocal: number | null;
  marcadorVisitante: number | null;
  estatus: EstatusPartido;
  minutoActual: number | null;
  metadata?: Record<string, unknown> | null;
  fechaKickoff?: string;
}

interface PartidoRowUpdate {
  marcador_local?: number | null;
  marcador_visitante?: number | null;
  minuto_actual?: number | null;
  estatus?: EstatusPartido;
  metadata?: Record<string, unknown> | null;
}

function mapRowToLiveState(
  row: PartidoRowUpdate,
  prev: PartidoLiveState,
): PartidoLiveState {
  return {
    partidoId: prev.partidoId,
    marcadorLocal:
      row.marcador_local !== undefined ? row.marcador_local : prev.marcadorLocal,
    marcadorVisitante:
      row.marcador_visitante !== undefined
        ? row.marcador_visitante
        : prev.marcadorVisitante,
    estatus: row.estatus ?? prev.estatus,
    minutoActual:
      row.minuto_actual !== undefined ? row.minuto_actual : prev.minutoActual,
    metadata:
      row.metadata !== undefined ? row.metadata : prev.metadata,
    fechaKickoff: prev.fechaKickoff,
  };
}

/**
 * Suscripción Realtime a UPDATE en public.partidos filtrado por id.
 */
export function usePartidoRealtime(initial: PartidoLiveState): PartidoLiveState {
  const [live, setLive] = useState<PartidoLiveState>(initial);

  useEffect(() => {
    setLive(initial);
  }, [
    initial.partidoId,
    initial.marcadorLocal,
    initial.marcadorVisitante,
    initial.estatus,
    initial.minutoActual,
    initial.metadata,
    initial.fechaKickoff,
  ]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`partido:${initial.partidoId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partidos",
          filter: `id=eq.${initial.partidoId}`,
        },
        (payload) => {
          const row = payload.new as PartidoRowUpdate;
          setLive((prev) => mapRowToLiveState(row, prev));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [initial.partidoId]);

  return live;
}

interface MarcadorDisplayProps {
  live: PartidoLiveState;
  animateOnChange?: boolean;
}

/** UI del marcador con reloj local que avanza entre syncs de la API. */
export function MarcadorDisplay({
  live,
  animateOnChange = true,
}: MarcadorDisplayProps) {
  const prevScore = useRef(`${live.marcadorLocal}-${live.marcadorVisitante}`);
  const [pulse, setPulse] = useState(false);
  const clock = useMatchClockDisplay({
    estatus: live.estatus,
    minutoActual: live.minutoActual,
    metadata: live.metadata,
    fechaKickoff: live.fechaKickoff,
  });

  useEffect(() => {
    const key = `${live.marcadorLocal}-${live.marcadorVisitante}`;
    if (animateOnChange && key !== prevScore.current) {
      prevScore.current = key;
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 600);
      return () => window.clearTimeout(t);
    }
    prevScore.current = key;
  }, [live.marcadorLocal, live.marcadorVisitante, animateOnChange]);

  const enVivo =
    live.estatus === "en_vivo" || live.estatus === "medio_tiempo";
  const local = live.marcadorLocal ?? 0;
  const visitante = live.marcadorVisitante ?? 0;

  return (
    <div
      data-partido-id={live.partidoId}
      data-live-score-root
      data-estatus={live.estatus}
      className="flex flex-col items-center"
      aria-live={enVivo ? "polite" : "off"}
    >
      <div
        className={`flex items-center gap-3 font-mono text-3xl font-black tabular-nums text-white transition-transform duration-300 ${
          pulse ? "scale-110 text-emerald-300" : ""
        }`}
      >
        <span data-score-local>{local}</span>
        <span className="text-lg text-zinc-500">:</span>
        <span data-score-visitante>{visitante}</span>
      </div>
      {clock.text && (
        <span
          data-match-minute
          className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            clock.text.includes("penal") || live.estatus === "medio_tiempo"
              ? "text-amber-400"
              : "text-emerald-400"
          }`}
        >
          {clock.text}
        </span>
      )}
      {clock.penaltyLine && (
        <span
          data-penalty-score
          className="mt-0.5 font-mono text-sm font-bold tabular-nums text-amber-300"
        >
          ({clock.penaltyLine})
        </span>
      )}
    </div>
  );
}

type MarcadorLiveProps = PartidoLiveState & { animateOnChange?: boolean };

export function MarcadorLive({
  animateOnChange = true,
  ...initial
}: MarcadorLiveProps) {
  const live = usePartidoRealtime(initial);
  return <MarcadorDisplay live={live} animateOnChange={animateOnChange} />;
}
