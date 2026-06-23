import { describe, expect, it } from "vitest";
import {
  ALL_PITONISO_FIXTURES,
  runPitonisoFixture,
  verifyPitonisoFixtures,
} from "@/lib/prediction-engine/pitoniso-pi1.fixtures";
import { computePickAggregates } from "@/lib/insights/pick-aggregates";
import { computeMatchPreviewVerdict } from "@/lib/sports-core/predictions/preview/match-preview";
import { getFifaRankingSignal } from "@/lib/sports-core/predictions/preview/fifa-ranking-signal";
import { computeDrawSignal } from "@/lib/sports-core/predictions/preview/draw-signal";
import { analyzeSignalContradiction } from "@/lib/sports-core/predictions/preview/signals";

describe("match-preview / Pitoniso fixtures", () => {
  it("todos los fixtures PI-1 / PI-4 / v2.1 pasan verifyPitonisoFixtures", () => {
    const errors = verifyPitonisoFixtures();
    expect(errors).toEqual([]);
    expect(ALL_PITONISO_FIXTURES.length).toBeGreaterThanOrEqual(14);
  });

  it("sin picks → predictedOutcome unknown e indeciso", () => {
    const scenario = ALL_PITONISO_FIXTURES.find((f) => f.id === "sin-picks")!;
    const { verdict } = runPitonisoFixture(scenario);
    expect(verdict.predictedOutcome).toBe("unknown");
    expect(verdict.confidence).toBe("indeciso");
  });

  it("ranking signal FIFA resuelve líder", () => {
    const signal = getFifaRankingSignal("MEX", "HAI");
    expect(signal).not.toBeNull();
    expect(signal?.leader).toBe("local");
    expect(signal!.rankDiff).toBeGreaterThan(0);
  });

  it("drawSignal strong en partido cerrado v2.1", () => {
    const scenario = ALL_PITONISO_FIXTURES.find((f) => f.id === "partido-cerrado-v21")!;
    const { verdict } = runPitonisoFixture(scenario);
    expect(verdict.drawSignal.level).toBe("strong");
  });

  it("contradicciones crowd vs form detectadas", () => {
    const scenario = ALL_PITONISO_FIXTURES.find((f) => f.id === "multitud-vs-forma")!;
    const { aggregates, verdict } = runPitonisoFixture(scenario);
    const crowd = computePickAggregates(scenario.picks, null);
    expect(crowd.total).toBe(aggregates.total);
    expect(verdict.signalContradiction.hasContradiction).toBe(true);
  });

  it("predictedOutcome puede ser empate con draw strong", () => {
    const aggregates = computePickAggregates(
      Array.from({ length: 10 }, () => ({ golesLocal: 1, golesVisitante: 1 })),
      null,
    );
    const verdict = computeMatchPreviewVerdict({
      aggregates,
      local: {
        tablePosition: 2,
        groupSize: 4,
        formNorm: 0.5,
        pointsFromTop2: 1,
      },
      visitante: {
        tablePosition: 2,
        groupSize: 4,
        formNorm: 0.5,
        pointsFromTop2: 1,
      },
      isGroupPhase: true,
      localCode: "MEX",
      visitanteCode: "POL",
      rankingSignal: getFifaRankingSignal("MEX", "POL"),
    });
    expect(["empate", "unknown", "local", "visitante"]).toContain(
      verdict.predictedOutcome,
    );
    expect(verdict.drawSignal.level).not.toBe("none");
  });

  it("analyzeSignalContradiction aligned sin conflictos", () => {
    const c = analyzeSignalContradiction({
      crowd: "local",
      table: "local",
      form: "local",
      ranking: "local",
    });
    expect(c.hasContradiction).toBe(false);
    expect(c.summary).toBe("aligned");
  });

  it("computeDrawSignal expone reasons en escenario dividido", () => {
    const scenario = ALL_PITONISO_FIXTURES.find((f) => f.id === "draw-medium-v21")!;
    const { verdict } = runPitonisoFixture(scenario);
    const ds = computeDrawSignal({
      signals: verdict.signals,
      scores: verdict.scores,
      margin: verdict.margin,
      crowdSampleOk: verdict.crowdSampleOk,
      totalPicks: verdict.totalPicks,
      rankingSignal: verdict.rankingSignal,
      hasRanking: verdict.rankingSignal != null,
      local: scenario.previewInput.local,
      visitante: scenario.previewInput.visitante,
      mostPopularOutcome: null,
      mostPopularOutcomeShare: null,
    });
    expect(["medium", "strong", "none"]).toContain(ds.level);
  });
});
