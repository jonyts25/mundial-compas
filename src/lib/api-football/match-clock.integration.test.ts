import { describe, expect, it } from "vitest";
import { buildRelojFromApiSportsFixture } from "@/lib/api-football/match-clock";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import {
  computeDisplayMinute,
  formatMatchClockDisplay,
  parseRelojFromMetadata,
} from "@/lib/partidos/match-clock";

function mockFixture(
  short: string,
  elapsed: number | null,
  extra: number | null = null,
): ApiFootballFixtureItem {
  return {
    fixture: {
      id: 1,
      date: "2026-07-02T23:00:00+00:00",
      timestamp: 0,
      status: { short, long: short, elapsed, extra },
    },
    league: { season: 2026 },
    teams: {
      home: { id: 1, name: "Portugal" },
      away: { id: 2, name: "Croatia" },
    },
    goals: { home: 1, away: 1 },
  };
}

describe("buildRelojFromApiSportsFixture integration", () => {
  it("secuencia 2T hasta 90+18 sin regresar a 46", () => {
    const steps: Array<{
      short: string;
      elapsed: number | null;
      extra: number | null;
      expectMinute: number;
      minAtLeast?: boolean;
    }> = [
      { short: "2H", elapsed: 46, extra: null, expectMinute: 46 },
      { short: "2H", elapsed: 72, extra: null, expectMinute: 72 },
      { short: "2H", elapsed: 88, extra: null, expectMinute: 88 },
      { short: "2H", elapsed: 46, extra: 18, expectMinute: 108 },
      { short: "2H", elapsed: 46, extra: null, expectMinute: 108, minAtLeast: true },
    ];

    let metadata: Record<string, unknown> | undefined;
    let now = new Date("2026-07-02T23:50:00.000Z");

    for (const step of steps) {
      const result = buildRelojFromApiSportsFixture(
        mockFixture(step.short, step.elapsed, step.extra),
        metadata,
        now,
      );
      metadata = { reloj: result.reloj };
      const parsed = parseRelojFromMetadata(metadata);
      const minute =
        computeDisplayMinute(parsed, now.getTime()) ?? result.minuto_actual;

      if (step.minAtLeast) {
        expect(minute).toBeGreaterThanOrEqual(step.expectMinute);
        expect(minute).toBeLessThanOrEqual(step.expectMinute + 3);
      } else {
        expect(minute).toBe(step.expectMinute);
      }
      now = new Date(now.getTime() + 60_000);
    }
  });

  it("muestra texto correcto por fase", () => {
    const cases: Array<{
      short: string;
      elapsed: number | null;
      extra: number | null;
      text: string;
    }> = [
      { short: "1H", elapsed: 23, extra: null, text: "23'" },
      { short: "1H", elapsed: 45, extra: 3, text: "48'" },
      { short: "2H", elapsed: 90, extra: 18, text: "108'" },
      { short: "ET", elapsed: 95, extra: null, text: "95' TE" },
      { short: "ET", elapsed: 105, extra: 2, text: "107' TE" },
    ];

    for (const c of cases) {
      const { reloj, minuto_actual } = buildRelojFromApiSportsFixture(
        mockFixture(c.short, c.elapsed, c.extra),
      );
      const display = formatMatchClockDisplay(
        "en_vivo",
        parseRelojFromMetadata({ reloj }),
        minuto_actual,
      );
      expect(display.text).toBe(c.text);
    }
  });

  it("medio tiempo no muestra minuto", () => {
    const { reloj } = buildRelojFromApiSportsFixture(
      mockFixture("HT", null, null),
    );
    const display = formatMatchClockDisplay(
      "medio_tiempo",
      parseRelojFromMetadata({ reloj }),
      null,
    );
    expect(display.text).toBe("Medio tiempo");
    expect(display.minute).toBeNull();
  });

  it("final FT sin minuto en pantalla", () => {
    const { reloj } = buildRelojFromApiSportsFixture(
      mockFixture("FT", 90, null),
    );
    const display = formatMatchClockDisplay(
      "finalizado",
      parseRelojFromMetadata({ reloj }),
      90,
    );
    expect(display.text).toBe("Final");
    expect(display.minute).toBeNull();
  });
});
