"use client";

import {
  formatMomentoMinuto,
  parseMomentosFromMetadata,
  type MomentoClave,
} from "@/lib/api-football/match-events";

interface PartidoEventosClaveProps {
  metadata: Record<string, unknown> | null | undefined;
}

function byTiempo(a: MomentoClave, b: MomentoClave): number {
  const ka = (a.minuto ?? 9999) * 100 + (a.extra ?? 0);
  const kb = (b.minuto ?? 9999) * 100 + (b.extra ?? 0);
  return ka - kb;
}

export function PartidoEventosClave({ metadata }: PartidoEventosClaveProps) {
  const momentos = parseMomentosFromMetadata(metadata);
  if (momentos.length === 0) return null;

  const local = momentos.filter((m) => m.es_local).sort(byTiempo);
  const visitante = momentos.filter((m) => !m.es_local).sort(byTiempo);

  return (
    <div className="mt-4 border-t border-zinc-800/80 pt-3">
      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Eventos
      </p>
      <div className="grid grid-cols-2 gap-x-3 text-xs">
        <EventosColumn eventos={local} align="left" />
        <EventosColumn eventos={visitante} align="right" />
      </div>
    </div>
  );
}

function EventosColumn({
  eventos,
  align,
}: {
  eventos: MomentoClave[];
  align: "left" | "right";
}) {
  if (eventos.length === 0) {
    return <div className="min-h-[1.25rem]" aria-hidden />;
  }

  return (
    <div
      className={`flex flex-col gap-1.5 ${
        align === "right" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      {eventos.map((evento) => (
        <EventoCell key={evento.id} evento={evento} align={align} />
      ))}
    </div>
  );
}

function EventoCell({
  evento,
  align,
}: {
  evento: MomentoClave;
  align: "left" | "right";
}) {
  const minuto = formatMomentoMinuto(evento.minuto, evento.extra);
  const isGol = evento.tipo === "gol";

  return (
    <div
      className={`flex items-center gap-1.5 ${
        align === "right" ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <EventoIcon isGol={isGol} />
      <span className="min-w-0 leading-tight text-zinc-300">
        <span className="font-semibold text-zinc-100">{evento.jugador}</span>
        {minuto ? (
          <span className="ml-1 font-mono text-[10px] text-zinc-500">{minuto}</span>
        ) : null}
      </span>
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
