import Link from "next/link";
import { QuinielaSelector } from "@/components/quiniela/QuinielaSelector";
import {
  MODO_COMPETENCIA_LABELS,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import { TIPO_QUINIELA_LABELS, type TipoQuiniela } from "@/lib/liga/tipo-quiniela";
import type { QuinielaSelectorOption } from "@/lib/quiniela/selector-options";

interface QuinielaCompactHeaderProps {
  nombre: string;
  backHref: string;
  esGlobal: boolean;
  tipoQuiniela?: TipoQuiniela;
  modoCompetencia?: ModoCompetencia;
  selectorOptions: QuinielaSelectorOption[];
  activeLigaId: string;
  grupoSlug?: string;
}

export function QuinielaCompactHeader({
  nombre,
  backHref,
  esGlobal,
  tipoQuiniela,
  modoCompetencia,
  selectorOptions,
  activeLigaId,
  grupoSlug,
}: QuinielaCompactHeaderProps) {
  const tipoLabel = tipoQuiniela
    ? TIPO_QUINIELA_LABELS[tipoQuiniela]
    : esGlobal
      ? "Global"
      : "Grupo";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-white">{nombre}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                esGlobal
                  ? "bg-emerald-950/80 text-emerald-300"
                  : "bg-violet-950/80 text-violet-300"
              }`}
            >
              {esGlobal ? "Global" : "Grupo privado"}
            </span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              {tipoLabel}
            </span>
            {modoCompetencia && (
              <span className="text-[10px] text-zinc-500">
                {MODO_COMPETENCIA_LABELS[modoCompetencia]}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <QuinielaSelector
          options={selectorOptions}
          activeLigaId={activeLigaId}
          compact
        />
      </div>

      {!esGlobal && grupoSlug && (
        <p className="mt-1 text-[10px]">
          <Link
            href={`/grupos/${grupoSlug}`}
            className="text-zinc-500 hover:text-emerald-400"
          >
            Dashboard del grupo
          </Link>
        </p>
      )}
    </header>
  );
}
