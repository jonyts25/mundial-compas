import { describe, expect, it } from "vitest";
import {
  getFeederMatchNumbers,
  getKnockoutAdvancementMap,
  knockoutBracketRow,
} from "@/lib/standings/knockout-bracket-layout";
import { isBracketAlignedWithAdjacentR32 } from "@/lib/standings/knockout-feed-labels";
import {
  KNOCKOUT_SCHEDULE_BY_MATCH,
  WORLD_CUP_KNOCKOUT_SCHEDULE,
} from "@/lib/standings/world-cup-knockout-schedule";

describe("knockout bracket layout (FIFA 2026)", () => {
  it("P89 octavos alimenta ganadores de P74 y P77, no P73 y P74", () => {
    const p89 = KNOCKOUT_SCHEDULE_BY_MATCH[89];
    expect(getFeederMatchNumbers(p89)).toEqual([74, 77]);

    expect(knockoutBracketRow(73)).toBe(0);
    expect(knockoutBracketRow(74)).toBe(1);
    expect(knockoutBracketRow(77)).toBe(4);
    expect(knockoutBracketRow(89)).toBe(2.5);

    expect(isBracketAlignedWithAdjacentR32(89, 73, 74)).toBe(false);
    expect(isBracketAlignedWithAdjacentR32(89, 74, 77)).toBe(true);
  });

  it("P90 octavos alimenta ganadores de P73 y P75", () => {
    const p90 = KNOCKOUT_SCHEDULE_BY_MATCH[90];
    expect(getFeederMatchNumbers(p90)).toEqual([73, 75]);
    expect(knockoutBracketRow(90)).toBe(1);
  });

  it("cada ganador de R32 avanza exactamente a un octavo", () => {
    const { winnerNext } = getKnockoutAdvancementMap();

    for (let m = 73; m <= 88; m++) {
      expect(winnerNext.get(m)).toBeGreaterThanOrEqual(89);
      expect(winnerNext.get(m)).toBeLessThanOrEqual(96);
    }
  });

  it("cada partido post-R32 tiene dos feeders de ganador o perdedor", () => {
    for (const entry of WORLD_CUP_KNOCKOUT_SCHEDULE) {
      if (entry.phase === "r32") continue;

      const feeders = getFeederMatchNumbers(entry);
      expect(feeders).toHaveLength(2);

      for (const feeder of feeders) {
        expect(feeder).toBeLessThan(entry.matchNumber);
      }
    }
  });

  it("filas del bracket son monótonas entre rondas (sin saltos invertidos)", () => {
    for (const entry of WORLD_CUP_KNOCKOUT_SCHEDULE) {
      if (entry.phase === "r32") continue;

      const feeders = getFeederMatchNumbers(entry);
      const [a, b] = feeders;
      const row = knockoutBracketRow(entry.matchNumber);
      expect(row).toBe((knockoutBracketRow(a) + knockoutBracketRow(b)) / 2);
    }
  });
});
