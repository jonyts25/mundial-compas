/**
 * Sports Core — contratos de tabla / clasificación.
 * TypeScript puro.
 */

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  /** Distancia en puntos a zona de clasificación (ej. top 2 en grupos). */
  pointsFromQualificationZone?: number;
}

export interface StandingGroup {
  groupKey: string;
  groupLabel: string;
  teams: StandingRow[];
}

export interface StandingsSnapshot {
  competitionId: string;
  competitionName: string | null;
  fetchedAt: string;
  groups: StandingGroup[];
}

/**
 * Alias de compatibilidad — equivalente a `StandingTeamRow` en
 * `src/lib/standings/types.ts`. Sustituir en SC-6.
 * @deprecated Importar `StandingRow` desde sports-core.
 */
export type StandingTeamRowCompat = StandingRow;
