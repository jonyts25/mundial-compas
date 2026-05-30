"use client";

import { useMemo, useState } from "react";
import { PronosticoRow } from "@/components/quiniela/PronosticoRow";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import type { PronosticoUsuario } from "@/lib/quiniela/queries";
import type { Partido } from "@/types/database";

type Filtro = "todos" | "pendientes" | "guardados" | "cerrados";

interface QuinielaListProps {
  partidos: Partido[];
  pronosticosPorPartido: Record<string, PronosticoUsuario>;
  competenciaFinalizada?: boolean;
}

export function QuinielaList({
  partidos,
  pronosticosPorPartido,
  competenciaFinalizada = false,
}: QuinielaListProps) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filtrados = useMemo(() => {
    const now = Date.now();
    return partidos.filter((p) => {
      const locked = isPronosticoLocked(p.fecha_kickoff, now);
      const tiene = Boolean(pronosticosPorPartido[p.id]);
      switch (filtro) {
        case "pendientes":
          return !locked && !tiene;
        case "guardados":
          return tiene;
        case "cerrados":
          return locked;
        default:
          return true;
      }
    });
  }, [partidos, pronosticosPorPartido, filtro]);

  const stats = useMemo(() => {
    const now = Date.now();
    const guardados = partidos.filter((p) => pronosticosPorPartido[p.id]).length;
    const abiertos = partidos.filter(
      (p) => !isPronosticoLocked(p.fecha_kickoff, now),
    ).length;
    return { guardados, abiertos, total: partidos.length };
  }, [partidos, pronosticosPorPartido]);

  if (partidos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
        <p className="text-sm text-zinc-400">No hay partidos cargados.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Ejecuta POST /api/admin/cargar-partidos con tu secret de admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Abiertos" value={stats.abiertos} accent="emerald" />
        <StatCard label="Guardados" value={stats.guardados} accent="amber" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            ["todos", "Todos"],
            ["pendientes", "Pendientes"],
            ["guardados", "Mis picks"],
            ["cerrados", "Cerrados"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFiltro(key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filtro === key
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="space-y-4">
        {filtrados.map((partido) => (
          <li key={partido.id}>
            <PronosticoRow
              partido={partido}
              pronostico={pronosticosPorPartido[partido.id]}
              soloLectura={competenciaFinalizada}
            />
          </li>
        ))}
      </ul>

      {filtrados.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          Nada en este filtro.
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "amber"
        ? "text-amber-400"
        : "text-white";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 py-2">
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
