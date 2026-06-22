"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { PITONISO_LAB_MOCK_INPUT } from "@/lib/ai/pitoniso-signals-format";
import type { PitonisoLabInput } from "@/lib/ai/pitoniso-lab-types";

const MOCK_JSON = JSON.stringify(PITONISO_LAB_MOCK_INPUT, null, 2);

interface HealthState {
  ok: boolean;
  baseUrlReachable?: boolean;
  models?: string[];
  error?: string;
}

export function IaLocalLabClient() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [signalsJson, setSignalsJson] = useState(MOCK_JSON);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/dev/ai/ollama/health");
      const data = (await res.json()) as HealthState;
      setHealth(data);
    } catch {
      setHealth({ ok: false, error: "NETWORK_ERROR" });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dev/ai/ollama/health")
      .then((res) => res.json() as Promise<HealthState>)
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth({ ok: false, error: "NETWORK_ERROR" });
      })
      .finally(() => {
        if (!cancelled) setHealthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleGenerate() {
    setError(null);
    setOutput(null);

    let input: PitonisoLabInput;
    try {
      input = JSON.parse(signalsJson) as PitonisoLabInput;
    } catch {
      setError("JSON inválido en el textarea");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/dev/ai/pitoniso-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const text = await res.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          setError(`Respuesta no JSON (${res.status})`);
          setOutput(text.slice(0, 500));
          return;
        }
        if (!res.ok) {
          setError(
            typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof (data as { error: unknown }).error === "string"
              ? (data as { error: string }).error
              : `Error ${res.status}`,
          );
          setOutput(JSON.stringify(data, null, 2));
          return;
        }
        setOutput(JSON.stringify(data, null, 2));
      } catch {
        setError("No se pudo contactar al servidor");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
        Solo laboratorio interno. No visible para usuarios finales. La IA no
        modifica pronósticos ni Pitoniso público.
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Estado Ollama</h2>
          <button
            type="button"
            onClick={() => void loadHealth()}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Actualizar
          </button>
        </div>
        {healthLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Comprobando…</p>
        ) : health?.ok ? (
          <div className="mt-2 space-y-1 text-sm text-zinc-300">
            <p className="text-emerald-400">● Alcanzable</p>
            <p className="text-xs text-zinc-500">
              Modelos: {(health.models ?? []).join(", ") || "ninguno listado"}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-red-400">
            No disponible ({health?.error ?? "OLLAMA_UNAVAILABLE"})
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-600">
          Modelo preview: gemma3:4b (OLLAMA_MODEL_SPANISH)
        </p>
      </section>

      <section className="space-y-2">
        <label className="block text-sm font-semibold text-white" htmlFor="signals-json">
          JSON de señales (match + signals)
        </label>
        <textarea
          id="signals-json"
          value={signalsJson}
          onChange={(e) => setSignalsJson(e.target.value)}
          rows={14}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-600"
        />
        <button
          type="button"
          onClick={() => setSignalsJson(MOCK_JSON)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Restaurar ejemplo México vs Corea
        </button>
      </section>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {isPending ? "Generando…" : "Generar explicación"}
      </button>

      {error && (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {output && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-sm font-semibold text-white">Resultado</h2>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-300">
            {output}
          </pre>
        </section>
      )}
    </div>
  );
}
