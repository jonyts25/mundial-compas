"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics/track";
import { computePickAggregates } from "@/lib/insights/pick-aggregates";
import type {
  PitonisoSignalSummary,
  PitonisoStaticContext,
} from "@/lib/partidos/pitoniso-signals";
import {
  analyzePitonisoSignalContradictionWithCrowd,
  leaderFromCrowdOutcomes,
  toMatchPreviewPhaseFlags,
} from "@/lib/partidos/pitoniso-signals";
import { computeMatchPreviewVerdict } from "@/lib/prediction-engine/match-preview";
import {
  buildPitonisoMessage,
  favoriteDisplayName,
  PITONISO_DISCLAIMER_LONG,
  PITONISO_DISCLAIMER_SHORT,
} from "@/lib/prediction-engine/pitoniso-message";
import { computePickValue } from "@/lib/prediction-engine/pick-value";
import { fetchPronosticosPartidoAgregados } from "@/lib/quiniela/pronosticos-agregados-action";

interface PitonisoCardProps {
  staticContext: PitonisoStaticContext;
  ligaId?: string;
  /** Incrementar tras guardar pronóstico para refrescar agregados de multitud. */
  aggregatesRefreshKey?: number;
}

function contradictionExtraLine(summary: PitonisoSignalSummary): string | null {
  switch (summary) {
    case "crowd_vs_form":
      return "El Pitoniso no está tan convencido como la multitud.";
    case "crowd_vs_table":
      return "La multitud ve una cosa, pero la tabla cuenta otra historia.";
    case "table_vs_form":
      return "La tabla dice una cosa, la forma reciente otra.";
    case "mixed":
      return "Las señales están cruzadas: multitud, tabla y forma no cuentan la misma historia.";
    default:
      return null;
  }
}

