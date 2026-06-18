"use client";

import {
  formatMomentoMinuto,
  parseMomentosFromMetadata,
  type MomentoClave,
} from "@/lib/api-football/match-events";

interface PartidoEventosClaveProps {
  metadata: Record<string, unknown> | null | undefined;
}

export function PartidoEventosClave({ metadata }: PartidoEventosClaveProps) {
  const momentos = parseMomentosFromMetadata(metadata);
  if (momentos.length === 0) return null;

  const goles = momentos.filter((m) => m.tipo === "gol");
  const rojas = momentos.filter((m) => m.tipo === "tarjeta_roja");
  const rows = Math.max(goles.length, rojas.length, 1);

  return (
    <div className="mt-4 border-t border-zinc-800/80 pt-3">
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Eventos
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {Array.from({ length: rows }, (_, i) => (
          <EventosRow key={i} gol={goles[i]} roja={rojas[i]} />
        ))}
      </div>
    </div>
  );
}

function EventosRow({
  gol,
  roja,
}: {
  gol?: MomentoClave;
  roja?: MomentoClave;
}) {
  return (
    <>
      <EventoCell evento={gol} align="left" />
      <EventoCell evento={roja} align="right" />
    </>
  );
}

function EventoCell({
  evento,
  align,
}: {
  evento?: MomentoClave;
  align: "left" | "right";
}) {
  if (!evento) {
    return <span className="min-h-[1.25rem]" aria-hidden />;
  }

  const minuto = formatMomentoMinuto(evento.minuto, evento.extra);
  const isGol = evento.tipo === "gol";

  return (
    <div
      className={`flex items-center gap-1.5 ${
        align === "right" ? "justify-end text-right" : "justify-start text-left"
      }`}
    >
      {align === "right" ? (
        <>
          <EventoTexto evento={evento} minuto={minuto} />
          <EventoIcon isGol={isGol} />
        </>
      ) : (
        <>
          <EventoIcon isGol={isGol} />
          <EventoTexto evento={evento} minuto={minuto} />
        </>
      )}
    </div>
  );
}

function EventoIcon({ isGol }: { isGol: boolean }) {
  if (isGol) {
    return <span className="shrink-0 text-sm leading-none" aria-hidden>⚽</span>;
  }
  return (
    <span
      className="inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] bg-red-600 ring-1 ring-red-800"
      aria-hidden
      title="Tarjeta roja"
    />
  );
}

function EventoTexto({
  evento,
  minuto,
}: {
  evento: MomentoClave;
  minuto: string;
}) {
  return (
    <span className="min-w-0 leading-tight text-zinc-300">
      <span className="font-semibold text-zinc-100">{evento.jugador}</span>
      {minuto ? (
        <span className="ml-1 font-mono text-[10px] text-zinc-500">{minuto}</span>
      ) : null}
      <span className="ml-1 text-[10px] text-zinc-500">{evento.equipo}</span>
    </span>
  );
}
