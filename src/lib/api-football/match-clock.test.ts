import { describe, expect, it } from "vitest";
import { normalizeApiSportsElapsed } from "@/lib/api-football/match-clock";
import type { MatchClockState } from "@/lib/partidos/match-clock";

describe("normalizeApiSportsElapsed", () => {
  it("2H 90+18 con elapsed=90 y extra=18", () => {
    expect(normalizeApiSportsElapsed("2H", 90, 18, null)).toBe(108);
  });

  it("2H 90+18 con elapsed=46 y extra=18 (base debe ser 90, no 46)", () => {
    expect(normalizeApiSportsElapsed("2H", 46, 18, null)).toBe(108);
  });

  it("2H tiempo añadido con contador <46", () => {
    expect(normalizeApiSportsElapsed("2H", 18, null, null)).toBe(108);
  });

  it("no regresa a 46 si prevMin ya va en 90+", () => {
    const prev: MatchClockState = {
      period: "2H",
      anchorMinute: 92,
      anchoredAt: new Date().toISOString(),
      ticking: true,
    };
    expect(normalizeApiSportsElapsed("2H", 46, null, prev)).toBe(92);
  });

  it("1H 45+3 con extra", () => {
    expect(normalizeApiSportsElapsed("1H", 45, 3, null)).toBe(48);
  });
});
