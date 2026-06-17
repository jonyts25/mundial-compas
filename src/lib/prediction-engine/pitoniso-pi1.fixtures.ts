/**
 * Fixtures manuales — El Pitoniso PI-1.
 *
 * Escenarios determinísticos para validar motor + copy sin Supabase.
 * Ejecutar: npx -y tsx scripts/verify-pitoniso-pi1.ts
 */

import { getFifaRankingSignal } from "@/lib/sports-core/predictions/preview/fifa-ranking-signal";
import {
  computePickAggregates,
  type PickInput,
} from "@/lib/insights/pick-aggregates";
import { computePickValue } from "@/lib/prediction-engine/pick-value";
import {
  computeMatchPreviewVerdict,
  type MatchPreviewInput,
  type MatchPreviewFavorite,
  type MatchPreviewConfidence,
} from "@/lib/prediction-engine/match-preview";
import { buildPitonisoMessage } from "@/lib/prediction-engine/pitoniso-message";

export interface PitonisoFixtureScenario {
  id: string;
  description: string;
  picks: PickInput[];
  previewInput: Omit<MatchPreviewInput, "aggregates">;
  localCode?: string;
  visitanteCode?: string;
  messageFlags?: {
    localFormDebut?: boolean;
    awayFormDebut?: boolean;
    isLastGroupMatch?: boolean;
  };
  expect: {
    favorite: MatchPreviewFavorite;
    confidence?: MatchPreviewConfidence;
    predictedOutcome?: MatchPreviewFavorite | "unknown";
    minMargin?: number;
    maxMargin?: number;
    rankingLeader?: "local" | "visitante" | "neutral" | null;
  };
}

function repeatPick(
  pick: PickInput,
  times: number,
): PickInput[] {
  return Array.from({ length: times }, () => ({ ...pick }));
}

function mixPicks(specs: { pick: PickInput; count: number }[]): PickInput[] {
  return specs.flatMap(({ pick, count }) => repeatPick(pick, count));
}

/** México vs Polonia — multitud clara al local (plan Apéndice C). */
export const FIXTURE_MEXICO_POLONIA: PitonisoFixtureScenario = {
  id: "mexico-polonia-grupo",
  description: "120 picks, local 58%, México 2.º vs Polonia 3.º, forma WD vs LL",
  picks: mixPicks([
    { pick: { golesLocal: 2, golesVisitante: 1 }, count: 19 },
    { pick: { golesLocal: 1, golesVisitante: 1 }, count: 26 },
    { pick: { golesLocal: 2, golesVisitante: 0 }, count: 24 },
    { pick: { golesLocal: 1, golesVisitante: 0 }, count: 10 },
    { pick: { golesLocal: 0, golesVisitante: 1 }, count: 12 },
    { pick: { golesLocal: 1, golesVisitante: 2 }, count: 8 },
    { pick: { golesLocal: 0, golesVisitante: 0 }, count: 21 },
  ]),
  previewInput: {
    local: {
      tablePosition: 2,
      groupSize: 4,
      formNorm: 5 / 6,
      pointsFromTop2: 0,
    },
    visitante: {
      tablePosition: 3,
      groupSize: 4,
      formNorm: 1 / 6,
      pointsFromTop2: 3,
    },
    isGroupPhase: true,
  },
  expect: {
    favorite: "local",
    confidence: "presentimiento",
    minMargin: 0.15,
  },
};

/** Partido parejo — empate o indeciso. */
export const FIXTURE_PAREJO: PitonisoFixtureScenario = {
  id: "partido-parejo",
  description: "Distribución 34/33/33, tabla y forma simétricas",
  picks: mixPicks([
    { pick: { golesLocal: 1, golesVisitante: 1 }, count: 34 },
    { pick: { golesLocal: 1, golesVisitante: 0 }, count: 33 },
    { pick: { golesLocal: 0, golesVisitante: 1 }, count: 33 },
  ]),
  previewInput: {
    local: { tablePosition: 2, groupSize: 4, formNorm: 0.5, pointsFromTop2: 0 },
    visitante: {
      tablePosition: 2,
      groupSize: 4,
      formNorm: 0.5,
      pointsFromTop2: 0,
    },
    isGroupPhase: true,
  },
  expect: {
    favorite: "local",
    confidence: "indeciso",
    maxMargin: 0.12,
  },
};

