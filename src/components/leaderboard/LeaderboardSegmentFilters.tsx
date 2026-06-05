"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { todayMexicoDate } from "@/lib/datetime/mexico";
import { FASE_MUNDIAL_LABELS } from "@/lib/liga/partido-filters";
import {
  TIPO_QUINIELA_LABELS,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";
import type { LeaderboardModoSegmento } from "@/lib/leaderboard/filters";
import type { QuinielaFilterOptions } from "@/lib/quiniela/filter-options";
import type { FaseMundial } from "@/types/database";

interface LeaderboardSegmentFiltersProps {
  tipoQuiniela: TipoQuiniela;
  filterOptions: QuinielaFilterOptions;
  jornadaActual: number | null;
  faseActual: FaseMundial | null;
  modoSegmento: LeaderboardModoSegmento;
}

export function LeaderboardSegmentFilters({
  tipoQuiniela,
  filterOptions,
  jornadaActual,
  faseActual,
  modoSegmento,
}: LeaderboardSegmentFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const basePath = pathname;

  function pushParams(
    mutate: (next: URLSearchParams) => void,
    segment?: { modo: string; jornada?: number | null; fase?: string | null },
  ) {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    if (segment) {
      trackEvent("leaderboard_segment_changed", segment);
    }
    const q = next.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  if (tipoQuiniela === "mundial_completo") {
    return (
      <p className="mb-3 text-xs text-zinc-500">
        {TIPO_QUINIELA_LABELS.mundial_completo}: ranking de todos los partidos
        del torneo.
      </p>
    );
  }

  if (tipoQuiniela === "express_dia") {
    const hoy = todayMexicoDate();
    return (
      <div className="mb-3">
        <p className="mb-2 text-xs text-sky-200/90">
          {TIPO_QUINIELA_LABELS.express_dia}: partidos del{" "}
          <strong>{hoy}</strong> (hora CDMX).
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={modoSegmento === "segmento"}
            onClick={() =>
              pushParams(
                (next) => {
                  next.delete("vista");
                },
                { modo: "segmento" },
              )
            }
            label="Hoy"
          />
          <AcumuladoChip
            active={modoSegmento === "acumulado"}
            onClick={() =>
              pushParams(
                (next) => {
                  next.set("vista", "acumulado");
                },
                { modo: "acumulado" },
              )
            }
          />
        </div>
      </div>
    );
  }

  if (tipoQuiniela === "por_jornada") {
    const jornadas =
      filterOptions.jornadas.length > 0
        ? filterOptions.jornadas
        : [1, 2, 3];

    return (
      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Jornada
        </p>
        <div className="flex flex-wrap gap-1.5">
          {jornadas.map((j) => (
            <FilterChip
              key={j}
              active={
                modoSegmento === "segmento" && jornadaActual === j
              }
              onClick={() =>
                pushParams(
                  (next) => {
                    next.delete("vista");
                    next.set("jornada", String(j));
                  },
                  { modo: "segmento", jornada: j },
                )
              }
              label={`J${j}`}
            />
          ))}
          <AcumuladoChip
            active={modoSegmento === "acumulado"}
            onClick={() =>
              pushParams(
                (next) => {
                  next.set("vista", "acumulado");
                  next.delete("jornada");
                },
                { modo: "acumulado", jornada: null },
              )
            }
          />
        </div>
      </div>
    );
  }

  if (tipoQuiniela === "por_fase") {
    const fases =
      filterOptions.fases.length > 0
        ? filterOptions.fases
        : (["grupos"] as FaseMundial[]);

    return (
      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Fase
        </p>
        <div className="flex flex-wrap gap-1.5">
          {fases.map((f) => (
            <FilterChip
              key={f}
              active={modoSegmento === "segmento" && faseActual === f}
              onClick={() =>
                pushParams(
                  (next) => {
                    next.delete("vista");
                    next.set("fase", f);
                  },
                  { modo: "segmento", fase: f },
                )
              }
              label={FASE_MUNDIAL_LABELS[f]}
            />
          ))}
          <AcumuladoChip
            active={modoSegmento === "acumulado"}
            onClick={() =>
              pushParams(
                (next) => {
                  next.set("vista", "acumulado");
                  next.delete("fase");
                },
                { modo: "acumulado", fase: null },
              )
            }
          />
        </div>
      </div>
    );
  }

  return null;
}

function AcumuladoChip({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <FilterChip active={active} onClick={onClick} label="Acumulado" />
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}
