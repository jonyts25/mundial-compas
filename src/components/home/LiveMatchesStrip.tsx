import { PartidoCard } from "@/components/home/PartidoCard";
import type { Partido } from "@/types/database";

interface LiveMatchesStripProps {
  partidos: Partido[];
}

export function LiveMatchesStrip({ partidos }: LiveMatchesStripProps) {
  return (
    <section aria-label="Partidos en vivo">
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-red-500" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-white">
          En vivo ahora
        </h2>
        <span className="rounded-full bg-red-600/30 px-2 py-0.5 text-[10px] font-bold text-red-300">
          {partidos.length}
        </span>
      </div>
      <ul className="space-y-3">
        {partidos.map((p) => (
          <li key={p.id}>
            <PartidoCard partido={p} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