/** Renderiza copy con **negritas** sin HTML crudo. */
function PitonisoMessageBody({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-sm leading-relaxed text-zinc-300">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-zinc-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function PitonisoCard({
  staticContext,
  ligaId = LIGA_GLOBAL_ID,
  aggregatesRefreshKey = 0,
}: PitonisoCardProps) {
  const [picksLoaded, setPicksLoaded] = useState(false);
  const [aggError, setAggError] = useState<string | null>(null);
  const [picks, setPicks] = useState<{ golesLocal: number; golesVisitante: number }[]>(
    [],
  );
  const [expanded, setExpanded] = useState(false);
  const shownTracked = useRef(false);
  const expandedTracked = useRef(false);

  const partidoId = staticContext.partido.id;
  const ligaScope = ligaId === LIGA_GLOBAL_ID ? "global" : "grupo";

  const loadAggregates = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setPicksLoaded(false);
    }
    setAggError(null);
    const result = await fetchPronosticosPartidoAgregados(partidoId, ligaId);
    if (result.ok) {
      setPicks(result.picks);
    } else {
      setAggError(result.error);
      setPicks([]);
    }
    setPicksLoaded(true);
  }, [partidoId, ligaId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await fetchPronosticosPartidoAgregados(partidoId, ligaId);
      if (cancelled) return;
      if (result.ok) {
        setPicks(result.picks);
        setAggError(null);
      } else {
        setAggError(result.error);
        setPicks([]);
      }
      setPicksLoaded(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [partidoId, ligaId, aggregatesRefreshKey]);

  const computed = useMemo(() => {
    if (!picksLoaded) return null;

    const aggregates = computePickAggregates(picks, null);
    const verdict = computeMatchPreviewVerdict({
      aggregates,
      local: staticContext.local.teamInput,
      visitante: staticContext.visitante.teamInput,
      ...toMatchPreviewPhaseFlags(staticContext.phase),
    });

    const top = aggregates.mostPopularScore;
    const pickValueTop = top
      ? computePickValue(aggregates, { local: top.local, visitante: top.visitante }, {
          context: {
            homeName: staticContext.partido.equipoLocalNombre,
            awayName: staticContext.partido.equipoVisitanteNombre,
          },
        })
      : null;

    const crowdLeader =
      aggregates.total > 0
        ? leaderFromCrowdOutcomes(
            aggregates.outcomes.find((o) => o.outcome === "local")?.pct ?? 0,
            aggregates.outcomes.find((o) => o.outcome === "empate")?.pct ?? 0,
            aggregates.outcomes.find((o) => o.outcome === "visitante")?.pct ?? 0,
          )
        : null;

    const signalContradiction = analyzePitonisoSignalContradictionWithCrowd(
      {
        table: staticContext.signalLeaders.table,
        form: staticContext.signalLeaders.form,
      },
      crowdLeader,
    );

    const pitonisoMessage = buildPitonisoMessage({
      verdict,
      homeName: staticContext.partido.equipoLocalNombre,
      awayName: staticContext.partido.equipoVisitanteNombre,
      pickValueTop,
      localTablePosition: staticContext.local.standing?.position ?? null,
      awayTablePosition: staticContext.visitante.standing?.position ?? null,
      localFormDebut: staticContext.local.formDebut,
      awayFormDebut: staticContext.visitante.formDebut,
      isLastGroupMatch: staticContext.phase.isLastGroupMatch,
    });

    const extraLine = contradictionExtraLine(signalContradiction.summary);

    return {
      aggregates,
      verdict,
      pitonisoMessage,
      signalContradiction,
      extraLine,
      popularScore: top,
    };
  }, [picks, picksLoaded, staticContext]);

  useEffect(() => {
    if (!computed || shownTracked.current || aggError) return;
    shownTracked.current = true;
    trackEvent("pitoniso_shown", {
      partido_id: partidoId,
      liga_scope: ligaScope,
      confidence: computed.verdict.confidence,
      favorite: computed.verdict.favorite,
      crowd_sample_ok: computed.verdict.crowdSampleOk,
    });
  }, [computed, partidoId, ligaScope, aggError]);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      if (next && !expandedTracked.current) {
        expandedTracked.current = true;
        trackEvent("pitoniso_expanded", { partido_id: partidoId });
      }
      return next;
    });
  }

  if (staticContext.partido.estatus !== "programado") {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-violet-500/25 bg-zinc-900/40 px-4 py-3 shadow-sm"
      aria-label="El Pitoniso"
    >
      <div className="flex items-start gap-2">
        <span className="text-lg" aria-hidden>
          🔮
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-violet-200">
            ¿Qué dice El Pitoniso?
          </h2>

          {!picksLoaded && (
            <p className="mt-2 text-sm text-zinc-500">
              El Pitoniso está leyendo las señales…
            </p>
          )}

          {picksLoaded && computed && (
            <>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-300/90">
                <span aria-hidden>{computed.pitonisoMessage.confidenceEmoji}</span>
                {computed.pitonisoMessage.confidenceLabel}
              </p>

              <div className="mt-2 space-y-2">
                <PitonisoMessageBody text={computed.pitonisoMessage.message} />
                {computed.extraLine && (
                  <p className="text-sm italic text-violet-200/80">
                    {computed.extraLine}
                  </p>
                )}
              </div>

              <dl className="mt-3 space-y-1 text-xs text-zinc-400">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-zinc-500">Inclinación:</dt>
                  <dd className="font-medium text-zinc-200">
                    {favoriteDisplayName(
                      computed.verdict.favorite,
                      staticContext.partido.equipoLocalNombre,
                      staticContext.partido.equipoVisitanteNombre,
                    )}
                  </dd>
                </div>
                {computed.popularScore && computed.verdict.crowdSampleOk && (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-zinc-500">Marcador más repetido en la quiniela:</dt>
                    <dd className="font-medium tabular-nums text-zinc-200">
                      {computed.popularScore.local}-{computed.popularScore.visitante} (
                      {computed.popularScore.pct}%)
                    </dd>
                  </div>
                )}
              </dl>

              {aggError && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2">
                  <p className="text-xs text-amber-200/90">
                    No se pudo cargar la quiniela completa. Mostrando señales del
                    torneo.
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadAggregates(true)}
                    className="mt-1 text-xs font-semibold text-amber-300 underline hover:text-amber-200"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              <p className="mt-3 text-[10px] leading-snug text-zinc-500">
                {PITONISO_DISCLAIMER_SHORT}
              </p>

              <button
                type="button"
                onClick={toggleExpanded}
                className="mt-2 text-[10px] font-semibold text-violet-400/90 hover:text-violet-300"
                aria-expanded={expanded}
              >
                {expanded ? "Ocultar detalle ▴" : "¿Qué es El Pitoniso? ▾"}
              </button>
              {expanded && (
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  {PITONISO_DISCLAIMER_LONG}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
