"use client";

import { useState } from "react";
import { PronosticoRow } from "@/components/quiniela/PronosticoRow";
import type { QuinielaRoundGroup } from "@/lib/quiniela/knockout-rounds";
import type { PronosticoUsuario } from "@/lib/quiniela/queries";

interface QuinielaRoundSectionProps {
  group: QuinielaRoundGroup;
  pronosticosPorPartido: Record<string, PronosticoUsuario>;
  ligaId?: string;
  defaultExpanded: boolean;
}

export function QuinielaRoundSection({
  group,
  pronosticosPorPartido,
  ligaId,
  defaultExpanded,
}: QuinielaRoundSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (group.visibility === "empty") return null;

  const { progress } = group;
  const progressLabel =
    progress.total > 0
      ? `${progress.saved}/${progress.total} pronosticados`
      : null;
  const pointsLabel =
    group.points > 0 ? `${group.points} puntos` : "0 puntos";

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-zinc-100">{group.heading}</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {pointsLabel}
            {progressLabel ? ` · ${progressLabel}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs text-zinc-500" aria-hidden>
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/80 px-3 pb-3 pt-2">
          {group.visibility === "awaiting_teams" ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Se habilitará cuando se definan los clasificados.
            </p>
          ) : (
            <ul className="space-y-3">
              {group.visiblePartidos.map((partido) => (
                <li key={partido.id}>
                  <PronosticoRow
                    partido={partido}
                    pronostico={pronosticosPorPartido[partido.id]}
                    ligaId={ligaId}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
