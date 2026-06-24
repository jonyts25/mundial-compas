"use client";

import { useState, useTransition } from "react";
import {
  DEFAULT_NARRATOR_PERSONA_ID,
  type SportsNarratorPersonaId,
} from "@/lib/ai/sports-narrator-personas";
import type { MatchSummaryOutput } from "@/lib/ai/match-summary/match-summary-types";

interface PartidoMatchSummaryPanelProps {
  partidoId: string;
  partidoLabel: string;
}

export function PartidoMatchSummaryPanel({
  partidoId,
  partidoLabel,
}: PartidoMatchSummaryPanelProps) {
  const [summary, setSummary] = useState<MatchSummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const personaId: SportsNarratorPersonaId = DEFAULT_NARRATOR_PERSONA_ID;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/dev/ai/match-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partido_id: partidoId, persona_id: personaId }),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          setError(
            typeof data.error === "string" ? data.error : `Error ${res.status}`,
          );
          return;
        }
        const output = data.match_summary_output as MatchSummaryOutput;
        setSummary(output);
      } catch {
        setError("No se pudo generar el resumen");
      }
    });
  }

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
          {summary.body_paragraphs.map((p) => (
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

      {error && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
