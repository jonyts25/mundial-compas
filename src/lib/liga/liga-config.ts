import {
  MODO_COMPETENCIA_DEFAULT,
  type ModoCompetencia,
} from "@/lib/liga/modo-competencia";
import {
  TIPO_QUINIELA_DEFAULT,
  type TipoQuiniela,
} from "@/lib/liga/tipo-quiniela";

export function buildConfiguracionLiga(input: {
  tipoQuiniela?: TipoQuiniela;
  modoCompetencia?: ModoCompetencia;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(input.extra ?? {}),
    tipo_quiniela: input.tipoQuiniela ?? TIPO_QUINIELA_DEFAULT,
    modo_competencia: input.modoCompetencia ?? MODO_COMPETENCIA_DEFAULT,
  };
}
