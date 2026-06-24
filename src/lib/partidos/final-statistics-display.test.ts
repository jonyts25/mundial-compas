import { describe, expect, it } from "vitest";
import {
  formatStatNumber,
  showExpectedGoalsRow,
} from "@/lib/partidos/final-statistics-display";
import type { PersistedMatchStatistics } from "@/lib/api-football/match-statistics";

const base: PersistedMatchStatistics = {
  provider: "api-sports",
  fetched_at: "2026-01-01T00:00:00Z",
  possession_home_pct: 50,
  possession_away_pct: 50,
  shots_total_home: 1,
  shots_total_away: 1,
  shots_on_home: 1,
  shots_on_away: 1,
  corners_home: 1,
  corners_away: 1,
  fouls_home: 1,
  fouls_away: 1,
  offsides_home: 1,
  offsides_away: 1,
  xg_home: null,
  xg_away: null,
};

describe("showExpectedGoalsRow", () => {
  it("returns false when both xG are null", () => {
    expect(showExpectedGoalsRow(base)).toBe(false);
  });

  it("returns true when any xG is present", () => {
    expect(showExpectedGoalsRow({ ...base, xg_home: 1.2 })).toBe(true);
    expect(showExpectedGoalsRow({ ...base, xg_away: 0.5 })).toBe(true);
  });
});

describe("formatStatNumber", () => {
  it("formats integers and decimals", () => {
    expect(formatStatNumber(19)).toBe("19");
    expect(formatStatNumber(1.42)).toBe("1.42");
    expect(formatStatNumber(null)).toBe("—");
  });
});
