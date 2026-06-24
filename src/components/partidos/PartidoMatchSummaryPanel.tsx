"use client";

import { useState, useTransition } from "react";
import { MatchSummaryInputFacts } from "@/components/ai/MatchSummaryInputFacts";
import {
  parseMatchSummaryApiFailure,
  parseMatchSummaryInput,
} from "@/lib/ai/match-summary/match-summary-availability";
import type {
  MatchSummaryInput,
  MatchSummaryOutput,
} from "@/lib/ai/match-summary/match-summary-types";
import { getSummaryDisplayParagraphs } from "@/lib/ai/match-summary/match-summary-output-utils";
import {
  DEFAULT_NARRATOR_PERSONA_ID,
  type SportsNarratorPersonaId,
} from "@/lib/ai/sports-narrator-personas";
import { trackEvent } from "@/lib/analytics/track";

interface PartidoMatchSummaryPanelProps {
  partidoId: string;
  partidoLabel: string;
}

export function PartidoMatchSummaryPanel({
  partidoId,
  partidoLabel,
}: PartidoMatchSummaryPanelProps) {
  const [summary, setSummary] = useState<MatchSummaryOutput | null>(null);
  const [inputFacts, setInputFacts] = useState<MatchSummaryInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [isPending, startTransition] = useTransition();
  const personaId: SportsNarratorPersonaId = DEFAULT_NARRATOR_PERSONA_ID;

  function handleGenerate() {
    setError(null);
    setUnavailable(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/dev/ai/match-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partido_id: partidoId, persona_id: personaId }),
        });
        const data = (await res.json()) as Record<string, unknown>;

        if (!res.ok) {
          const failure = parseMatchSummaryApiFailure(data);
          if (failure.input) setInputFacts(failure.input);
          if (failure.unavailable) {
            setUnavailable(true);
            setError(failure.message);
            trackEvent("ai_summary_unavailable", {
              partido_id: partidoId,
              source: "match_detail",
              reason: failure.reason,
            });
            return;
          }
          setError(failure.message);
          return;
        }

        const output = data.match_summary_output as MatchSummaryOutput;
        const input = parseMatchSummaryInput(data.input);
        if (input) setInputFacts(input);
        setSummary(output);
      } catch {
        setUnavailable(true);
        setError(
          parseMatchSummaryApiFailure({}, true).message,
        );
        trackEvent("ai_summary_unavailable", {
          partido_id: partidoId,
          source: "match_detail",
          reason: "network",
        });
      }
    });
  }

  const showFacts = unavailable && inputFacts != null;

  return (
    <section className="rounded-2xl border border-dashed border-violet-600/40 bg-violet-950/10 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400/90">
            Lab IA · solo tú
          </p>
          <h2 className="mt-1 text-sm font-bold text-white">Resumen del partido</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{partidoLabel}</p>
        </div>
      </div>

      {!summary ? (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="mt-3 w-full rounded-lg border border-violet-600/50 bg-violet-900/30 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
        >
          {isPending ? "Generando…" : "Generar resumen IA"}
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <h3 className="text-base font-bold leading-snug text-white">
            {summary.headline}
          </h3>
          <p className="text-sm leading-relaxed text-zinc-300">{summary.lede}</p>
          {getSummaryDisplayParagraphs(summary).map((p) => (
            <p key={p.slice(0, 32)} className="text-sm leading-relaxed text-zinc-400">
              {p}
            </p>
          ))}
          {summary.facts.length > 0 && (
            <ul className="space-y-1 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              {summary.facts.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          )}
          {summary.table_impact && (
            <p className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-400">Tabla: </span>
              {summary.table_impact}
            </p>
          )}
          {summary.quiniela_impact && (
            <p className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-400">Quiniela: </span>
              {summary.quiniela_impact}
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="text-xs text-violet-400 hover:text-violet-300"
          >
            {isPending ? "Regenerando…" : "Regenerar resumen"}
          </button>
        </div>
      )}

      {unavailable && error && (
        <div
          className="mt-3 rounded-lg border border-amber-600/40 bg-amber-950/20 px-3 py-2.5"
          role="status"
        >
          <p className="text-sm text-amber-100/90">{error}</p>
        </div>
      )}

      {showFacts && (
        <div className="mt-3 border-t border-zinc-800/80 pt-3">
          <MatchSummaryInputFacts input={inputFacts} compact />
        </div>
      )}

      {!unavailable && error && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
