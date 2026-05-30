import { apifootballGet } from "@/lib/apifootball/client";
import type { ApifootballLeague } from "@/lib/apifootball/types";

function leagueText(league: ApifootballLeague): string {
  return [
    league.league_name,
    league.league_season,
    league.league_year,
    league.country_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const CHAMPIONS_KEYWORDS = [
  "champions league",
  "uefa champions",
  "ucl",
  "champions leag",
];

const WORLD_CUP_KEYWORDS = ["world cup", "fifa world", "mundial"];

export async function resolveChampionsLeagueId(apiKey: string): Promise<string> {
  const leagues = await apifootballGet<ApifootballLeague[]>("get_leagues", apiKey, {});

  if (!Array.isArray(leagues)) {
    throw new Error("get_leagues no devolvió un array");
  }

  const candidates = leagues.filter((l) => {
    const text = leagueText(l);
    return CHAMPIONS_KEYWORDS.some((kw) => text.includes(kw));
  });

  const preferred =
    candidates.find((l) =>
      leagueText(l).includes("champions league"),
    ) ?? candidates[0];

  if (preferred?.league_id) return preferred.league_id;

  throw new Error(
    "No se encontró UEFA Champions League en tu plan. Define APIFOOTBALL_PILOT_LEAGUE_ID o ejecuta POST ?diagnostic=leagues&search=champions",
  );
}

export async function resolveWorldCupLeagueId(apiKey: string): Promise<string> {
  const leagues = await apifootballGet<ApifootballLeague[]>("get_leagues", apiKey, {});

  if (!Array.isArray(leagues)) {
    throw new Error("get_leagues no devolvió un array");
  }

  const wc = leagues.find(
    (l) =>
      l.league_name?.toLowerCase().includes("world cup") &&
      (l.league_season?.includes("2026") ?? l.league_year?.includes("2026")),
  );

  if (wc?.league_id) return wc.league_id;

  const wcLoose = leagues.find((l) =>
    l.league_name?.toLowerCase().includes("world cup"),
  );

  if (wcLoose?.league_id) return wcLoose.league_id;

  throw new Error(
    "No se encontró league_id del Mundial. Define APIFOOTBALL_LEAGUE_ID en .env",
  );
}

export interface LeagueSearchCandidate {
  league_id: string;
  league_name: string;
  league_season?: string;
  country_name?: string;
}

export async function searchLeaguesByKeyword(
  apiKey: string,
  keyword: string,
): Promise<LeagueSearchCandidate[]> {
  const leagues = await apifootballGet<ApifootballLeague[]>("get_leagues", apiKey, {});
  if (!Array.isArray(leagues)) return [];

  const q = keyword.trim().toLowerCase();
  return leagues
    .filter((l) => leagueText(l).includes(q))
    .slice(0, 25)
    .map((l) => ({
      league_id: l.league_id,
      league_name: l.league_name,
      league_season: l.league_season,
      country_name: l.country_name,
    }));
}

export function filterLeaguesByPreset(
  leagues: ApifootballLeague[],
  preset: "mundial" | "champions",
): LeagueSearchCandidate[] {
  const keywords = preset === "champions" ? CHAMPIONS_KEYWORDS : WORLD_CUP_KEYWORDS;
  return leagues
    .filter((l) => keywords.some((kw) => leagueText(l).includes(kw)))
    .map((l) => ({
      league_id: l.league_id,
      league_name: l.league_name,
      league_season: l.league_season,
      country_name: l.country_name,
    }));
}
