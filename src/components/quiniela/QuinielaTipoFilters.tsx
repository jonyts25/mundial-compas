"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import { FASE_MUNDIAL_LABELS } from "@/lib/liga/partido-filters";
import { TIPO_QUINIELA_LABELS, type TipoQuiniela } from "@/lib/liga/tipo-quiniela";
import type { QuinielaFilterOptions } from "@/lib/quiniela/filter-options";
import type { FaseMundial } from "@/types/database";

interface QuinielaTipoFiltersProps {
  tipoQuiniela: TipoQuiniela;
  filterOptions: QuinielaFilterOptions;
  jornadaActual: number | null;
  faseActual: FaseMundial | null;
}

export function QuinielaTipoFilters({
  tipoQuiniela,
  filterOptions,
  jornadaActual,
  faseActual,
}: QuinielaTipoFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  if (tipoQuiniela === "mundial_completo") {
    return (
      <p className="mb-3 text-xs text-zinc-500">
        {TIPO_QUINIELA_LABELS.mundial_completo}: todos los partidos abiertos del
        torneo.
      </p>
    );
  }

  if (tipoQuiniela === "express_dia") {
    return (
      <p className="mb-3 rounded-lg border border-sky-900/40 bg-sky-950/20 px-3 py-2 text-xs text-sky-200/90">
        {TIPO_QUINIELA_LABELS.express_dia}: solo partidos de hoy (hora CDMX).
      </p>
    );
  }

  if (tipoQuiniela === "por_jornada") {
    const jornadas =
      filterOptions.jornadas.length > 0
        ? filterOptions.jornadas
        : [1, 2, 3].filter(Boolean);

    return (
      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Jornada
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={jornadaActual == null}
            onClick={() => {
              trackEvent("filtro_jornada_selected", { jornada: null });
              setParam("jornada", null);
            }}
            label="Todas"
          />
          {jornadas.map((j) => (
            <FilterChip
              key={j}
              active={jornadaActual === j}
              onClick={() => {
                trackEvent("filtro_jornada_selected", { jornada: j });
                setParam("jornada", String(j));
              }}
              label={`J${j}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (tipoQuiniela === "por_fase") {
    const fases =
      filterOptions.fases.length > 0 ? filterOptions.fases : (["grupos"] as FaseMundial[]);

    return (
      <div className="mb-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Fase
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={!faseActual}
            onClick={() => {
              trackEvent("filtro_fase_selected", { fase: null });
              setParam("fase", null);
            }}
            label="Todas"
          />
          {fases.map((f) => (
            <FilterChip
              key={f}
              active={faseActual === f}
              onClick={() => {
                trackEvent("filtro_fase_selected", { fase: f });
                setParam("fase", f);
              }}
              label={FASE_MUNDIAL_LABELS[f]}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
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
