import { describe, expect, it } from "vitest";
import { computePickAggregates } from "@/lib/insights/pick-aggregates";
import { computePickValue, pickValueThresholds } from "@/lib/prediction-engine/pick-value";

function aggFromCounts(specs: { local: number; visitante: number; count: number }[]) {
  const picks = specs.flatMap((s) =>
    Array.from({ length: s.count }, () => ({
      golesLocal: s.local,
      golesVisitante: s.visitante,
    })),
  );
  return computePickAggregates(picks, null);
}

describe("pick-value", () => {
  const baseAgg = aggFromCounts([
    { local: 2, visitante: 1, count: 12 },
    { local: 1, visitante: 1, count: 5 },
    { local: 0, visitante: 0, count: 3 },
  ]);

  it("clasifica popular con riesgo bajo", () => {
    const v = computePickValue(baseAgg, { local: 2, visitante: 1 });
    expect(v.kind).toBe("popular");
    expect(v.risk).toBe("bajo");
    expect(v.isMostPopularScore).toBe(true);
  });

  it("clasifica balanceado con riesgo medio", () => {
    const agg = aggFromCounts([
      { local: 2, visitante: 1, count: 80 },
      { local: 1, visitante: 1, count: 15 },
      { local: 0, visitante: 0, count: 5 },
    ]);
    const v = computePickValue(agg, { local: 1, visitante: 1 });
    expect(v.scoreSharePct).toBe(15);
    expect(v.kind).toBe("balanceado");
    expect(v.risk).toBe("medio");
  });

  it("clasifica diferencial con riesgo alto", () => {
    const agg = aggFromCounts([
      { local: 2, visitante: 1, count: 90 },
      { local: 3, visitante: 0, count: 5 },
    ]);
    const v = computePickValue(agg, { local: 3, visitante: 0 });
    expect(v.scoreSharePct).toBe(5);
    expect(v.kind).toBe("diferencial");
    expect(v.risk).toBe("alto");
  });

  it("clasifica raro con riesgo extremo", () => {
    const agg = aggFromCounts([
      { local: 1, visitante: 0, count: 98 },
      { local: 5, visitante: 4, count: 2 },
    ]);
    const v = computePickValue(agg, { local: 5, visitante: 4 });
    expect(v.scoreSharePct).toBe(2);
    expect(v.kind).toBe("raro");
    expect(v.risk).toBe("extremo");
  });

  it("sample insuficiente", () => {
    const agg = computePickAggregates(
      [{ golesLocal: 1, golesVisitante: 0 }],
      null,
    );
    const v = computePickValue(agg, { local: 1, visitante: 0 });
    expect(v.sampleOk).toBe(false);
    expect(v.message).toContain("pocos pronósticos");
  });

  it("respeta minSample custom", () => {
    const agg = aggFromCounts([{ local: 1, visitante: 0, count: 4 }]);
    const v = computePickValue(
      agg,
      { local: 1, visitante: 0 },
      { minSample: 3 },
    );
    expect(v.sampleOk).toBe(true);
    expect(pickValueThresholds.minSample).toBe(5);
  });
});
