/**
 * Sports Core — contratos de partido y competencia.
 * TypeScript puro. Sin React, Next, Supabase ni UI.
 */

/** Equipo canónico (selección, club o amateur). */
export interface Team {
  id: string;
  name: string;
  shortName?: string;
  crestUrl?: string;
  externalIds?: Record<string, string>;
}

export type CompetitionFormat =
  | "league"
  | "groups_knockout"
  | "knockout_only"
  | "custom";

/** Competencia / torneo (Mundial, Liga MX, amateur, etc.). */
export interface Competition {
  id: string;
  slug: string;
  name: string;
  format: CompetitionFormat;
  timezone?: string;
}

export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "cancelled";

export interface MatchScore {
  home: number;
  away: number;
}

/** Partido normalizado cross-producto. */
export interface Match {
  id: string;
  competitionId: string;
  seasonId?: string;
  /** Jornada / matchday. */
  round?: string | number;
  /** Fase del torneo (grupos, octavos, regular, etc.). */
  phase?: string;
  /** Clave de grupo en formatos con fase de grupos. */
  groupKey?: string;
  home: Team;
  away: Team;
  kickoffAt: string;
  status: MatchStatus;
  score?: MatchScore;
}

export function isScheduledMatch(match: Pick<Match, "status">): boolean {
  return match.status === "scheduled" || match.status === "postponed";
}

export function isLiveMatch(match: Pick<Match, "status">): boolean {
  return match.status === "live" || match.status === "halftime";
}

export function isFinishedMatch(match: Pick<Match, "status">): boolean {
  return match.status === "finished" || match.status === "cancelled";
}

/**
 * Mapping referencia — Mundial Compas `partidos.estatus` → `MatchStatus`.
 * Implementación en adapter SC-6; documentado aquí para SC-2.
 */
export type MundialPartidoEstatus =
  | "programado"
  | "aplazado"
  | "en_vivo"
  | "medio_tiempo"
  | "finalizado";

export const MUNDIAL_ESTATUS_TO_MATCH_STATUS: Record<
  MundialPartidoEstatus,
  MatchStatus
> = {
  programado: "scheduled",
  aplazado: "postponed",
  en_vivo: "live",
  medio_tiempo: "halftime",
  finalizado: "finished",
};
