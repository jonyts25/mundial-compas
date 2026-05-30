"use client";

import { useCallback, useEffect, useState } from "react";
import type { PartidoLineups } from "@/lib/partidos/lineups-types";

interface PartidoAlineacionesProps {
  partidoId: string;
  localNombre: string;
  visitanteNombre: string;
  kickoffIso: string;
  initialLineups: PartidoLineups | null;
}

function TeamLineupBlock({
  title,
  team,
}: {
  title: string;
  team: PartidoLineups["home"];
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-300">
          {title}
        </h4>
        {team.formation && (
          <span className="font-mono text-[10px] text-emerald-400">{team.formation}</span>
        )}
      </div>
      {team.coach && (
        <p className="text-[10px] text-zinc-500">DT: {team.coach}</p>
      )}
      <ul className="space-y-0.5">
        {team.starting.map((p) => (
          <li
            key={`${p.number}-${p.name}`}
            className="flex items-center gap-2 text-xs text-zinc-200"
          >
            <span className="w-5 shrink-0 text-right font-mono text-zinc-500">
              {p.number}
            </span>
            <span className="truncate">{p.name}</span>
          </li>
        ))}
      </ul>
      {team.substitutes.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[10px] font-medium text-zinc-500 hover:text-zinc-400">
            Suplentes ({team.substitutes.length})
          </summary>
          <ul className="mt-1 space-y-0.5 pl-1">
            {team.substitutes.map((p) => (
              <li
                key={`sub-${p.number}-${p.name}`}
                className="flex items-center gap-2 text-[11px] text-zinc-400"
              >
                <span className="w-5 shrink-0 text-right font-mono text-zinc-600">
                  {p.number}
                </span>
                <span className="truncate">{p.name}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function PartidoAlineaciones({
  partidoId,
  localNombre,
  visitanteNombre,
  kickoffIso,
  initialLineups,
}: PartidoAlineacionesProps) {
  const [open, setOpen] = useState(Boolean(initialLineups));
  const [lineups, setLineups] = useState<PartidoLineups | null>(initialLineups);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hoursToKickoff =
    (new Date(kickoffIso).getTime() - Date.now()) / (60 * 60 * 1000);

  const fetchLineups = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/partidos/${partidoId}/alineaciones`);
      const data = (await res.json()) as {
        available: boolean;
        lineups: PartidoLineups | null;
        skipped?: string | null;
      };
      if (data.lineups) {
        setLineups(data.lineups);
      } else if (data.skipped === "fuera_ventana") {
        setMessage("Las alineaciones suelen publicarse ~1 h antes del pitido.");
      } else {
        setMessage("Aún no hay alineaciones confirmadas. Vuelve más cerca del partido.");
      }
    } catch {
      setMessage("No se pudieron cargar las alineaciones.");
    } finally {
      setLoading(false);
    }
  }, [partidoId]);

  useEffect(() => {
    if (initialLineups) return;
    if (hoursToKickoff > 4 || hoursToKickoff < -0.5) return;
    if (open) void fetchLineups();
  }, [open, initialLineups, hoursToKickoff, fetchLineups]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-white">
          Alineaciones
          {lineups && (
            <span className="ml-2 rounded-full bg-emerald-900/60 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              Confirmadas
            </span>
          )}
        </span>
        <span className="text-zinc-500">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {lineups ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TeamLineupBlock title={localNombre} team={lineups.home} />
              <TeamLineupBlock title={visitanteNombre} team={lineups.away} />
            </div>
          ) : (
            <div className="space-y-2">
              {message && (
                <p className="text-xs leading-relaxed text-zinc-400">{message}</p>
              )}
              {!message && hoursToKickoff > 4 && (
                <p className="text-xs text-zinc-500">
                  Todavía es pronto. Te avisaremos por push cuando estén listas.
                </p>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={() => void fetchLineups()}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-60"
              >
                {loading ? "Consultando…" : "Buscar alineaciones"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
