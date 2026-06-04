export const TIPOS_QUINIELA = [
  "mundial_completo",
  "por_jornada",
  "por_fase",
  "express_dia",
] as const;

export type TipoQuiniela = (typeof TIPOS_QUINIELA)[number];

export const TIPO_QUINIELA_DEFAULT: TipoQuiniela = "mundial_completo";

export const TIPO_QUINIELA_LABELS: Record<TipoQuiniela, string> = {
  mundial_completo: "Mundial completo",
  por_jornada: "Por jornada",
  por_fase: "Por fase",
  express_dia: "Express del día",
};

export const TIPO_QUINIELA_DESCRIPCIONES: Record<TipoQuiniela, string> = {
  mundial_completo: "Todos los partidos del torneo, como la liga global.",
  por_jornada: "Pronósticos y puntos por jornada (filtro en lista).",
  por_fase: "Solo partidos de la fase que elijas (grupos, octavos, etc.).",
  express_dia: "Solo los partidos que se juegan hoy (hora CDMX).",
};

export function isTipoQuiniela(value: unknown): value is TipoQuiniela {
  return (
    typeof value === "string" &&
    (TIPOS_QUINIELA as readonly string[]).includes(value)
  );
}

export function parseTipoQuinielaFromConfig(
  configuracion: unknown,
): TipoQuiniela {
  if (!configuracion || typeof configuracion !== "object") {
    return TIPO_QUINIELA_DEFAULT;
  }
  const raw = (configuracion as Record<string, unknown>).tipo_quiniela;
  return isTipoQuiniela(raw) ? raw : TIPO_QUINIELA_DEFAULT;
}

export function buildConfiguracionConTipo(
  tipo: TipoQuiniela,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { ...extra, tipo_quiniela: tipo };
}

/** @deprecated Usar buildConfiguracionLiga desde liga-config.ts */
