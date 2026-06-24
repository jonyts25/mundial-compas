import { describe, expect, it } from "vitest";
import { buildTimelineEventText } from "@/lib/ai/match-summary/match-summary-event-text";
import {
  formatHallucinationError,
  scanMatchSummaryHallucinations,
} from "@/lib/ai/match-summary/match-summary-hallucination-guard";
import type { MatchSummaryOutput } from "@/lib/ai/match-summary/match-summary-types";
import { buildMexicoSouthAfricaMatchSummaryInput } from "@/lib/ai/match-summary/fixtures/mexico-south-africa.fixture";
import { buildNarrativeEvidence } from "@/lib/ai/match-summary/match-summary-verified-facts";

function badOutput(overrides: Partial<MatchSummaryOutput>): MatchSummaryOutput {
  const base: MatchSummaryOutput = {
    version: "match-summary-v1",
    partido_id: "e04a2b98-cc15-42cf-9798-9a64d3317641",
    persona_id: "cronista_clasico",
    headline: "México 2-0 Sudáfrica",
    lede: "Victoria mexicana.",
    body_paragraphs: ["Párrafo neutro."],
    standout_player: null,
    facts: ["Marcador 2-0."],
    table_impact: null,
    quiniela_impact: null,
    confidence: "alta",
    data_gaps_acknowledged: [],
  };
  return { ...base, ...overrides };
}

describe("México vs Sudáfrica — narrative evidence", () => {
  const input = buildMexicoSouthAfricaMatchSummaryInput();

  it("does not allow second yellow, direct red or score confirmation", () => {
    const evidence = buildNarrativeEvidence(input);
    expect(evidence.allows_second_yellow_red).toBe(false);
    expect(evidence.allows_direct_red).toBe(false);
    expect(evidence.allows_score_confirmation).toBe(false);
    expect(evidence.allows_psychological_control).toBe(false);
  });

  it("generates event_text for VAR Card upgrade without expulsion wording", () => {
    const varEv = input.timeline.find((e) => e.type === "var");
    expect(varEv?.event_text).toContain("Card upgrade");
    expect(varEv?.event_text).not.toMatch(/segunda amarilla/i);
    expect(varEv?.event_text).not.toMatch(/roja directa/i);
    expect(buildTimelineEventText(varEv!)).toBe(varEv?.event_text);
  });

  it("includes verified_facts from code", () => {
    expect(input.verified_facts?.length).toBeGreaterThan(2);
    expect(input.verified_facts?.some((f) => f.includes("2–0"))).toBe(true);
    expect(input.verified_facts?.some((f) => f.includes("Card upgrade"))).toBe(
      true,
    );
  });
});

describe("México vs Sudáfrica — hallucination guard", () => {
  const input = buildMexicoSouthAfricaMatchSummaryInput();

  const forbiddenSamples = [
    {
      phrase: "segunda amarilla",
      output: badOutput({
        body_paragraphs: [
          "Zwane vio la segunda amarilla tras la revisión del VAR.",
        ],
      }),
    },
    {
      phrase: "roja directa",
      output: badOutput({
        lede: "Una roja directa a Zwane marcó el cierre del partido.",
      }),
    },
    {
      phrase: "confirmando el marcador",
      output: badOutput({
        body_paragraphs: [
          "Guevara anotó confirmando el marcador para el Tri.",
        ],
      }),
    },
  ] as const;

  for (const { phrase, output } of forbiddenSamples) {
    it(`rejects output containing "${phrase}"`, () => {
      const violations = scanMatchSummaryHallucinations(output, input);
      expect(violations.length).toBeGreaterThan(0);
      expect(
        JSON.stringify(output).toLowerCase(),
      ).toContain(phrase.toLowerCase().replace("confirmando el marcador", "confirmando el marcador"));
    });
  }

  it("accepts output that only uses verified event_text", () => {
    const safe = badOutput({
      headline: "México 2-0 Sudáfrica en el arranque",
      lede: "Dos goles bastaron al Tri.",
      body_paragraphs: [
        "H. Martin abrió el marcador al 12'. A. Guevara sumó el segundo al 55'.",
        "Al 82' hubo revisión VAR por Card upgrade de Themba Zwane.",
      ],
      facts: input.verified_facts?.slice(0, 4) ?? [],
    });
    expect(scanMatchSummaryHallucinations(safe, input)).toEqual([]);
  });

  it("returns HALLUCINATION_GUARD error code", () => {
    const violations = scanMatchSummaryHallucinations(
      forbiddenSamples[0]!.output,
      input,
    );
    expect(formatHallucinationError(violations)).toMatch(/^HALLUCINATION_GUARD/);
  });
});
