import { describe, expect, it } from "vitest";
import {
  assembleMatchSummaryOutput,
  getSummaryDisplayParagraphs,
} from "@/lib/ai/match-summary/match-summary-output-utils";
import {
  formatFactMismatchError,
  scanMatchSummaryFactMismatch,
} from "@/lib/ai/match-summary/match-summary-fact-validator";
import { buildMexicoSouthAfricaDeterministicInput } from "@/lib/ai/match-summary/fixtures/mexico-south-africa-deterministic.fixture";
import type { MatchSummaryLlmOutput } from "@/lib/ai/match-summary/match-summary-types";
import { DEFAULT_NARRATOR_PERSONA_ID } from "@/lib/ai/sports-narrator-personas";

const FORBIDDEN_PHRASES = [
  "segunda amarilla",
  "acumulación",
  "gol normal",
] as const;

const FORBIDDEN_NAMES = ["Joaquín", "Julián", "Ricardo", "Raúl"] as const;

function baseLlm(overrides: Partial<MatchSummaryLlmOutput> = {}): MatchSummaryLlmOutput {
  return {
    version: "match-summary-llm-v1",
    partido_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    persona_id: DEFAULT_NARRATOR_PERSONA_ID,
    headline: "México 2-0 Sudáfrica en el arranque del Grupo A",
    lede: "El Tri sumó tres puntos con autoridad en el Azteca.",
    context_paragraphs: [
      "México llegó como favorito del grupo y cumplió ante un rival que terminó con menos jugadores.",
    ],
    closing_paragraph: "Con este resultado, México arranca arriba en la tabla del Grupo A.",
    standout_player: {
      name: "J. Quinones",
      reason: "Marcó el gol que abrió el marcador",
    },
    table_impact: "México lidera el Grupo A tras la primera jornada.",
    quiniela_impact: "El 2-0 fue el marcador más pronosticado entre los participantes.",
    confidence: "alta",
    data_gaps_acknowledged: [],
    ...overrides,
  };
}

describe("México vs Sudáfrica — event_facts_locked", () => {
  const input = buildMexicoSouthAfricaDeterministicInput();

  it("generates deterministic event_facts_locked", () => {
    const facts = input.event_facts_locked ?? [];
    expect(facts).toHaveLength(5);

    expect(facts[0]).toMatchObject({
      minute_label: "9'",
      team_name: "México",
      player_name: "J. Quinones",
      type: "gol",
      sentence: "México abrió el marcador al 9' con gol de J. Quinones.",
    });

    expect(facts[1]).toMatchObject({
      minute_label: "49'",
      team_name: "Sudáfrica",
      player_name: "Siphephelo Sithole",
      type: "tarjeta_roja",
      sentence:
        "Siphephelo Sithole fue expulsado por Sudáfrica al 49'.",
    });

    expect(facts[2]).toMatchObject({
      minute_label: "67'",
      player_name: "R. Jimenez",
      type: "gol",
      sentence: "México anotó al 67' con gol de R. Jimenez.",
    });

    expect(facts[3]).toMatchObject({
      player_name: "Themba Zwane",
      type: "tarjeta_roja",
    });

    expect(facts[4]).toMatchObject({
      minute_label: "90+2'",
      player_name: "César Montes",
      type: "tarjeta_roja",
      sentence: "César Montes fue expulsado por México al 90+2'.",
    });
  });

  it("assembles event_paragraphs from code, not LLM", () => {
    const llm = baseLlm();
    const output = assembleMatchSummaryOutput(llm, input);

    expect(output.event_paragraphs).toHaveLength(5);
    expect(output.event_paragraphs![0]).toContain("J. Quinones");
    expect(output.event_paragraphs![1]).toContain("Siphephelo Sithole");
    expect(output.event_paragraphs![2]).toContain("R. Jimenez");

    const display = getSummaryDisplayParagraphs(output);
    expect(display.some((p) => p.includes("J. Quinones"))).toBe(true);
    expect(display.some((p) => p.includes("Siphephelo Sithole"))).toBe(true);
    expect(display.some((p) => p.includes("R. Jimenez"))).toBe(true);
  });

  it("assembled output does not contain forbidden phrases or expanded names", () => {
    const output = assembleMatchSummaryOutput(baseLlm(), input);
    const blob = JSON.stringify(output).toLowerCase();

    for (const phrase of FORBIDDEN_PHRASES) {
      expect(blob).not.toContain(phrase.toLowerCase());
    }
    for (const name of FORBIDDEN_NAMES) {
      expect(JSON.stringify(output)).not.toContain(name);
    }
  });

  it("event paragraphs preserve exact player_name from API", () => {
    const output = assembleMatchSummaryOutput(baseLlm(), input);
    for (const paragraph of output.event_paragraphs ?? []) {
      if (paragraph.includes("Quinones")) {
        expect(paragraph).toContain("J. Quinones");
        expect(paragraph).not.toContain("Joaquín");
      }
      if (paragraph.includes("Jimenez")) {
        expect(paragraph).toContain("R. Jimenez");
        expect(paragraph).not.toContain("Ricardo");
        expect(paragraph).not.toContain("Raúl");
      }
    }
  });
});

describe("México vs Sudáfrica — fact mismatch validator", () => {
  const input = buildMexicoSouthAfricaDeterministicInput();

  it("rejects LLM output with segunda amarilla", () => {
    const llm = baseLlm({
      context_paragraphs: [
        "Zwane vio la segunda amarilla y dejó a Sudáfrica con diez.",
      ],
    });
    const violations = scanMatchSummaryFactMismatch(llm, input);
    expect(violations.length).toBeGreaterThan(0);
    expect(formatFactMismatchError(violations)).toMatch(
      /^MATCH_SUMMARY_FACT_MISMATCH/,
    );
  });

  it("rejects expanded name Joaquín", () => {
    const llm = baseLlm({
      context_paragraphs: ["Joaquín Quinones marcó temprano."],
    });
    const violations = scanMatchSummaryFactMismatch(llm, input);
    expect(violations.some((v) => v.rule_id === "expanded_name")).toBe(true);
  });

  it("accepts clean LLM narrative without event rewriting", () => {
    const llm = baseLlm();
    expect(scanMatchSummaryFactMismatch(llm, input)).toEqual([]);
  });
});
