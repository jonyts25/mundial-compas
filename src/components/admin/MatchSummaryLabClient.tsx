"use client";

import { useState, useTransition } from "react";
import { MatchSummaryInputFacts } from "@/components/ai/MatchSummaryInputFacts";
import {
  parseMatchSummaryApiFailure,
  parseMatchSummaryInput,
} from "@/lib/ai/match-summary/match-summary-availability";
import type { MatchSummaryInput } from "@/lib/ai/match-summary/match-summary-types";
import {
  DEFAULT_NARRATOR_PERSONA_ID,
  listSportsNarratorPersonas,
  type SportsNarratorPersonaId,
} from "@/lib/ai/sports-narrator-personas";
import { trackEvent } from "@/lib/analytics/track";

export function MatchSummaryLabClient() {
  const personas = listSportsNarratorPersonas();
  const [partidoId, setPartidoId] = useState("");
  const [personaId, setPersonaId] = useState<SportsNarratorPersonaId>(
    DEFAULT_NARRATOR_PERSONA_ID,
  );
  const [inputFacts, setInputFacts] = useState<MatchSummaryInput | null>(null);
  const [inputJson, setInputJson] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    setUnavailable(false);
    setInputJson(null);
    setInputFacts(null);
    setOutput(null);

    const id = partidoId.trim();
    if (!id) {
      setError("Indica el partido_id (UUID)");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/dev/ai/match-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partido_id: id, persona_id: personaId }),
        });
        const text = await res.text();
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(text) as Record<string, unknown>;
        } catch {
          setError(`Respuesta no JSON (${res.status})`);
          setOutput(text.slice(0, 800));
          return;
        }

        const input = parseMatchSummaryInput(data.input);
        if (input) {
          setInputFacts(input);
          setInputJson(JSON.stringify(input, null, 2));
        }

        if (!res.ok) {
          const failure = parseMatchSummaryApiFailure(data);
          if (failure.unavailable) {
            setUnavailable(true);
            setError(failure.message);
            trackEvent("ai_summary_unavailable", {
              partido_id: id,
              source: "admin_lab",
              reason: failure.reason,
            });
          } else {
            setError(failure.message);
          }
          setOutput(JSON.stringify(data, null, 2));
          return;
        }

        const summary = data.match_summary_output ?? data;
        setOutput(JSON.stringify(summary, null, 2));
      } catch {
        const failure = parseMatchSummaryApiFailure({}, true);
        setUnavailable(true);
        setError(failure.message);
        trackEvent("ai_summary_unavailable", {
          partido_id: id,
          source: "admin_lab",
          reason: "network",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="match-summary-partido-id"
          className="block text-xs font-medium text-zinc-400"
        >
          partido_id
        </label>
        <input
          id="match-summary-partido-id"
          type="text"
          value={partidoId}
          onChange={(e) => setPartidoId(e.target.value)}
          placeholder="UUID del partido finalizado"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label
          htmlFor="match-summary-persona"
          className="block text-xs font-medium text-zinc-400"
        >
          Voz narrativa (ficticia)
        </label>
        <select
          id="match-summary-persona"
          value={personaId}
          onChange={(e) =>
            setPersonaId(e.target.value as SportsNarratorPersonaId)
          }
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} — {p.signature.slice(0, 48)}…
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="w-full rounded-lg border border-violet-600/50 bg-violet-900/30 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
      >
        {isPending ? "Generando resumen…" : "Generar resumen IA"}
      </button>

      {unavailable && error && (
        <div
          className="rounded-lg border border-amber-600/40 bg-amber-950/20 px-3 py-2.5"
          role="status"
        >
          <p className="text-sm text-amber-100/90">{error}</p>
        </div>
      )}

      {!unavailable && error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {inputFacts && (unavailable || output) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-xs font-semibold text-zinc-400">
            Datos del partido (sin IA)
          </p>
          <div className="mt-2">
            <MatchSummaryInputFacts input={inputFacts} compact />
          </div>
        </div>
      )}

      {inputJson && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-xs font-semibold text-zinc-400">
            Input generado (builder)
          </p>
          <pre className="mt-2 max-h-64 overflow-auto text-[11px] leading-relaxed text-zinc-300">
            {inputJson}
          </pre>
        </div>
      )}

      {output && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-xs font-semibold text-zinc-400">
            Output IA (lab — no se guarda en DB)
          </p>
          <pre className="mt-2 max-h-96 overflow-auto text-[11px] leading-relaxed text-emerald-200/90">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
