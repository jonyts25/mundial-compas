import { formatMexicoKickoff } from "@/lib/datetime/mexico";
import { getCanalDisplay } from "@/lib/partidos/labels";
import type { PartidoDetalle } from "@/lib/partidos/detail-queries";
import { PartidoAlineaciones } from "@/components/partidos/PartidoAlineaciones";
import { readLineupsFromMetadata } from "@/lib/partidos/lineups-types";

interface PartidoInfoPanelProps {
  partido: PartidoDetalle;
}

export function PartidoInfoPanel({ partido }: PartidoInfoPanelProps) {
  const canal = getCanalDisplay(partido.canal_transmision);
  const { fecha: kickoffFecha, hora: kickoffHora } = formatMexicoKickoff(
    partido.fecha_kickoff,
  );
  const lineups = readLineupsFromMetadata(partido.metadata);
  const grupoLabel = partido.grupo ? `Grupo ${partido.grupo}` : null;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <dl className="grid gap-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Horario (CDMX)</dt>
            <dd className="font-medium text-zinc-200">
              {kickoffFecha} · {kickoffHora}
            </dd>
          </div>
          {grupoLabel && (
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Grupo</dt>
              <dd className="font-medium text-zinc-200">{grupoLabel}</dd>
            </div>
          )}
          {partido.sede && (
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Sede</dt>
              <dd className="max-w-[60%] text-right font-medium text-zinc-200">
                {partido.sede}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">TV en México</dt>
            <dd>
              <span
                className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${canal.className}`}
              >
                {canal.label}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <PartidoAlineaciones
        partidoId={partido.id}
        localNombre={partido.equipo_local_nombre}
        visitanteNombre={partido.equipo_visitante_nombre}
        kickoffIso={partido.fecha_kickoff}
        initialLineups={lineups}
      />
    </div>
  );
}