/** Sin picks — multitud neutra. */
export const FIXTURE_SIN_PICKS: PitonisoFixtureScenario = {
  id: "sin-picks",
  description: "0 pronósticos, señales de torneo neutras",
  picks: [],
  previewInput: {
    local: { tablePosition: null, groupSize: null, formNorm: null, pointsFromTop2: null },
    visitante: {
      tablePosition: null,
      groupSize: null,
      formNorm: null,
      pointsFromTop2: null,
    },
  },
  messageFlags: { localFormDebut: true, awayFormDebut: true },
  expect: {
    favorite: "local",
    confidence: "indeciso",
  },
};

/** Muestra pequeña — cap confianza. */
export const FIXTURE_POCOS_PICKS: PitonisoFixtureScenario = {
  id: "pocos-picks",
  description: "3 picks, multitud no confiable",
  picks: mixPicks([
    { pick: { golesLocal: 2, golesVisitante: 0 }, count: 2 },
    { pick: { golesLocal: 0, golesVisitante: 2 }, count: 1 },
  ]),
  previewInput: {
    local: { tablePosition: 1, groupSize: 4, formNorm: 1, pointsFromTop2: 0 },
    visitante: { tablePosition: 4, groupSize: 4, formNorm: 0, pointsFromTop2: 6 },
    isGroupPhase: true,
  },
  expect: {
    favorite: "local",
    confidence: "leve",
  },
};

/** Multitud vs forma — visitante favorito por racha. */
export const FIXTURE_MULTITUD_VS_FORMA: PitonisoFixtureScenario = {
  id: "multitud-vs-forma",
  description: "58% local pero visitante con forma superior",
  picks: mixPicks([
    { pick: { golesLocal: 2, golesVisitante: 1 }, count: 30 },
    { pick: { golesLocal: 1, golesVisitante: 0 }, count: 28 },
    { pick: { golesLocal: 1, golesVisitante: 1 }, count: 22 },
    { pick: { golesLocal: 0, golesVisitante: 2 }, count: 20 },
  ]),
  previewInput: {
    local: { tablePosition: 3, groupSize: 4, formNorm: 0.33, pointsFromTop2: 2 },
    visitante: { tablePosition: 1, groupSize: 4, formNorm: 1, pointsFromTop2: 0 },
    isGroupPhase: true,
  },
  expect: {
    favorite: "visitante",
    minMargin: 0.08,
  },
};

/** Última jornada de grupo. */
export const FIXTURE_ULTIMA_JORNADA: PitonisoFixtureScenario = {
  id: "ultima-jornada",
  description: "Local compite pase, multitud fuerte",
  picks: mixPicks([
    { pick: { golesLocal: 2, golesVisitante: 0 }, count: 45 },
    { pick: { golesLocal: 1, golesVisitante: 0 }, count: 19 },
    { pick: { golesLocal: 1, golesVisitante: 1 }, count: 18 },
    { pick: { golesLocal: 0, golesVisitante: 1 }, count: 18 },
  ]),
  previewInput: {
    local: { tablePosition: 3, groupSize: 4, formNorm: 0.66, pointsFromTop2: 2 },
    visitante: { tablePosition: 2, groupSize: 4, formNorm: 0.5, pointsFromTop2: 0 },
    isGroupPhase: true,
    isLastGroupMatch: true,
  },
  messageFlags: { isLastGroupMatch: true },
  expect: {
    favorite: "local",
    confidence: "bastante",
    minMargin: 0.12,
  },
};

