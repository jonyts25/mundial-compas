"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PitonisoCard } from "@/components/partidos/PitonisoCard";
import {
  TuPronosticoCard,
  type SavedPronosticoSnapshot,
} from "@/components/partidos/TuPronosticoCard";
import { trackEvent } from "@/lib/analytics/track";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import type { QuinielaContext } from "@/lib/queries/partido-quiniela-contexts";
import type { PitonisoStaticContext } from "@/lib/partidos/pitoniso-signals";
import type { Partido, PronosticoPartido } from "@/types/database";

interface PartidoPronosticoPitonisoBlockProps {
  partido: Partido;
  quinielaContexts: QuinielaContext[];
  pitonisoContext: PitonisoStaticContext | null;
}

function toPronosticoPartido(
  ctx: QuinielaContext | undefined,
): PronosticoPartido | null {
  if (!ctx?.pronostico) return null;
  return {
    id: "",
    goles_local: ctx.pronostico.golesLocal,
    goles_visitante: ctx.pronostico.golesVisitante,
    puntos: 0,
  };
}

export function PartidoPronosticoPitonisoBlock({
  partido,
  quinielaContexts: initialContexts,
  pitonisoContext,
}: PartidoPronosticoPitonisoBlockProps) {
  const [contexts, setContexts] = useState(initialContexts);
  const [selectedLigaId, setSelectedLigaId] = useState(
    () => initialContexts[0]?.ligaId ?? LIGA_GLOBAL_ID,
  );
  const [aggregatesRefreshKey, setAggregatesRefreshKey] = useState(0);
  const selectorShownTracked = useRef(false);

  const selectedContext = useMemo(
    () => contexts.find((c) => c.ligaId === selectedLigaId) ?? contexts[0],
    [contexts, selectedLigaId],
  );

  const multiLiga = contexts.length > 1;

  useEffect(() => {
    if (selectorShownTracked.current || contexts.length === 0) return;
    selectorShownTracked.current = true;
    trackEvent("match_liga_selector_shown", { ligas_count: contexts.length });
  }, [contexts.length]);

  function handleSelectLiga(ligaId: string) {
    if (ligaId === selectedLigaId) return;
    const ctx = contexts.find((c) => c.ligaId === ligaId);
    setSelectedLigaId(ligaId);
    trackEvent("match_liga_selected", {
      liga_id: ligaId,
      liga_scope: ctx?.ligaScope ?? "global",
    });
  }

  function handlePronosticoSaved(
    ligaId: string,
    snapshot: SavedPronosticoSnapshot,
  ) {
    setContexts((prev) =>
      prev.map((c) =>
        c.ligaId === ligaId
          ? {
              ...c,
              pronostico: {
                golesLocal: snapshot.goles_local,
                golesVisitante: snapshot.goles_visitante,
              },
            }
          : c,
      ),
    );
    setAggregatesRefreshKey((k) => k + 1);
  }

  if (!selectedContext) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pitonisoContext ? (
        <PitonisoCard
          staticContext={pitonisoContext}
          ligaId={selectedLigaId}
          aggregatesRefreshKey={aggregatesRefreshKey}
          compact
        />
      ) : null}

      {multiLiga ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Quiniela
          </p>
          <div className="-mx-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2" role="tablist" aria-label="Seleccionar quiniela">
              {contexts.map((ctx) => {
                const active = ctx.ligaId === selectedLigaId;
                return (
                  <button
                    key={ctx.ligaId}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSelectLiga(ctx.ligaId)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-zinc-600 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                    }`}
                  >
                    {ctx.ligaScope === "global" ? "Global" : ctx.ligaNombre}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-zinc-400">
        Guardando en:{" "}
        <span className="font-semibold text-zinc-200">
          {selectedContext.ligaNombre}
        </span>
      </p>

      <TuPronosticoCard
        key={selectedLigaId}
        partido={partido}
        pronostico={toPronosticoPartido(selectedContext)}
        ligaId={selectedLigaId}
        ligaScope={selectedContext.ligaScope}
        onPronosticoSaved={(snapshot) =>
          handlePronosticoSaved(selectedLigaId, snapshot)
        }
      />
    </div>
  );
}
