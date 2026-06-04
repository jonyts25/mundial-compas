import Link from "next/link";
import {
  MODO_COMPETENCIA_LABELS,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import { TIPO_QUINIELA_LABELS, type TipoQuiniela } from "@/lib/liga/tipo-quiniela";

interface QuinielaContextBannerProps {
  nombreLiga: string;
  esGlobal?: boolean;
  tipoQuiniela?: TipoQuiniela;
  modoCompetencia?: ModoCompetencia;
  grupoSlug?: string;
}

export function QuinielaContextBanner({
  nombreLiga,
  esGlobal = false,
  tipoQuiniela,
  modoCompetencia,
  grupoSlug,
}: QuinielaContextBannerProps) {
  return (
    <div
      className={`mb-4 rounded-xl border px-3 py-2.5 ${
        esGlobal
          ? "border-emerald-800/50 bg-emerald-950/25"
          : "border-violet-800/50 bg-violet-950/25"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        Estás pronosticando en
      </p>
      <p className="mt-0.5 text-base font-bold text-white">{nombreLiga}</p>
      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-zinc-400">
        {esGlobal ? (
          <span>Liga global</span>
        ) : (
          <>
            <span>{tipoQuiniela ? TIPO_QUINIELA_LABELS[tipoQuiniela] : "Grupo privado"}</span>
            {modoCompetencia && (
              <span>· {MODO_COMPETENCIA_LABELS[modoCompetencia]}</span>
            )}
          </>
        )}
      </div>
      {!esGlobal && grupoSlug && (
        <p className="mt-2 text-[11px]">
          <Link
            href={`/grupos/${grupoSlug}`}
            className="text-emerald-500 hover:underline"
          >
            ← Dashboard del grupo
          </Link>
          {" · "}
          <Link href="/quiniela" className="text-zinc-500 hover:text-zinc-300">
            Quiniela global
          </Link>
        </p>
      )}
      {esGlobal && (
        <p className="mt-2 text-[11px]">
          <Link href="/grupos" className="text-emerald-500 hover:underline">
            Mis grupos privados
          </Link>
        </p>
      )}
    </div>
  );
}
