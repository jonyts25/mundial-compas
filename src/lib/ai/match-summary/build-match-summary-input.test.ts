import { describe, expect, it } from "vitest";
import {
  buildStatisticsMetadata,
  normalizeApiSportsFixtureStatistics,
} from "@/lib/api-football/match-statistics";
import { parseMatchSummaryStatisticsFromMetadata } from "@/lib/ai/match-summary/build-match-summary-input";

const HOME_ID = 1;
const AWAY_ID = 2;

describe("parseMatchSummaryStatisticsFromMetadata", () => {
  it("returns statistics when metadata.statistics is persisted", () => {
    const persisted = normalizeApiSportsFixtureStatistics(
      [
        {
          team: { id: HOME_ID, name: "Local" },
          statistics: [
            { type: "Ball Possession", value: "60%" },
            { type: "Shots on Goal", value: 4 },
            { type: "Corner Kicks", value: 5 },
            { type: "expected_goals", value: 1.1 },
          ],
        },
        {
          team: { id: AWAY_ID, name: "Visitante" },
          statistics: [
            { type: "Ball Possession", value: "40%" },
            { type: "Shots on Goal", value: 1 },
            { type: "Corner Kicks", value: 2 },
            { type: "expected_goals", value: 0.3 },
          ],
        },
      ],
      HOME_ID,
    )!;

    const meta = buildStatisticsMetadata({}, persisted);
    const stats = parseMatchSummaryStatisticsFromMetadata(meta);

    expect(stats).not.toBeNull();
    expect(stats!.possession_home_pct).toBe(60);
    expect(stats!.shots_on_away).toBe(1);
    expect(stats!.corners_home).toBe(5);
    expect(stats!.xg_home).toBe(1.1);
  });

  it("returns null when statistics not persisted", () => {
    expect(parseMatchSummaryStatisticsFromMetadata({})).toBeNull();
    expect(
      parseMatchSummaryStatisticsFromMetadata({ statistics: { foo: 1 } }),
    ).toBeNull();
  });
});

describe("match summary data_gaps for statistics", () => {
  it("implies statistics_not_persisted when parse returns null", () => {
    const stats = parseMatchSummaryStatisticsFromMetadata(null);
    const dataGaps: string[] = [];
    if (!stats) dataGaps.push("statistics_not_persisted");
    expect(dataGaps).toContain("statistics_not_persisted");
  });

  it("does not add gap when statistics exist", () => {
    const persisted = normalizeApiSportsFixtureStatistics(
      [
        {
          team: { id: HOME_ID, name: "A" },
          statistics: [{ type: "Total Shots", value: 1 }],
        },
        {
          team: { id: AWAY_ID, name: "B" },
          statistics: [{ type: "Total Shots", value: 0 }],
        },
      ],
      HOME_ID,
    )!;
    const stats = parseMatchSummaryStatisticsFromMetadata(
      buildStatisticsMetadata({}, persisted),
    );
    const dataGaps: string[] = [];
    if (!stats) dataGaps.push("statistics_not_persisted");
    expect(dataGaps).not.toContain("statistics_not_persisted");
    expect(stats).not.toBeNull();
  });
});
