import { DisclaimerBlock } from "@/components/legal/DisclaimerBlock";
import { GrupoEliminacionSolicitud } from "@/components/grupos/GrupoEliminacionSolicitud";
import {
  MODO_COMPETENCIA_DESCRIPCIONES,
  MODO_COMPETENCIA_LABELS,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import type { EliminacionSolicitudRow } from "@/lib/liga/eliminacion-solicitudes";
import {
  DISCLAIMER_ADMIN_GRUPO,
  DISCLAIMER_COOPERACHA,
  DISCLAIMER_QUINIELA_INMUTABLE,
} from "@/lib/legal/disclaimers";
import {
  TIPO_QUINIELA_DESCRIPCIONES,
  TIPO_QUINIELA_LABELS,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";

interface GrupoConfigPanelProps {
  ligaId: string;
  grupoSlug: string;
  tipoQuiniela: TipoQuiniela;
  modoCompetencia: ModoCompetencia;
  activa: boolean;
  solicitudEliminacion: EliminacionSolicitudRow | null;
}

export function GrupoConfigPanel({
  ligaId,
  grupoSlug,
  tipoQuiniela,
  modoCompetencia,
  activa,
  solicitudEliminacion,
}: GrupoConfigPanelProps) {
  return (
    <div className="space-y-4">
      <DisclaimerBlock title="Administración" body={DISCLAIMER_ADMIN_GRUPO} compact />

      <DisclaimerBlock
        title="Configuración fija"
        body={DISCLAIMER_QUINIELA_INMUTABLE}
        compact
      />

      {modoCompetencia === "cooperacion" && (
        <DisclaimerBlock title="Cooperacha" body={DISCLAIMER_COOPERACHA} compact />
      )}

      <dl className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase text-zinc-500">
            Tipo de quiniela
          </dt>
          <dd className="mt-0.5 font-semibold text-white">
            {TIPO_QUINIELA_LABELS[tipoQuiniela]}
          </dd>
          <dd className="mt-0.5 text-xs text-zinc-500">
            {TIPO_QUINIELA_DESCRIPCIONES[tipoQuiniela]}
          </dd>
          <dd className="mt-1 text-[10px] font-medium text-zinc-600">
            Solo lectura · definido al crear
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-zinc-500">
            Modo de competencia
          </dt>
          <dd className="mt-0.5 font-semibold text-white">
            {MODO_COMPETENCIA_LABELS[modoCompetencia]}
          </dd>
          <dd className="mt-0.5 text-xs text-zinc-500">
            {MODO_COMPETENCIA_DESCRIPCIONES[modoCompetencia]}
          </dd>
          <dd className="mt-1 text-[10px] font-medium text-zinc-600">
            Solo lectura · definido al crear
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-zinc-500">
            Estado
          </dt>
          <dd className="mt-0.5 text-zinc-300">
            {activa ? "Activo" : "Inactivo"}
          </dd>
        </div>
      </dl>

      <GrupoEliminacionSolicitud
        ligaId={ligaId}
        grupoSlug={grupoSlug}
        solicitud={solicitudEliminacion}
      />

      <ul className="space-y-2">
        {["Editar nombre y descripción", "Activar o desactivar grupo"].map(
          (label) => (
            <li key={label}>
              <button
                type="button"
                disabled
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-left text-sm text-zinc-500"
              >
                {label}
                <span className="ml-2 text-[10px] font-bold uppercase text-amber-600/90">
                  Próximamente
                </span>
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
