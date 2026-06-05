"use client";

import Image from "next/image";
import type { LeaderboardRow } from "@/lib/leaderboard/queries";

interface LeaderboardProps {
  filas: LeaderboardRow[];
  usuarioActualId: string;
  /** En liga global de honor no mostrar indicador de quiniela de paga. */
  mostrarBadgeQuinielaPaga?: boolean;
}

function getInitials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function PodioBadge({ posicion }: { posicion: number }) {
  if (posicion === 1) {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-black text-amber-950 shadow ring-1 ring-amber-400/50">
        1°
      </span>
    );
  }
  if (posicion === 2) {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 text-xs font-black text-zinc-900 shadow ring-1 ring-zinc-400/40">
        2°
      </span>
    );
  }
  if (posicion === 3) {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-700 text-xs font-black text-orange-950 shadow ring-1 ring-orange-500/40">
        3°
      </span>
    );
  }
  return (
    <span className="inline-flex size-7 items-center justify-center text-xs font-bold tabular-nums text-zinc-500">
      {posicion}°
    </span>
  );
}

export function Leaderboard({
  filas,
  usuarioActualId,
  mostrarBadgeQuinielaPaga = true,
}: LeaderboardProps) {
  if (filas.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        Aún no hay compas en la tabla. ¡Sé el primero en sumar puntos!
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
      <div className="grid grid-cols-[2.5rem_1fr_repeat(3,3rem)] gap-2 border-b border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 sm:grid-cols-[2.5rem_1fr_repeat(3,3.5rem)] sm:px-4">
        <span>#</span>
        <span>Compa</span>
        <span className="text-right">Pts</span>
        <span className="text-right" title="Marcadores exactos">
          3pt
        </span>
        <span className="text-right" title="Tendencias correctas">
          1pt
        </span>
      </div>

      <ul className="divide-y divide-zinc-800/80">
        {filas.map((fila) => {
          const esYo = fila.usuario_id === usuarioActualId;
          return (
            <li
              key={fila.usuario_id}
              className={`grid grid-cols-[2.5rem_1fr_repeat(3,3rem)] items-center gap-2 px-3 py-3 transition sm:grid-cols-[2.5rem_1fr_repeat(3,3.5rem)] sm:px-4 ${
                esYo
                  ? "bg-emerald-950/40 ring-1 ring-inset ring-emerald-500/30"
                  : "hover:bg-zinc-800/30"
              }`}
            >
              <div className="flex justify-center">
                <PodioBadge posicion={fila.posicion} />
              </div>

              <div className="flex min-w-0 items-center gap-2">
                {fila.avatar_url ? (
                  <Image
                    src={fila.avatar_url}
                    alt=""
                    width={32}
                    height={32}
                    className={`size-8 shrink-0 rounded-full object-cover ${
                      esYo ? "ring-2 ring-emerald-500/60" : "ring-1 ring-zinc-700"
                    }`}
                  />
                ) : (
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      esYo
                        ? "bg-emerald-950 text-emerald-300 ring-2 ring-emerald-500/60"
                        : "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700"
                    }`}
                  >
                    {getInitials(fila.nombre_visible)}
                  </div>
                )}
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold ${
                      esYo ? "text-emerald-200" : "text-white"
                    }`}
                  >
                    {fila.nombre_visible}
                    {esYo && (
                      <span className="ml-1 text-[10px] font-normal text-emerald-500">
                        (tú)
                      </span>
                    )}
                  </p>
                  {mostrarBadgeQuinielaPaga && fila.quiniela_paga && (
                    <span
                      className="text-[9px] font-medium text-amber-400"
                      title="Participante con acuerdo económico (solo grupos privados)"
                    >
                      👑
                    </span>
                  )}
                </div>
              </div>

              <span
                className={`text-right font-mono text-sm font-black tabular-nums ${
                  esYo ? "text-emerald-300" : "text-white"
                }`}
              >
                {fila.puntos_totales}
              </span>
              <span className="text-right font-mono text-xs tabular-nums text-zinc-400">
                {fila.exactos}
              </span>
              <span className="text-right font-mono text-xs tabular-nums text-zinc-400">
                {fila.tendencias}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