/** Favorito claro por ranking FIFA (ARG vs HAI). */
export const FIXTURE_RANKING_CLARO: PitonisoFixtureScenario = {
  id: "ranking-favorito-claro",
  description: "Ranking FIFA muy favorable al local (ARG 1 vs HAI 60)",
  picks: mixPicks([
    { pick: { golesLocal: 2, golesVisitante: 0 }, count: 12 },
    { pick: { golesLocal: 1, golesVisitante: 0 }, count: 8 },
    { pick: { golesLocal: 1, golesVisitante: 1 }, count: 5 },
  ]),
  localCode: "ARG",
  visitanteCode: "HAI",
  previewInput: {
    local: {
      tablePosition: null,
      groupSize: null,
      formNorm: 0.5,
      pointsFromTop2: null,
      fifaRank: 1,
    },
    visitante: {
      tablePosition: null,
      groupSize: null,
      formNorm: 0.5,
      pointsFromTop2: null,
      fifaRank: 60,
    },
  },
  expect: {
    favorite: "local",
    rankingLeader: "local",
    minMargin: 0.1,
  },
};

/** Ranking FIFA casi empatado (MEX vs USA). */
export const FIXTURE_RANKING_CERRADO: PitonisoFixtureScenario = {
  id: "ranking-cerrado",
  description: "Ranking FIFA muy parejo (MEX 13 vs USA 14)",
  picks: mixPicks([
    { pick: { golesLocal: 1, golesVisitante: 1 }, count: 20 },
    { pick: { golesLocal: 1, golesVisitante: 0 }, count: 20 },
    { pick: { golesLocal: 0, golesVisitante: 1 }, count: 20 },
  ]),
  localCode: "MEX",
  visitanteCode: "USA",
  previewInput: {
    local: {
      tablePosition: 2,
      groupSize: 4,
      formNorm: 0.5,
      pointsFromTop2: 0,
      fifaRank: 13,
    },
    visitante: {
      tablePosition: 2,
      groupSize: 4,
      formNorm: 0.5,
      pointsFromTop2: 0,
      fifaRank: 14,
    },
    isGroupPhase: true,
  },
  expect: {
    favorite: "local",
    confidence: "indeciso",
    rankingLeader: "neutral",
    maxMargin: 0.12,
  },
};

/** Ranking contradice multitud y forma. */
export const FIXTURE_RANKING_VS_CROWD: PitonisoFixtureScenario = {
  id: "ranking-vs-crowd-form",
  description: "Multitud y forma al local; ranking FIFA al visitante (GER)",
  picks: mixPicks([
    { pick: { golesLocal: 2, golesVisitante: 1 }, count: 35 },
    { pick: { golesLocal: 2, golesVisitante: 0 }, count: 30 },
    { pick: { golesLocal: 1, golesVisitante: 1 }, count: 10 },
    { pick: { golesLocal: 0, golesVisitante: 2 }, count: 5 },
  ]),
  localCode: "HAI",
  visitanteCode: "GER",
  previewInput: {
    local: {
      tablePosition: 1,
      groupSize: 4,
      formNorm: 0.9,
      pointsFromTop2: 0,
      fifaRank: 60,
    },
    visitante: {
      tablePosition: 4,
      groupSize: 4,
      formNorm: 0.2,
      pointsFromTop2: 6,
      fifaRank: 9,
    },
    isGroupPhase: true,
  },
  expect: {
    favorite: "local",
    rankingLeader: "visitante",
    minMargin: 0.05,
  },
};

