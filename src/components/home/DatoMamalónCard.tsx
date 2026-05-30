import type { DatoMamalón } from "@/types/database";

const TIPO_EMOJI: Record<DatoMamalón["tipo"], string> = {
  trivia: "🧠",
  hito: "🏆",
  curiosidad: "🤔",
  record: "📊",
  meme_historico: "😂",
};

interface DatoMamalónCardProps {
  dato: DatoMamalón;
}

export function DatoMamalónCard({ dato }: DatoMamalónCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/80 via-zinc-900 to-zinc-950 p-4 shadow-lg">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {TIPO_EMOJI[dato.tipo]}
        </span>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Dato mamalón
        </span>
        {dato.mundial_anio && (
          <span className="ml-auto text-[10px] text-zinc-500">
            Mundial {dato.mundial_anio}
          </span>
        )}
      </div>
      <h2 className="text-base font-bold leading-snug text-amber-50">
        {dato.titulo}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{dato.contenido}</p>
      <p className="mt-3 text-[10px] text-zinc-500">
        No hay partidos en vivo ahora — disfruta la historia mientras esperamos
        el pitazo.
      </p>
    </section>
  );
}
