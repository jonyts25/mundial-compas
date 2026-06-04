import Link from "next/link";
import { RolBadge } from "@/components/grupos/RolBadge";
import { isOwnerOrAdmin } from "@/lib/liga/roles";
import { MODO_COMPETENCIA_LABELS } from "@/lib/liga/modo-competencia";
import { TIPO_QUINIELA_LABELS } from "@/lib/liga/tipo-quiniela";
import type { GrupoResumen } from "@/lib/liga/grupos-queries";

interface MisGruposListProps {
  grupos: GrupoResumen[];
}

export function MisGruposList({ grupos }: MisGruposListProps) {
  if (grupos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
        <p className="text-sm text-zinc-400">Aún no tienes quinielas privadas.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Crea uno con tus compas o únete con un código de invitación.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/grupos/crear"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
          >
            Nueva quiniela
          </Link>
          <Link
            href="/grupos/unirse"
            className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200"
          >
            Tengo un código
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {grupos.map((g) => {
        const admin = isOwnerOrAdmin(g.rol);
        const invitarHref = admin
          ? `/grupos/${g.slug}?tab=invitar`
          : `/grupos/${g.slug}`;

        return (
          <li
            key={g.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{g.nombre}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {TIPO_QUINIELA_LABELS[g.tipo_quiniela]} ·{" "}
                  {MODO_COMPETENCIA_LABELS[g.modo_competencia]} ·{" "}
                  {g.miembros_count} miembro
                  {g.miembros_count === 1 ? "" : "s"}
                </p>
              </div>
              <RolBadge rol={g.rol} />
            </div>

            {g.codigo_invitacion && admin && (
              <p className="mt-2 font-mono text-[10px] tracking-wider text-zinc-600">
                Código: {g.codigo_invitacion}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/grupos/${g.slug}`}
                className="rounded-lg border border-zinc-700 py-2 text-center text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Ver grupo
              </Link>
              <Link
                href={`/grupos/${g.slug}/quiniela`}
                className="rounded-lg bg-emerald-600/90 py-2 text-center text-xs font-bold text-white hover:bg-emerald-600"
              >
                Quiniela
              </Link>
              <Link
                href={`/grupos/${g.slug}/leaderboard`}
                className="rounded-lg border border-zinc-700 py-2 text-center text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Liderato
              </Link>
              {admin ? (
                <Link
                  href={invitarHref}
                  className="rounded-lg border border-violet-800/60 py-2 text-center text-xs font-semibold text-violet-300 hover:bg-violet-950/40"
                >
                  Invitar
                </Link>
              ) : (
                <span className="rounded-lg border border-dashed border-zinc-800 py-2 text-center text-xs text-zinc-600">
                  Invitar (admin)
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
