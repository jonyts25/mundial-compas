import Image from "next/image";
import Link from "next/link";
import { formatMexicoKickoff } from "@/lib/datetime/mexico";
import { labelEstatus } from "@/lib/partidos/labels";
import { getFlagImageUrl } from "@/lib/teams/flags";
import type { Partido } from "@/types/database";

interface GroupMatchesListProps {
  partidos: Partido[];
  groupLabel: string;
}

export function GroupMatchesList({ partidos, groupLabel }: GroupMatchesListProps) {
  if (partidos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center text-sm text-zinc-500">
        Aún no hay partidos cargados para {groupLabel}.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {partidos.map((p) => {
        const { fecha, hora } = formatMexicoKickoff(p.fecha_kickoff);
        const hasScore =
          p.marcador_local != null && p.marcador_visitante != null;
        const enVivo =
          p.estatus === "en_vivo" || p.estatus === "medio_tiempo";

        return (
          <li key={p.id}>
            <Link
              href={`/partidos/${p.id}`}
              className={`block rounded-xl border px-3 py-3 transition active:scale-[0.99] ${
                enVivo
                  ? "border-emerald-600/50 bg-emerald-950/20"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                <span>
                  {fecha} · {hora} CDMX
                </span>
                <span
                  className={
                    enVivo ? "font-semibold text-emerald-400" : "text-zinc-500"
                  }
                >
                  {labelEstatus(p.estatus)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Image
                    src={getFlagImageUrl(
                      p.equipo_local_codigo,
                      "w40",
                      p.equipo_local_nombre,
                    )}
                    alt=""
                    width={20}
                    height={14}
                    className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                  />
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {p.equipo_local_nombre}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-white">
                  {hasScore ? p.marcador_local : "–"}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Image
                    src={getFlagImageUrl(
                      p.equipo_visitante_codigo,
                      "w40",
                      p.equipo_visitante_nombre,
                    )}
                    alt=""
                    width={20}
                    height={14}
                    className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                  />
                  <span className="truncate text-sm font-medium text-zinc-300">
                    {p.equipo_visitante_nombre}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-white">
                  {hasScore ? p.marcador_visitante : "–"}
                </span>
              </div>

              {p.sede && (
                <p className="mt-2 truncate text-[10px] text-zinc-600">
                  📍 {p.sede}
                </p>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
