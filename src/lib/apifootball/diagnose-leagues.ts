import { apifootballGet } from "@/lib/apifootball/client";
import type { ApifootballLeague } from "@/lib/apifootball/types";

const KEYWORDS = [
  "world cup",
  "mundial",
  "fifa world",
  "worldcup",
  "copa del mundo",
];

function leagueSearchText(league: ApifootballLeague): string {
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

function matchesWorldCupKeywords(league: ApifootballLeague): boolean {
  const text = leagueSearchText(league);
  const hasKeyword = KEYWORDS.some((kw) => text.includes(kw));
  const has2026 =
    text.includes("2026") ||
    Boolean(league.league_season?.includes("2026")) ||
    Boolean(league.league_year?.includes("2026"));
  return hasKeyword || (has2026 && text.includes("world"));
}

export interface MundialLeagueCandidate {
  league_id: string;
  league_name: string;
  league_season?: string;
  league_year?: string;
  country_name?: string;
  country_id?: string;
  matchReason: string;
}

export interface LeaguesDiagnosticResult {
  ok: true;
  diagnostic: "get_leagues";
  totalLeaguesInPlan: number;
  mundialCandidates: MundialLeagueCandidate[];
  suggestedLeagueId: string | null;
  envHint: string;
}

export async function diagnoseApifootballLeagues(
  apiKey: string,
): Promise<LeaguesDiagnosticResult> {
  const leagues = await apifootballGet<ApifootballLeague[] | unknown>(
    "get_leagues",
    apiKey,
    {},
  );

  if (!Array.isArray(leagues)) {
    throw new Error(
      `get_leagues inesperado: ${JSON.stringify(leagues).slice(0, 300)}`,
    );
  }

  const mundialCandidates: MundialLeagueCandidate[] = leagues
    .filter(matchesWorldCupKeywords)
    .map((l) => {
      const text = leagueSearchText(l);
      const reasons: string[] = [];
      if (KEYWORDS.some((kw) => text.includes(kw))) reasons.push("nombre liga");
      if (text.includes("2026")) reasons.push("año 2026");

      return {
        league_id: l.league_id,
        league_name: l.league_name,
        league_season: l.league_season,
        league_year: l.league_year,
        country_name: l.country_name,
        country_id: (l as ApifootballLeague & { country_id?: string }).country_id,
        matchReason: reasons.join(", ") || "coincidencia parcial",
      };
    });

  const preferred =
    mundialCandidates.find(
      (l) =>
        l.league_name.toLowerCase().includes("world cup") &&
        (l.league_season?.includes("2026") || l.league_year?.includes("2026")),
    ) ?? mundialCandidates[0];

  return {
    ok: true,
    diagnostic: "get_leagues",
    totalLeaguesInPlan: leagues.length,
    mundialCandidates,
    suggestedLeagueId: preferred?.league_id ?? null,
    envHint: preferred
      ? `Añade a .env.local: APIFOOTBALL_LEAGUE_ID=${preferred.league_id}`
      : "No se encontró Mundial 2026. Revisa mundialCandidates o amplía el plan.",
  };
}
