import type { ApiSportsFixtureStatisticsTeam } from "@/lib/api-football/fetch-statistics";

export const MATCH_STATISTICS_PROVIDER = "api-sports" as const;

export interface PersistedMatchStatistics {
  provider: typeof MATCH_STATISTICS_PROVIDER;
  fetched_at: string;
  possession_home_pct: number | null;
  possession_away_pct: number | null;
  shots_total_home: number | null;
  shots_total_away: number | null;
  shots_on_home: number | null;
  shots_on_away: number | null;
  corners_home: number | null;
  corners_away: number | null;
  fouls_home: number | null;
  fouls_away: number | null;
  offsides_home: number | null;
  offsides_away: number | null;
  xg_home: number | null;
  xg_away: number | null;
}

const STAT_ALIASES: Record<keyof Omit<PersistedMatchStatistics, "provider" | "fetched_at">, string[]> = {
  possession_home_pct: ["Ball Possession"],
  possession_away_pct: ["Ball Possession"],
  shots_total_home: ["Total Shots"],
  shots_total_away: ["Total Shots"],
  shots_on_home: ["Shots on Goal"],
  shots_on_away: ["Shots on Goal"],
  corners_home: ["Corner Kicks"],
  corners_away: ["Corner Kicks"],
  fouls_home: ["Fouls"],
  fouls_away: ["Fouls"],
  offsides_home: ["Offsides"],
  offsides_away: ["Offsides"],
  xg_home: ["expected_goals", "Expected Goals", "Expected goals"],
  xg_away: ["expected_goals", "Expected Goals", "Expected goals"],
};

function parseStatValue(raw: number | string | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  const pct = s.endsWith("%") ? s.slice(0, -1).trim() : s;
  const n = Number.parseFloat(pct);
  return Number.isFinite(n) ? n : null;
}

function pickStat(
  stats: ApiSportsFixtureStatisticsTeam["statistics"],
  types: string[],
): number | null {
  for (const type of types) {
    const row = stats.find((s) => s.type === type);
    if (!row) continue;
    const parsed = parseStatValue(row.value);
    if (parsed != null) return parsed;
  }
  return null;
}

function teamBlock(
  teams: ApiSportsFixtureStatisticsTeam[],
  homeTeamId: number,
): { home: ApiSportsFixtureStatisticsTeam | null; away: ApiSportsFixtureStatisticsTeam | null } {
  const home = teams.find((t) => t.team.id === homeTeamId) ?? null;
  const away = teams.find((t) => t.team.id !== homeTeamId) ?? null;
  return { home, away };
}

export function normalizeApiSportsFixtureStatistics(
  teams: ApiSportsFixtureStatisticsTeam[],
  homeTeamId: number,
  fetchedAt: string = new Date().toISOString(),
): PersistedMatchStatistics | null {
  if (!teams.length) return null;

  const { home, away } = teamBlock(teams, homeTeamId);
  if (!home || !away) return null;

  const value = (
    side: "home" | "away",
    key: keyof Omit<PersistedMatchStatistics, "provider" | "fetched_at">,
  ): number | null => {
    const block = side === "home" ? home : away;
    return pickStat(block.statistics ?? [], STAT_ALIASES[key]);
  };

  return {
    provider: MATCH_STATISTICS_PROVIDER,
    fetched_at: fetchedAt,
    possession_home_pct: value("home", "possession_home_pct"),
    possession_away_pct: value("away", "possession_away_pct"),
    shots_total_home: value("home", "shots_total_home"),
    shots_total_away: value("away", "shots_total_away"),
    shots_on_home: value("home", "shots_on_home"),
    shots_on_away: value("away", "shots_on_away"),
    corners_home: value("home", "corners_home"),
    corners_away: value("away", "corners_away"),
    fouls_home: value("home", "fouls_home"),
    fouls_away: value("away", "fouls_away"),
    offsides_home: value("home", "offsides_home"),
    offsides_away: value("away", "offsides_away"),
    xg_home: value("home", "xg_home"),
    xg_away: value("away", "xg_away"),
  };
}

export function hasPersistedMatchStatistics(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const raw = (metadata as Record<string, unknown>).statistics;
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Record<string, unknown>;
  return (
    s.provider === MATCH_STATISTICS_PROVIDER &&
    typeof s.fetched_at === "string" &&
    s.fetched_at.length > 0
  );
}

export function readPersistedMatchStatistics(
  metadata: unknown,
): PersistedMatchStatistics | null {
  if (!hasPersistedMatchStatistics(metadata)) return null;
  return (metadata as Record<string, unknown>).statistics as PersistedMatchStatistics;
}

export function buildStatisticsMetadata(
  metadata: unknown,
  statistics: PersistedMatchStatistics,
): Record<string, unknown> {
  const base =
    typeof metadata === "object" && metadata !== null
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return { ...base, statistics };
}
