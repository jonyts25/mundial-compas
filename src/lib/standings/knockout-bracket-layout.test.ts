import { describe, expect, it } from "vitest";
import {
  getFeederMatchNumbers,
  getKnockoutAdvancementMap,
  isBracketAlignedWithAdjacentR32,
  KNOCKOUT_BRACKET_DISPLAY_ORDER,
  knockoutBracketRow,
  sortMatchesForBracketDisplay,
} from "@/lib/standings/knockout-bracket-layout";
import type { KnockoutMatch } from "@/lib/standings/knockout-bracket-types";
import {
  KNOCKOUT_SCHEDULE_BY_MATCH,
  WORLD_CUP_KNOCKOUT_SCHEDULE,
} from "@/lib/standings/world-cup-knockout-schedule";

function mockMatch(matchNumber: number): KnockoutMatch {
  const entry = KNOCKOUT_SCHEDULE_BY_MATCH[matchNumber];
  return {
    matchNumber,
    phase: entry.phase,
    home: { label: "H", teamId: null, teamName: null, isProvisional: true, isLocked: false },
    away: { label: "A", teamId: null, teamName: null, isProvisional: true, isLocked: false },
    schedule: {
      partidoId: null,
      fechaKickoff: null,
      dateLabel: "",
      timeLabel: null,
      sede: "",
    },
    isDefined: false,
  };
}

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

  it("R32 agrupa P73 y P75 consecutivos (feeders de P90)", () => {
    const r32 = KNOCKOUT_BRACKET_DISPLAY_ORDER.r32;
    const i73 = r32.indexOf(73);
    const i75 = r32.indexOf(75);
    expect(i73).toBeGreaterThanOrEqual(0);
    expect(Math.abs(i73 - i75)).toBe(1);
    expect(r32.indexOf(74)).not.toBe(i73 + 1);
  });

  it("R32 agrupa P74 y P77 consecutivos (feeders de P89)", () => {
    const r32 = KNOCKOUT_BRACKET_DISPLAY_ORDER.r32;
    const i74 = r32.indexOf(74);
    const i77 = r32.indexOf(77);
    expect(Math.abs(i74 - i77)).toBe(1);
  });

  it("cada partido alinea sus dos feeders consecutivos en la ronda anterior", () => {
    const pairs: Array<[keyof typeof KNOCKOUT_BRACKET_DISPLAY_ORDER, keyof typeof KNOCKOUT_BRACKET_DISPLAY_ORDER]> = [
      ["r16", "r32"],
      ["qf", "r16"],
      ["sf", "qf"],
      ["final", "sf"],
      ["third", "sf"],
    ];

    for (const [phase, prevPhase] of pairs) {
      for (const matchNumber of KNOCKOUT_BRACKET_DISPLAY_ORDER[phase]) {
        const feeders = getFeederMatchNumbers(
          KNOCKOUT_SCHEDULE_BY_MATCH[matchNumber],
        );
        const [a, b] = feeders;
        const prev = KNOCKOUT_BRACKET_DISPLAY_ORDER[prevPhase];
        const ia = prev.indexOf(a);
        const ib = prev.indexOf(b);
        expect(ia).toBeGreaterThanOrEqual(0);
        expect(ib).toBeGreaterThanOrEqual(0);
        expect(Math.abs(ia - ib)).toBe(1);
      }
    }
  });

  it("sortMatchesForBracketDisplay respeta el orden del cuadro", () => {
    const r16 = WORLD_CUP_KNOCKOUT_SCHEDULE.filter((e) => e.phase === "r16").map(
      (e) => mockMatch(e.matchNumber),
    );
    const sorted = sortMatchesForBracketDisplay("r16", r16).map((m) => m.matchNumber);
    expect(sorted).toEqual(KNOCKOUT_BRACKET_DISPLAY_ORDER.r16);
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
});
