export interface LineupPlayer {
  name: string;
  number: string;
  position: string;
}

export interface TeamLineup {
  formation: string | null;
  starting: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach: string | null;
}

export interface PartidoLineups {
  home: TeamLineup;
  away: TeamLineup;
  fetchedAt: string;
  notifiedAt: string | null;
}

export function readLineupsFromMetadata(metadata: unknown): PartidoLineups | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).alineaciones;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!o.home || !o.away) return null;
  return raw as PartidoLineups;
}

export function isMundialPartido(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return true;
  return (metadata as Record<string, unknown>).competencia !== "pilot";
}
