"use client";

import { useState, useTransition } from "react";
import {
  resolvePronosticoFusionConflict,
  type ResolveFusionChoice,
} from "@/lib/quiniela/fusion-actions";
import type { PronosticoFusionPendiente } from "@/lib/quiniela/fusion-queries";

interface PronosticoFusionBannerProps {
  pendientes: PronosticoFusionPendiente[];
}

function formatMarcador(local: number, visitante: number): string {
  return `${local}–${visitante}`;
}

export function PronosticoFusionBanner({ pendientes }: PronosticoFusionBannerProps) {
  const [items, setItems] = useState(pendientes);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) return null;

  function handleResolve(id: string, choice: ResolveFusionChoice) {
    setError(null);
    startTransition(async () => {
      const result = await resolvePronosticoFusionConflict(id, choice);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    });
  }

  return (
    <div className="mb-4 space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
        >
          <p className="font-medium text-amber-100">
            Confirma tu pronóstico — {item.equipoLocalNombre} vs {item.equipoVisitanteNombre}
          </p>
          <p className="mt-1 text-amber-100/90">
            Al unificar partidos duplicados conservamos{" "}
            <strong>{formatMarcador(item.keptLocal, item.keptVisitante)}</strong> y descartamos{" "}
            <strong>{formatMarcador(item.discardedLocal, item.discardedVisitante)}</strong>.
            ¿Cuál es el correcto?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleResolve(item.id, "kept")}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
            >
              Conservar {formatMarcador(item.keptLocal, item.keptVisitante)}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleResolve(item.id, "discarded")}
              className="rounded-lg border border-amber-400/60 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-60"
            >
              Usar {formatMarcador(item.discardedLocal, item.discardedVisitante)}
            </button>
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
