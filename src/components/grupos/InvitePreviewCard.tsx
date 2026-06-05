import type { ModoCompetencia } from "@/lib/liga/modo-competencia";
import {
  TIPO_QUINIELA_LABELS,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";
import { modoCompetenciaShareLabel } from "@/lib/grupos/invite-share";

export interface InvitePreviewData {
  nombre: string;
  tipoQuiniela: TipoQuiniela;
  modoCompetencia: ModoCompetencia;
  miembrosCount: number;
  ownerNombre?: string | null;
}

interface InvitePreviewCardProps {
  preview: InvitePreviewData;
  /** Si true, muestra CTA de unirse (pantalla /unirse). */
  showJoinCta?: boolean;
  onJoin?: () => void;
  joinPending?: boolean;
  joinLabel?: string;
}

export function InvitePreviewCard({
  preview,
  showJoinCta,
  onJoin,
  joinPending,
  joinLabel = "Unirme a esta quiniela",
}: InvitePreviewCardProps) {
  const modoLabel = modoCompetenciaShareLabel(preview.modoCompetencia);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-zinc-950">
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
          Te invitaron a una quiniela
        </p>
        <h2 className="mt-1 text-xl font-black text-white">{preview.nombre}</h2>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2.5 py-2">
            <dt className="text-[10px] font-bold uppercase text-zinc-500">Tipo</dt>
            <dd className="mt-0.5 font-semibold text-zinc-200">
              {TIPO_QUINIELA_LABELS[preview.tipoQuiniela]}
            </dd>
          </div>
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2.5 py-2">
            <dt className="text-[10px] font-bold uppercase text-zinc-500">Modo</dt>
            <dd className="mt-0.5 font-semibold text-zinc-200">{modoLabel}</dd>
          </div>
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2.5 py-2">
            <dt className="text-[10px] font-bold uppercase text-zinc-500">Compas</dt>
            <dd className="mt-0.5 font-semibold text-zinc-200">
              {preview.miembrosCount} miembro
              {preview.miembrosCount === 1 ? "" : "s"}
            </dd>
          </div>
          {preview.ownerNombre && (
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2.5 py-2">
              <dt className="text-[10px] font-bold uppercase text-zinc-500">Organiza</dt>
              <dd className="mt-0.5 font-semibold text-zinc-200">
                {preview.ownerNombre}
              </dd>
            </div>
          )}
        </dl>

        {showJoinCta && onJoin && (
          <button
            type="button"
            onClick={onJoin}
            disabled={joinPending}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {joinPending ? "Uniéndote…" : joinLabel}
          </button>
        )}
      </div>
    </div>
  );
}
