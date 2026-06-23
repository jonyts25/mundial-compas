import { describe, expect, it } from "vitest";
import {
  computePickAggregates,
  outcomeOf,
  outcomeLabel,
} from "@/lib/insights/pick-aggregates";

describe("pick-aggregates", () => {
  it("caso sin picks devuelve vacío", () => {
    const agg = computePickAggregates([], null);
    expect(agg.total).toBe(0);
    expect(agg.mostPopularScore).toBeNull();
    expect(agg.mostPopularOutcome).toBeNull();
    expect(agg.outcomes.every((o) => o.count === 0)).toBe(true);
  });

  it("distribuye marcadores exactos por popularidad", () => {
    const agg = computePickAggregates(
      [
        { golesLocal: 2, golesVisitante: 1 },
        { golesLocal: 2, golesVisitante: 1 },
        { golesLocal: 1, golesVisitante: 0 },
      ],
      null,
    );
    expect(agg.total).toBe(3);
    expect(agg.exactScores[0]).toMatchObject({ local: 2, visitante: 1, count: 2 });
    expect(agg.mostPopularScore?.local).toBe(2);
    expect(agg.mostPopularScore?.visitante).toBe(1);
  });

  it("distribuye 1X2 correctamente", () => {
    const agg = computePickAggregates(
      [
        { golesLocal: 1, golesVisitante: 0 },
        { golesLocal: 0, golesVisitante: 1 },
        { golesLocal: 1, golesVisitante: 1 },
        { golesLocal: 1, golesVisitante: 1 },
      ],
      null,
    );
    const byOutcome = Object.fromEntries(agg.outcomes.map((o) => [o.outcome, o.count]));
    expect(byOutcome.local).toBe(1);
    expect(byOutcome.visitante).toBe(1);
    expect(byOutcome.empate).toBe(2);
    expect(agg.mostPopularOutcome?.outcome).toBe("empate");
  });

  it("caso empate como resultado más popular", () => {
    const agg = computePickAggregates(
      Array.from({ length: 6 }, () => ({ golesLocal: 0, golesVisitante: 0 })),
      null,
    );
    expect(agg.mostPopularOutcome?.outcome).toBe("empate");
    expect(agg.mostPopularOutcome?.pct).toBe(100);
  });

  it("calcula share del usuario y acierto exacto", () => {
    const agg = computePickAggregates(
      [
        { golesLocal: 2, golesVisitante: 1, esYo: true },
        { golesLocal: 2, golesVisitante: 1 },
        { golesLocal: 0, golesVisitante: 0 },
      ],
      { local: 2, visitante: 1 },
    );
    expect(agg.userScore).toEqual({ local: 2, visitante: 1 });
    expect(agg.userScoreSharePct).toBe(67);
    expect(agg.exactMatchPct).toBe(67);
    expect(agg.userMatchedExact).toBe(true);
  });

  it("outcomeOf y labels", () => {
    expect(outcomeOf(2, 1)).toBe("local");
    expect(outcomeOf(0, 1)).toBe("visitante");
    expect(outcomeOf(1, 1)).toBe("empate");
    expect(outcomeLabel("empate")).toBe("Empate");
  });
});
