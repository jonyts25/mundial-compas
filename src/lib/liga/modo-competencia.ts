export const MODOS_COMPETENCIA = ["honor", "cooperacion"] as const;

export type ModoCompetencia = (typeof MODOS_COMPETENCIA)[number];

export const MODO_COMPETENCIA_DEFAULT: ModoCompetencia = "honor";

export const MODO_COMPETENCIA_LABELS: Record<ModoCompetencia, string> = {
  honor: "Honor",
  cooperacion: "Cooperación",
};

export const MODO_COMPETENCIA_DESCRIPCIONES: Record<ModoCompetencia, string> = {
  honor:
    "Liderato y bragging rights entre amigos. La app no maneja dinero ni apuestas.",
  cooperacion:
    "Seguimiento simbólico en equipo: todos participan sin un solo ganador impuesto.",
};

export function isModoCompetencia(value: unknown): value is ModoCompetencia {
  return (
    typeof value === "string" &&
    (MODOS_COMPETENCIA as readonly string[]).includes(value)
  );
}

export function parseModoCompetenciaFromConfig(
  configuracion: unknown,
): ModoCompetencia {
  if (!configuracion || typeof configuracion !== "object") {
    return MODO_COMPETENCIA_DEFAULT;
  }
  const raw = (configuracion as Record<string, unknown>).modo_competencia;
  return isModoCompetencia(raw) ? raw : MODO_COMPETENCIA_DEFAULT;
}