/** Equipo sin ranking en snapshot. */
export const FIXTURE_SIN_RANKING: PitonisoFixtureScenario = {
  id: "equipo-sin-ranking",
  description: "Código fuera del snapshot — se ignora señal FIFA",
  picks: mixPicks([
    { pick: { golesLocal: 2, golesVisitante: 0 }, count: 8 },
    { pick: { golesLocal: 1, golesVisitante: 0 }, count: 7 },
  ]),
  localCode: "ZZZ",
  visitanteCode: "MEX",
  previewInput: {
    local: {
      tablePosition: 1,
      groupSize: 4,
      formNorm: 0.8,
      pointsFromTop2: 0,
      fifaRank: null,
    },
    visitante: {
      tablePosition: 4,
      groupSize: 4,
      formNorm: 0.2,
      pointsFromTop2: 5,
      fifaRank: 13,
    },
    isGroupPhase: true,
  },
  expect: {
    favorite: "local",
    rankingLeader: null,
  },
};

export const ALL_PITONISO_FIXTURES: PitonisoFixtureScenario[] = [
  FIXTURE_MEXICO_POLONIA,
  FIXTURE_PAREJO,
  FIXTURE_SIN_PICKS,
  FIXTURE_POCOS_PICKS,
  FIXTURE_MULTITUD_VS_FORMA,
  FIXTURE_ULTIMA_JORNADA,
  FIXTURE_RANKING_CLARO,
  FIXTURE_RANKING_CERRADO,
  FIXTURE_RANKING_VS_CROWD,
  FIXTURE_SIN_RANKING,
];

function fixtureTeamNames(scenario: PitonisoFixtureScenario): {
  homeName: string;
  awayName: string;
} {
  const names: Record<string, string> = {
    ARG: "Argentina",
    MEX: "México",
    USA: "Estados Unidos",
    GER: "Alemania",
    HAI: "Haití",
    POL: "Polonia",
  };
  return {
    homeName: names[scenario.localCode ?? ""] ?? "Local",
    awayName: names[scenario.visitanteCode ?? ""] ?? "Visitante",
  };
}

export function runPitonisoFixture(scenario: PitonisoFixtureScenario) {
  const aggregates = computePickAggregates(scenario.picks, null);
  const rankingSignal =
    scenario.localCode && scenario.visitanteCode
      ? getFifaRankingSignal(scenario.localCode, scenario.visitanteCode)
      : null;
  const verdict = computeMatchPreviewVerdict({
    aggregates,
    ...scenario.previewInput,
    localCode: scenario.localCode,
    visitanteCode: scenario.visitanteCode,
    rankingSignal,
  });
  const top = aggregates.mostPopularScore;
  const pickValueTop = top
    ? computePickValue(aggregates, { local: top.local, visitante: top.visitante })
    : null;
  const { homeName, awayName } = fixtureTeamNames(scenario);
  const message = buildPitonisoMessage({
    verdict,
    homeName,
    awayName,
    pickValueTop,
    localTablePosition: scenario.previewInput.local.tablePosition,
    awayTablePosition: scenario.previewInput.visitante.tablePosition,
    rankingSignal: verdict.rankingSignal,
    ...scenario.messageFlags,
  });
  return { aggregates, verdict, pickValueTop, message };
}

export function verifyPitonisoFixtures(): string[] {
  const errors: string[] = [];

  for (const scenario of ALL_PITONISO_FIXTURES) {
    const { verdict } = runPitonisoFixture(scenario);
    const { expect: exp } = scenario;

    if (verdict.favorite !== exp.favorite) {
      errors.push(
        `[${scenario.id}] favorite: got ${verdict.favorite}, want ${exp.favorite}`,
      );
    }
    if (exp.confidence && verdict.confidence !== exp.confidence) {
      errors.push(
        `[${scenario.id}] confidence: got ${verdict.confidence}, want ${exp.confidence}`,
      );
    }
    if (exp.minMargin != null && verdict.margin < exp.minMargin) {
      errors.push(
        `[${scenario.id}] margin ${verdict.margin.toFixed(3)} < min ${exp.minMargin}`,
      );
    }
    if (exp.maxMargin != null && verdict.margin > exp.maxMargin) {
      errors.push(
        `[${scenario.id}] margin ${verdict.margin.toFixed(3)} > max ${exp.maxMargin}`,
      );
    }
    if (exp.predictedOutcome && verdict.predictedOutcome !== exp.predictedOutcome) {
      errors.push(
        `[${scenario.id}] predictedOutcome: got ${verdict.predictedOutcome}, want ${exp.predictedOutcome}`,
      );
    }
    if (exp.rankingLeader !== undefined) {
      const leader = verdict.rankingSignal?.leader ?? null;
      if (leader !== exp.rankingLeader) {
        errors.push(
          `[${scenario.id}] rankingLeader: got ${leader}, want ${exp.rankingLeader}`,
        );
      }
    }
  }

  return errors;
}

