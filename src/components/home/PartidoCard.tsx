"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MarcadorDisplay,
  usePartidoRealtime,
} from "@/components/home/MarcadorLive";
import { formatMexicoTime } from "@/lib/datetime/mexico";
import { getTeamImageUrl } from "@/lib/teams/flags";
import { getEscudoFromMetadata } from "@/lib/partidos/escudos";
import {
  getCanalDisplay,
  isPartidoEnVivo,
  labelEstatus,
  labelFase,
} from "@/lib/partidos/labels";
import type { Partido } from "@/types/database";

interface PartidoCardProps {
  partido: Partido;
  compact?: boolean;
}

export function PartidoCard({ partido, compact = false }: PartidoCardProps) {
  const live = usePartidoRealtime({
    partidoId: partido.id,
    marcadorLocal: partido.marcador_local,
    marcadorVisitante: partido.marcador_visitante,
    estatus: partido.estatus,
    minutoActual: partido.minuto_actual,
    metadata: partido.metadata ?? null,
    fechaKickoff: partido.fecha_kickoff,
  });

  const enVivo = live.estatus === "en_vivo";
  const medioTiempo = live.estatus === "medio_tiempo";
  const enJuego = isPartidoEnVivo(live.estatus);
  const finalizado = live.estatus === "finalizado";
  const showMarcador = enJuego || finalizado;

  const canal = getCanalDisplay(partido.canal_transmision);
  const horaMx = formatMexicoTime(partido.fecha_kickoff);
  const faseLabel = labelFase(partido.fase);
  const grupoLabel = partido.grupo ? ` · Grupo ${partido.grupo}` : "";

  return (
    <article
      data-partido-card={partido.id}
      data-estatus={live.estatus}
      className={`overflow-hidden rounded-2xl border bg-zinc-900/80 shadow-lg transition-[border-color,box-shadow] duration-300 active:scale-[0.99] ${
        enVivo
          ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
          : medioTiempo
            ? "border-amber-500/40 ring-1 ring-amber-500/20"
            : finalizado
              ? "border-zinc-600"
              : "border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-zinc-400">
            {faseLabel}
            {grupoLabel}
          </p>
          {!enJuego && !finalizado && (
            <p className="text-xs font-semibold text-zinc-200">{horaMx} CDMX</p>
          )}
        </div>

        {enVivo ? (
          <span className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            {labelEstatus(live.estatus)}
          </span>
        ) : medioTiempo ? (
          <span className="rounded-full bg-amber-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {labelEstatus(live.estatus)}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-zinc-500">
            {labelEstatus(live.estatus)}
          </span>
        )}
      </div>

      <Link
        href={`/partidos/${partido.id}`}
        className="block px-3 py-4"
        prefetch={false}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <TeamColumn
            nombre={partido.equipo_local_nombre}
            codigo={partido.equipo_local_codigo}
            escudoUrl={getEscudoFromMetadata(partido.metadata, "local")}
            align="left"
            compact={compact}
          />

          {showMarcador ? (
            <MarcadorDisplay live={live} animateOnChange />
          ) : (
            <div className="flex flex-col items-center px-1">
              <span className="text-2xl font-light text-zinc-600">vs</span>
              <span className="mt-1 text-[10px] font-semibold text-emerald-500/90">
                {horaMx}
              </span>
            </div>
          )}

          <TeamColumn
            nombre={partido.equipo_visitante_nombre}
            codigo={partido.equipo_visitante_codigo}
            escudoUrl={getEscudoFromMetadata(partido.metadata, "visitante")}
            align="right"
            compact={compact}
          />
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-800/80 px-3 py-2.5">
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ring-1 ring-inset ${canal.className}`}
        >
          📺 {canal.label}
        </span>
        {canal.sublabel && (
          <span className="text-[10px] text-zinc-500">{canal.sublabel}</span>
        )}
      </div>
    </article>
  );
}

function TeamColumn({
  nombre,
  codigo,
  escudoUrl,
  align,
  compact,
}: {
  nombre: string;
  codigo: string;
  escudoUrl?: string | null;
  align: "left" | "right";
  compact?: boolean;
}) {
  const isEscudo = Boolean(escudoUrl?.trim());
  return (
    <div
      className={`flex flex-col gap-1.5 ${
        align === "right" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <Image
        src={getTeamImageUrl(codigo, compact ? "w40" : "w80", nombre, escudoUrl)}
        alt=""
        width={compact ? 36 : 48}
        height={compact ? 36 : 48}
        className={`rounded shadow-md ${
          isEscudo
            ? compact
              ? "h-9 w-9 object-contain"
              : "h-12 w-12 object-contain"
            : compact
              ? "h-6 w-9 object-cover"
              : "h-8 w-12 object-cover"
        }`}
        unoptimized
      />
      <span
        className={`max-w-[5.5rem] font-semibold leading-tight text-white ${
          compact ? "text-[11px]" : "text-xs"
        }`}
      >
        {nombre}
      </span>
    </div>
  );
}
