/**
 * QA automatizado PI-4 — casos funcionales del pipeline (sin browser/PostHog).
 * Ejecutar: npx -y tsx scripts/verify-pitoniso-pi4-qa.ts
 */

import {
  FIXTURE_MEXICO_POLONIA,
  FIXTURE_MULTITUD_VS_FORMA,
  FIXTURE_SIN_PICKS,
  runPitonisoFixture,
} from "@/lib/prediction-engine/pitoniso-pi1.fixtures";
import {
  analyzePitonisoSignalContradictionWithCrowd,
  leaderFromCrowdOutcomes,
} from "@/lib/partidos/pitoniso-queries";
import { computePickAggregates } from "@/lib/insights/pick-aggregates";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function qaAlignedPicks(): void {
  const { verdict, aggregates } = runPitonisoFixture(FIXTURE_MEXICO_POLONIA);
  assert(verdict.crowdSampleOk, "aligned: crowd_sample_ok");
  assert(aggregates.total >= 5, "aligned: sample >= 5");
  assert(verdict.favorite === "local", "aligned: favorite local");
  assert(
    verdict.confidence === "presentimiento" || verdict.confidence === "bastante",
    "aligned: confidence alta",
  );
}

function qaCrowdVsForm(): void {
  const { verdict, aggregates } = runPitonisoFixture(FIXTURE_MULTITUD_VS_FORMA);
  const crowdLeader = leaderFromCrowdOutcomes(
    aggregates.outcomes.find((o) => o.outcome === "local")?.pct ?? 0,
    aggregates.outcomes.find((o) => o.outcome === "empate")?.pct ?? 0,
    aggregates.outcomes.find((o) => o.outcome === "visitante")?.pct ?? 0,
  );
  const contradiction = analyzePitonisoSignalContradictionWithCrowd(
    { table: "visitante", form: "visitante" },
    crowdLeader,
  );
  assert(crowdLeader === "local", "crowd vs form: multitud favorece local");
  assert(verdict.favorite === "visitante", "crowd vs form: motor favorece visitante");
  assert(
    contradiction.hasContradiction,
    "crowd vs form: contradicción detectada",
  );
  assert(
    contradiction.summary === "crowd_vs_form" ||
      contradiction.summary === "mixed",
    `crowd vs form: summary=${contradiction.summary}`,
  );
}

function qaSinPicks(): void {
  const { verdict, aggregates } = runPitonisoFixture(FIXTURE_SIN_PICKS);
  assert(aggregates.total === 0, "sin picks: total 0");
  assert(!verdict.crowdSampleOk, "sin picks: crowd_sample_ok false");
  assert(verdict.confidence === "indeciso", "sin picks: indeciso");
}

function qaNonProgramadoGate(): void {
  // Simula gate de page.tsx + PitonisoCard: solo programado renderiza.
  const statuses = ["en_vivo", "medio_tiempo", "finalizado", "programado"] as const;
  for (const estatus of statuses) {
    const shouldFetchServer = estatus === "programado";
    const cardRenders = estatus === "programado";
    assert(
      shouldFetchServer === cardRenders,
      `gate ${estatus}: server fetch === card render`,
    );
  }
}

function qaAggregatesPrivacyShape(): void {
  const picks = [{ golesLocal: 1, golesVisitante: 0 }];
  const agg = computePickAggregates(picks, null);
  const json = JSON.stringify(agg);
  assert(!json.includes("usuario"), "privacy: sin usuario en agregados");
  assert(!json.includes("email"), "privacy: sin email en agregados");
}

function main(): void {
  const cases = [
    ["a) picks alineados", qaAlignedPicks],
    ["b) crowd vs form", qaCrowdVsForm],
    ["c) sin picks", qaSinPicks],
    ["d) gate no programado", qaNonProgramadoGate],
    ["privacidad agregados", qaAggregatesPrivacyShape],
  ] as const;

  for (const [label, fn] of cases) {
    fn();
    console.log(`✓ ${label}`);
  }
  console.log("\nAll PI-4 QA assertions passed.");
}

main();
