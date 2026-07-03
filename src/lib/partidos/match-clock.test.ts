import { describe, expect, it } from "vitest";
import { buildClockState, computeDisplayMinute } from "@/lib/partidos/match-clock";

describe("buildClockState", () => {
  it("no regresa a 46 si la API repite elapsed al inicio del 2T", () => {
    const anchoredAt = new Date("2026-07-02T23:50:00.000Z");
    const now = new Date("2026-07-03T00:38:00.000Z"); // +48 min
    const prev = {
      period: "2H" as const,
      anchorMinute: 88,
      anchoredAt: anchoredAt.toISOString(),
      ticking: true,
    };

    const next = buildClockState(
      "2H",
      "en_vivo",
      46,
      prev,
      { statusShort: "2H" },
      now,
    );

    expect(next.anchorMinute).toBeGreaterThanOrEqual(88);
    expect(next.anchorMinute).toBeLessThanOrEqual(93);
  });

  it("acepta avance normal de la API", () => {
    const prev = {
      period: "2H" as const,
      anchorMinute: 70,
      anchoredAt: new Date().toISOString(),
      ticking: true,
    };

    const next = buildClockState(
      "2H",
      "en_vivo",
      75,
      prev,
      { statusShort: "2H" },
    );

    expect(next.anchorMinute).toBe(75);
  });
});

describe("computeDisplayMinute", () => {
  it("interpola hasta +3 min entre polls", () => {
    const anchoredAt = Date.now() - 120_000;
    const minute = computeDisplayMinute(
      {
        period: "2H",
        anchorMinute: 90,
        anchoredAt: new Date(anchoredAt).toISOString(),
        ticking: true,
      },
      Date.now(),
    );
    expect(minute).toBe(92);
  });
});