/** Genera los 10 mensajes de ejemplo para el reporte PI-1. */
export function generateExampleMessages(): { id: string; message: string }[] {
  const examples: { id: string; message: string }[] = [];

  for (const scenario of ALL_PITONISO_FIXTURES) {
    const { message } = runPitonisoFixture(scenario);
    examples.push({
      id: scenario.id,
      message: message.message,
    });
  }

  const extra = runPitonisoFixture({
    ...FIXTURE_MEXICO_POLONIA,
    id: "empate-favorito",
    description: "Empate líder en multitud",
    picks: mixPicks([
      { pick: { golesLocal: 1, golesVisitante: 1 }, count: 40 },
      { pick: { golesLocal: 1, golesVisitante: 0 }, count: 30 },
      { pick: { golesLocal: 0, golesVisitante: 1 }, count: 30 },
    ]),
    previewInput: {
      local: { tablePosition: 2, groupSize: 4, formNorm: 0.5, pointsFromTop2: 0 },
      visitante: { tablePosition: 2, groupSize: 4, formNorm: 0.5, pointsFromTop2: 0 },
      isGroupPhase: true,
    },
    expect: { favorite: "empate", confidence: "indeciso" },
  });
  examples.push({ id: "empate-favorito", message: extra.message.message });

  const presentimiento = runPitonisoFixture({
    ...FIXTURE_MEXICO_POLONIA,
    id: "presentimiento-local",
    picks: mixPicks([
      { pick: { golesLocal: 3, golesVisitante: 0 }, count: 55 },
      { pick: { golesLocal: 2, golesVisitante: 0 }, count: 20 },
      { pick: { golesLocal: 1, golesVisitante: 1 }, count: 15 },
      { pick: { golesLocal: 0, golesVisitante: 1 }, count: 10 },
    ]),
    previewInput: {
      local: { tablePosition: 1, groupSize: 4, formNorm: 1, pointsFromTop2: 0 },
      visitante: { tablePosition: 4, groupSize: 4, formNorm: 0.16, pointsFromTop2: 5 },
      isGroupPhase: true,
    },
    expect: { favorite: "local", confidence: "presentimiento", minMargin: 0.25 },
  });
  examples.push({
    id: "presentimiento-local",
    message: presentimiento.message.message,
  });

  const knockout = runPitonisoFixture({
    ...FIXTURE_MEXICO_POLONIA,
    id: "eliminatoria",
    previewInput: {
      ...FIXTURE_MEXICO_POLONIA.previewInput,
      isGroupPhase: false,
      isKnockout: true,
    },
    expect: { favorite: "local", confidence: "bastante" },
  });
  examples.push({ id: "eliminatoria", message: knockout.message.message });

  const debutAway = runPitonisoFixture({
    ...FIXTURE_MEXICO_POLONIA,
    id: "debut-visitante",
    messageFlags: { awayFormDebut: true },
    previewInput: {
      local: { tablePosition: 1, groupSize: 4, formNorm: 0.83, pointsFromTop2: 0 },
      visitante: { tablePosition: null, groupSize: 4, formNorm: null, pointsFromTop2: null },
      isGroupPhase: true,
    },
    expect: { favorite: "local", confidence: "bastante" },
  });
  examples.push({ id: "debut-visitante", message: debutAway.message.message });

  return examples.slice(0, 10);
}
