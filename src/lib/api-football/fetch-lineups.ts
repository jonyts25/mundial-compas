import { apiSportsGet } from "@/lib/api-football/client";
import type { LineupPlayer, PartidoLineups, TeamLineup } from "@/lib/partidos/lineups-types";

type ApiSportsLineupPlayer = {
  player?: {
    name?: string;
    number?: number | string;
    pos?: string;
  };
};

type ApiSportsTeamLineup = {
  team?: { name?: string };
  coach?: { name?: string } | null;
  formation?: string | null;
  startXI?: ApiSportsLineupPlayer[];
  substitutes?: ApiSportsLineupPlayer[];
};

function mapPlayers(rows: ApiSportsLineupPlayer[] | undefined): LineupPlayer[] {
  if (!rows?.length) return [];
  return rows
    .filter((r) => r.player?.name?.trim())
    .map((r) => ({
      name: r.player!.name!.trim(),
      number: String(r.player!.number ?? "—"),
      position: r.player!.pos?.trim() || "",
    }));
}

function mapTeam(raw: ApiSportsTeamLineup | undefined): TeamLineup {
  if (!raw) {
    return { formation: null, starting: [], substitutes: [], coach: null };
  }
  return {
    formation: raw.formation?.trim() || null,
    starting: mapPlayers(raw.startXI),
    substitutes: mapPlayers(raw.substitutes),
    coach: raw.coach?.name?.trim() ?? null,
  };
}

function hasStartingXi(team: TeamLineup): boolean {
  return team.starting.length >= 7;
}

/** Alineaciones desde api-sports.io (`/fixtures/lineups`). */
export async function fetchLineupsFromApiSports(
  apiKey: string,
  fixtureId: number,
): Promise<PartidoLineups | null> {
  const { response } = await apiSportsGet<ApiSportsTeamLineup[]>(
    "/fixtures/lineups",
    apiKey,
    { fixture: fixtureId },
  );

  if (!response?.length) return null;

  const home = mapTeam(response[0]);
  const away = mapTeam(response[1]);

  if (!hasStartingXi(home) && !hasStartingXi(away)) {
    return null;
  }

  return {
    home,
    away,
    fetchedAt: new Date().toISOString(),
    notifiedAt: null,
  };
}
