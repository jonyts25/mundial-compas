import {
  MODO_COMPETENCIA_DESCRIPCIONES,
  MODO_COMPETENCIA_LABELS,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import {
  TIPO_QUINIELA_DESCRIPCIONES,
  TIPO_QUINIELA_LABELS,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";

interface GrupoConfigPanelProps {
  tipoQuiniela: TipoQuiniela;
  modoCompetencia: ModoCompetencia;
  activa: boolean;
}

export function GrupoConfigPanel({
  tipoQuiniela,
  modoCompetencia,
  activa,
}: GrupoConfigPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        La edición de ajustes llegará pronto. Por ahora solo lectura para
        admins.
      </p>

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

      <ul className="space-y-2">
        {[
          "Editar nombre y descripción",
          "Cambiar tipo de quiniela",
          "Cambiar modo honor / cooperación",
          "Activar o desactivar grupo",
        ].map((label) => (
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
        ))}
      </ul>
    </div>
  );
}
