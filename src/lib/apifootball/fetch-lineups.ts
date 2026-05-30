import { apifootballGet } from "@/lib/apifootball/client";
import type { LineupPlayer, PartidoLineups, TeamLineup } from "@/lib/partidos/lineups-types";

type ApiLineupPlayer = {
  lineup_player?: string;
  lineup_number?: string;
  lineup_position?: string;
};

type ApiTeamLineup = {
  starting_lineups?: ApiLineupPlayer[];
  substitutes?: ApiLineupPlayer[];
  coach?: ApiLineupPlayer[];
  lineup_formation?: string;
};

type ApiLineupsResponse = Record<
  string,
  {
    lineup?: {
      home?: ApiTeamLineup;
      away?: ApiTeamLineup;
    };
  }
>;

function mapPlayers(rows: ApiLineupPlayer[] | undefined): LineupPlayer[] {
  if (!rows?.length) return [];
  return rows
    .filter((r) => r.lineup_player?.trim())
    .map((r) => ({
      name: r.lineup_player!.trim(),
      number: r.lineup_number?.trim() || "—",
      position: r.lineup_position?.trim() || "",
    }));
}

function mapTeam(raw: ApiTeamLineup | undefined): TeamLineup {
  if (!raw) {
    return { formation: null, starting: [], substitutes: [], coach: null };
  }
  const coachName = raw.coach?.[0]?.lineup_player?.trim() ?? null;
  return {
    formation: raw.lineup_formation?.trim() || null,
    starting: mapPlayers(raw.starting_lineups),
    substitutes: mapPlayers(raw.substitutes),
    coach: coachName,
  };
}

function hasStartingXi(team: TeamLineup): boolean {
  return team.starting.length >= 7;
}

export async function fetchLineupsFromApi(
  apiKey: string,
  matchId: number,
): Promise<PartidoLineups | null> {
  const data = await apifootballGet<ApiLineupsResponse | unknown[]>(
    "get_lineups",
    apiKey,
    { match_id: matchId },
  );

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const entry = data[String(matchId)] ?? Object.values(data as ApiLineupsResponse)[0];
  const home = mapTeam(entry?.lineup?.home);
  const away = mapTeam(entry?.lineup?.away);

  if (!hasStartingXi(home) && !hasStartingXi(away)) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    home,
    away,
    fetchedAt: now,
    notifiedAt: null,
  };
}
