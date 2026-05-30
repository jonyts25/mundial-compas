"use client";

import Image from "next/image";
import {
  MarcadorDisplay,
  usePartidoRealtime,
} from "@/components/home/MarcadorLive";
import { getTeamImageUrl } from "@/lib/teams/flags";
import { getEscudoFromMetadata } from "@/lib/partidos/escudos";
import {
  isPartidoEnVivo,
  labelEstatus,
  labelFase,
} from "@/lib/partidos/labels";
import type { Partido } from "@/types/database";

interface PartidoHeaderProps {
  partido: Partido;
}

export function PartidoHeader({ partido }: PartidoHeaderProps) {
  const live = usePartidoRealtime({
    partidoId: partido.id,
    marcadorLocal: partido.marcador_local,
    marcadorVisitante: partido.marcador_visitante,
    estatus: partido.estatus,
    minutoActual: partido.minuto_actual,
    metadata: partido.metadata ?? null,
    fechaKickoff: partido.fecha_kickoff,
  });

  const enJuego = isPartidoEnVivo(live.estatus);
  const finalizado = live.estatus === "finalizado";
  const showMarcador = enJuego || finalizado;
  const grupoLabel = partido.grupo ? `Grupo ${partido.grupo}` : null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-4 shadow-lg">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          {labelFase(partido.fase)}
        </span>
        {grupoLabel && (
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300">
            {grupoLabel}
          </span>
        )}
        {enJuego ? (
          <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            {labelEstatus(live.estatus)}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-zinc-500">
            {labelEstatus(live.estatus)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBlock
          nombre={partido.equipo_local_nombre}
          codigo={partido.equipo_local_codigo}
          escudoUrl={getEscudoFromMetadata(partido.metadata, "local")}
          align="left"
        />

        <div className="flex flex-col items-center px-1">
          {showMarcador ? (
            <MarcadorDisplay live={live} animateOnChange />
          ) : (
            <span className="font-mono text-4xl font-black text-zinc-600">vs</span>
          )}
        </div>

        <TeamBlock
          nombre={partido.equipo_visitante_nombre}
          codigo={partido.equipo_visitante_codigo}
          escudoUrl={getEscudoFromMetadata(partido.metadata, "visitante")}
          align="right"
        />
      </div>

    </section>
  );
}

function TeamBlock({
  nombre,
  codigo,
  escudoUrl,
  align,
}: {
  nombre: string;
  codigo: string;
  escudoUrl?: string | null;
  align: "left" | "right";
}) {
  const isEscudo = Boolean(escudoUrl?.trim());
  return (
    <div
      className={`flex flex-col gap-2 ${
        align === "right" ? "items-end text-right" : "items-start"
      }`}
    >
      <Image
        src={getTeamImageUrl(codigo, "w80", nombre, escudoUrl)}
        alt=""
        width={56}
        height={56}
        className={
          isEscudo
            ? "h-14 w-14 rounded object-contain shadow-md"
            : "h-9 w-14 rounded object-cover shadow-md"
        }
        unoptimized
      />
      <span className="max-w-[6.5rem] text-sm font-bold leading-tight text-white">
        {nombre}
      </span>
    </div>
  );
}

