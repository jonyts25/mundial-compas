import { describe, expect, it } from "vitest";
import type { ApiSportsFixtureStatisticsTeam } from "@/lib/api-football/fetch-statistics";
import {
  buildStatisticsMetadata,
  hasPersistedMatchStatistics,
  normalizeApiSportsFixtureStatistics,
  readPersistedMatchStatistics,
} from "@/lib/api-football/match-statistics";

const HOME_ID = 10;
const AWAY_ID = 20;

function sampleTeams(): ApiSportsFixtureStatisticsTeam[] {
  return [
    {
      team: { id: HOME_ID, name: "England" },
      statistics: [
        { type: "Ball Possession", value: "58%" },
        { type: "Total Shots", value: 14 },
        { type: "Shots on Goal", value: 5 },
        { type: "Corner Kicks", value: 7 },
        { type: "Fouls", value: 11 },
        { type: "Offsides", value: 2 },
        { type: "expected_goals", value: "1.42" },
      ],
    },
    {
      team: { id: AWAY_ID, name: "Ghana" },
      statistics: [
        { type: "Ball Possession", value: "42%" },
        { type: "Total Shots", value: 9 },
        { type: "Shots on Goal", value: 2 },
        { type: "Corner Kicks", value: 3 },
        { type: "Fouls", value: 15 },
        { type: "Offsides", value: 1 },
        { type: "expected_goals", value: "0.61" },
      ],
    },
  ];
}

describe("normalizeApiSportsFixtureStatistics", () => {
  it("maps home/away stats with percent and numeric values", () => {
    const out = normalizeApiSportsFixtureStatistics(
      sampleTeams(),
      HOME_ID,
      "2026-06-23T12:00:00.000Z",
    );
    expect(out).not.toBeNull();
    expect(out!.provider).toBe("api-sports");
    expect(out!.fetched_at).toBe("2026-06-23T12:00:00.000Z");
    expect(out!.possession_home_pct).toBe(58);
    expect(out!.possession_away_pct).toBe(42);
    expect(out!.shots_total_home).toBe(14);
    expect(out!.shots_on_away).toBe(2);
    expect(out!.corners_home).toBe(7);
    expect(out!.fouls_away).toBe(15);
    expect(out!.offsides_home).toBe(2);
    expect(out!.xg_home).toBe(1.42);
    expect(out!.xg_away).toBe(0.61);
  });

  it("returns null for missing team blocks", () => {
    expect(normalizeApiSportsFixtureStatistics([], HOME_ID)).toBeNull();
  });

  it("uses null for absent stat types", () => {
    const partial: ApiSportsFixtureStatisticsTeam[] = [
      {
        team: { id: HOME_ID, name: "A" },
        statistics: [{ type: "Total Shots", value: 3 }],
      },
      {
        team: { id: AWAY_ID, name: "B" },
        statistics: [{ type: "Total Shots", value: 1 }],
      },
    ];
    const out = normalizeApiSportsFixtureStatistics(partial, HOME_ID)!;
    expect(out.shots_total_home).toBe(3);
    expect(out.possession_home_pct).toBeNull();
    expect(out.xg_away).toBeNull();
  });
});

describe("hasPersistedMatchStatistics", () => {
  it("detects persisted statistics metadata", () => {
    const stats = normalizeApiSportsFixtureStatistics(sampleTeams(), HOME_ID)!;
    const meta = buildStatisticsMetadata({}, stats);
    expect(hasPersistedMatchStatistics(meta)).toBe(true);
    expect(readPersistedMatchStatistics(meta)?.shots_on_home).toBe(5);
  });

  it("returns false when statistics missing", () => {
    expect(hasPersistedMatchStatistics({})).toBe(false);
    expect(hasPersistedMatchStatistics({ statistics: { provider: "x" } })).toBe(
      false,
    );
  });
});
