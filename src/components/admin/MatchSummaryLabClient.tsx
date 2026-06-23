"use client";

import { useState, useTransition } from "react";
import {
  DEFAULT_NARRATOR_PERSONA_ID,
  listSportsNarratorPersonas,
  type SportsNarratorPersonaId,
} from "@/lib/ai/sports-narrator-personas";

export function MatchSummaryLabClient() {
  const personas = listSportsNarratorPersonas();
  const [partidoId, setPartidoId] = useState("");
  const [personaId, setPersonaId] = useState<SportsNarratorPersonaId>(
    DEFAULT_NARRATOR_PERSONA_ID,
  );
  const [inputJson, setInputJson] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    setInputJson(null);
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

        if (!res.ok) {
          const msg =
            typeof data.error === "string" ? data.error : `Error ${res.status}`;
          setError(msg);
          if (data.input) {
            setInputJson(JSON.stringify(data.input, null, 2));
          }
          setOutput(JSON.stringify(data, null, 2));
          return;
        }

        if (data.input) {
          setInputJson(JSON.stringify(data.input, null, 2));
        }
        const summary = data.match_summary_output ?? data;
        setOutput(JSON.stringify(summary, null, 2));
      } catch {
        setError("No se pudo generar el resumen");
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

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
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
