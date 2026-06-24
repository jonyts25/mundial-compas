import { describe, expect, it } from "vitest";
import {
  buildFactsLocked,
  formatNameGuardError,
  scanMatchSummaryNameViolations,
} from "@/lib/ai/match-summary/match-summary-name-guard";
import type { MatchSummaryInput, MatchSummaryOutput } from "@/lib/ai/match-summary/match-summary-types";
import { DEFAULT_NARRATOR_PERSONA_ID } from "@/lib/ai/sports-narrator-personas";

const FORBIDDEN_EXPANSIONS = ["Joaquín", "Julián", "Ricardo", "Raúl"];

function buildInputWithPlayers(
  players: string[],
): { input: MatchSummaryInput; locked: string[] } {
  const input: MatchSummaryInput = {
    version: "match-summary-v1",
    partido_id: "test-partido",
    fixture_id: 1,
    persona_id: DEFAULT_NARRATOR_PERSONA_ID,
    locale: "es-MX",
    match: {
      home_code: "MEX",
      home_name: "Mexico",
      away_code: "RSA",
      away_name: "South Africa",
      score_home: 2,
      score_away: 0,
      status: "finalizado",
      phase: "grupos",
      group: "A",
      jornada: 1,
      venue: null,
      referee: null,
      kickoff_iso: "2026-06-11T19:00:00.000Z",
    },
    timeline: players.map((player, i) => ({
      minute: 10 + i * 20,
      extra: null,
      type: "gol" as const,
      player,
      team_code: "MEX",
      detail: "Normal Goal",
      event_text: `Gol de ${player} (MEX) al ${10 + i * 20}'.`,
    })),
    statistics: null,
    lineups: null,
    standings_context: null,
    quiniela_impact: null,
    data_gaps: [],
    facts_locked: players,
  };
  return { input, locked: buildFactsLocked(input) };
}

function baseOutput(overrides: Partial<MatchSummaryOutput>): MatchSummaryOutput {
  return {
    version: "match-summary-v1",
    partido_id: "test-partido",
    persona_id: DEFAULT_NARRATOR_PERSONA_ID,
    headline: "México 2-0",
    lede: "Victoria local.",
    body_paragraphs: ["Resumen del partido."],
    standout_player: null,
    facts: ["Marcador 2-0."],
    table_impact: null,
    quiniela_impact: null,
    confidence: "alta",
    data_gaps_acknowledged: [],
    ...overrides,
  };
}

describe("buildFactsLocked", () => {
  it("extracts exact player names from timeline", () => {
    const { locked } = buildInputWithPlayers(["J. Quinones", "R. Jimenez"]);
    expect(locked).toEqual(["J. Quinones", "R. Jimenez"]);
  });
});

describe("J. Quinones / R. Jimenez — name guard", () => {
  const { locked } = buildInputWithPlayers(["J. Quinones", "R. Jimenez"]);

  for (const forbidden of FORBIDDEN_EXPANSIONS) {
    it(`rejects output containing expanded name "${forbidden}"`, () => {
      const output = baseOutput({
        body_paragraphs: [
          `Gol de ${forbidden} y otro de R. Jimenez definen el triunfo.`,
        ],
        facts: [
          "Marcador 2-0.",
          `Goles de ${forbidden} y R. Jimenez.`,
        ],
      });
      const violations = scanMatchSummaryNameViolations(output, locked);
      expect(violations.some((v) => v.rule_id === "expanded_initial")).toBe(true);
      expect(output.body_paragraphs.join(" ")).toContain(forbidden);
    });
  }

  it("rejects Joaquín Quinones (completed name)", () => {
    const output = baseOutput({
      body_paragraphs: [
        "Joaquín Quinones abrió el marcador y R. Jimenez cerró.",
      ],
    });
    const violations = scanMatchSummaryNameViolations(output, locked);
    expect(violations.length).toBeGreaterThan(0);
    expect(
      violations.some(
        (v) =>
          v.rule_id === "expanded_initial" ||
          v.rule_id === "completed_name",
      ),
    ).toBe(true);
  });

  it("rejects output missing exact locked names", () => {
    const output = baseOutput({
      body_paragraphs: ["Quinones y Jimenez anotaron."],
      facts: ["Marcador 2-0.", "Goles de Quinones y Jimenez."],
    });
    const violations = scanMatchSummaryNameViolations(output, locked);
    expect(violations.some((v) => v.rule_id === "missing_exact_name")).toBe(true);
  });

  it("accepts output with exact J. Quinones and R. Jimenez", () => {
    const output = baseOutput({
      headline: "México 2-0 con goles de J. Quinones y R. Jimenez",
      body_paragraphs: [
        "J. Quinones abrió el marcador al 10'. R. Jimenez amplió la ventaja al 30'.",
      ],
      facts: [
        "Marcador final 2-0.",
        "Gol de J. Quinones (MEX) al 10'.",
        "Gol de R. Jimenez (MEX) al 30'.",
      ],
      standout_player: {
        name: "J. Quinones",
        reason: "Autor del primer gol",
      },
    });
    expect(scanMatchSummaryNameViolations(output, locked)).toEqual([]);
    expect(output.body_paragraphs.join(" ")).toContain("J. Quinones");
    expect(output.body_paragraphs.join(" ")).toContain("R. Jimenez");
    for (const forbidden of FORBIDDEN_EXPANSIONS) {
      expect(output.body_paragraphs.join(" ")).not.toContain(forbidden);
    }
  });

  it("returns NAME_GUARD error code", () => {
    const output = baseOutput({
      body_paragraphs: ["Julián marcó el primero."],
    });
    const violations = scanMatchSummaryNameViolations(output, locked);
    expect(formatNameGuardError(violations)).toMatch(/^NAME_GUARD:/);
  });
});
