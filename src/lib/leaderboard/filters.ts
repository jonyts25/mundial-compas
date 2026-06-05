import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { getMexicoDayBounds } from "@/lib/datetime/mexico";
import { FASE_MUNDIAL_LABELS } from "@/lib/liga/partido-filters";
import type { TipoQuiniela } from "@/lib/liga/tipo-quiniela";
import type { FaseMundial } from "@/types/database";

export type LeaderboardModoSegmento = "segmento" | "acumulado";

export interface LeaderboardFilters {
  jornada?: number | null;
  fase?: FaseMundial | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  modoSegmento: LeaderboardModoSegmento;
}

const FASES_VALIDAS: FaseMundial[] = [
  "grupos",
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_lugar",
  "final",
];

export function parseFaseParam(value: string | undefined): FaseMundial | null {
  if (!value) return null;
  return FASES_VALIDAS.includes(value as FaseMundial)
    ? (value as FaseMundial)
    : null;
}

export function parseJornadaParam(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

export interface ResolveLeaderboardFiltersInput {
  tipoQuiniela: TipoQuiniela;
  jornadaParam?: string;
  faseParam?: string;
  vistaParam?: string;
}

/** Construye filtros RPC según tipo de quiniela y query string. */
export function resolveLeaderboardFilters(
  input: ResolveLeaderboardFiltersInput,
): LeaderboardFilters {
  const acumulado = input.vistaParam === "acumulado";

  if (acumulado || input.tipoQuiniela === "mundial_completo") {
    return { modoSegmento: "acumulado" };
  }

  switch (input.tipoQuiniela) {
    case "por_jornada": {
      const jornada = parseJornadaParam(input.jornadaParam);
      return {
        modoSegmento: jornada != null ? "segmento" : "acumulado",
        jornada,
      };
    }
    case "por_fase": {
      const fase = parseFaseParam(input.faseParam);
      return {
        modoSegmento: fase ? "segmento" : "acumulado",
        fase,
      };
    }
    case "express_dia": {
      if (acumulado) {
        return { modoSegmento: "acumulado" };
      }
      const { start, end } = getMexicoDayBounds();
      return {
        modoSegmento: "segmento",
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      };
    }
    default:
      return { modoSegmento: "acumulado" };
  }
}

/** Parámetros para RPC (null = sin filtro). */
export function toRpcFilterArgs(filters: LeaderboardFilters): {
  p_jornada: number | null;
  p_fase: string | null;
  p_date_from: string | null;
  p_date_to: string | null;
} {
  if (filters.modoSegmento === "acumulado") {
    return {
      p_jornada: null,
      p_fase: null,
      p_date_from: null,
      p_date_to: null,
    };
  }
  return {
    p_jornada: filters.jornada ?? null,
    p_fase: filters.fase ?? null,
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
  };
}

export function leaderboardSegmentLabel(
  filters: LeaderboardFilters,
  tipoQuiniela: TipoQuiniela,
): string {
  if (filters.modoSegmento === "acumulado") {
    return tipoQuiniela === "mundial_completo"
      ? "Torneo completo"
      : "Acumulado general";
  }
  if (filters.jornada != null) return `Jornada ${filters.jornada}`;
  if (filters.fase) return FASE_MUNDIAL_LABELS[filters.fase];
  if (tipoQuiniela === "express_dia") return "Partidos de hoy (CDMX)";
  return "Segmento";
}

export function isGlobalHonorLeaderboard(ligaId: string): boolean {
  return ligaId === LIGA_GLOBAL_ID;
}
