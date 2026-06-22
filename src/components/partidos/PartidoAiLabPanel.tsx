"use client";

import { useState, useTransition } from "react";
import type { PitonisoLabInput } from "@/lib/ai/pitoniso-lab-types";

interface PartidoAiLabPanelProps {
  labInput: PitonisoLabInput;
}

export function PartidoAiLabPanel({ labInput }: PartidoAiLabPanelProps) {
  const [open, setOpen] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runPreview() {
    setError(null);
    setOutput(null);
    setOpen(true);

    startTransition(async () => {
      try {
        const res = await fetch("/api/dev/ai/pitoniso-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(labInput),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(
            typeof data.error === "string" ? data.error : `Error ${res.status}`,
          );
          setOutput(JSON.stringify(data, null, 2));
          return;
        }
        setOutput(JSON.stringify(data, null, 2));
      } catch {
        setError("No se pudo generar la explicación");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-dashed border-violet-700/40 bg-violet-950/10 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400/90">
        IA Lab (solo tú)
      </p>
      <button
        type="button"
        onClick={runPreview}
        disabled={isPending}
        className="mt-2 w-full rounded-lg border border-violet-600/50 bg-violet-900/30 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
      >
        {isPending ? "Generando…" : "Probar explicación IA"}
      </button>

      {open && (output || error) && (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
          <p className="text-xs font-semibold text-zinc-400">IA Lab — no es Pitoniso</p>
          {error && (
            <p className="mt-1 text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
          {output && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-zinc-300">
              {output}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
