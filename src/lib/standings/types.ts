export interface StandingTeamRow {
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
}

export interface StandingGroup {
  /** Ej. "A" → título "Grupo A" */
  groupKey: string;
  groupLabel: string;
  teams: StandingTeamRow[];
}

export interface GroupStandingsSnapshot {
  leagueId: string;
  leagueName: string | null;
  fetchedAt: string;
  groups: StandingGroup[];
}
