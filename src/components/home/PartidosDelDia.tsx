import { PartidoCard } from "@/components/home/PartidoCard";
import { formatMexicoDateLabel } from "@/lib/datetime/mexico";
import type { Partido } from "@/types/database";

interface PartidosDelDiaProps {
  partidos: Partido[];
}

export function PartidosDelDia({ partidos }: PartidosDelDiaProps) {
  const fechaLabel =
    partidos.length > 0
      ? formatMexicoDateLabel(partidos[0]!.fecha_kickoff)
      : formatMexicoDateLabel(new Date().toISOString());

  return (
    <section className="mt-8" aria-label="Partidos del día">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">
            Partidos del día
          </h2>
          <p className="text-xs capitalize text-zinc-500">{fechaLabel} · CDMX</p>
        </div>
        <span className="rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-400">
          {partidos.length} {partidos.length === 1 ? "partido" : "partidos"}
        </span>
      </div>

      {partidos.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center">
          <p className="text-sm text-zinc-400">No hay partidos programados para hoy.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Los fixtures aparecerán aquí cuando los sincronices desde API-Football.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {partidos.map((partido) => (
            <li key={partido.id}>
              <PartidoCard partido={partido} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
