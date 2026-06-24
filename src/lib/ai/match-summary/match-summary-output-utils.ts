import type {
  MatchSummaryInput,
  MatchSummaryLlmOutput,
  MatchSummaryOutput,
} from "@/lib/ai/match-summary/match-summary-types";

export function getEventParagraphsFromInput(
  input: MatchSummaryInput,
): string[] {
  return (input.event_facts_locked ?? []).map((e) => e.sentence);
}

/** Párrafos narrativos generados por la IA (sin eventos determinísticos). */
export function collectLlmNarrativeStrings(
  llm: MatchSummaryLlmOutput,
): Array<{ field: string; text: string }> {
  const parts: Array<{ field: string; text: string }> = [
    { field: "headline", text: llm.headline },
    { field: "lede", text: llm.lede },
    ...llm.context_paragraphs.map((p, i) => ({
      field: `context_paragraphs[${i}]`,
      text: p,
    })),
    { field: "closing_paragraph", text: llm.closing_paragraph },
  ];
  if (llm.table_impact) {
    parts.push({ field: "table_impact", text: llm.table_impact });
  }
  if (llm.quiniela_impact) {
    parts.push({ field: "quiniela_impact", text: llm.quiniela_impact });
  }
  if (llm.standout_player) {
    parts.push({
      field: "standout_player.name",
      text: llm.standout_player.name,
    });
    parts.push({
      field: "standout_player.reason",
      text: llm.standout_player.reason,
    });
  }
  return parts;
}

/** Texto narrativo de la IA en output ensamblado (excluye event_paragraphs). */
export function collectAssembledNarrativeStrings(
  output: MatchSummaryOutput,
): Array<{ field: string; text: string }> {
  if (output.context_paragraphs && output.context_paragraphs.length > 0) {
    const parts: Array<{ field: string; text: string }> = [
      { field: "headline", text: output.headline },
      { field: "lede", text: output.lede },
      ...output.context_paragraphs.map((p, i) => ({
        field: `context_paragraphs[${i}]`,
        text: p,
      })),
    ];
    if (output.closing_paragraph) {
      parts.push({
        field: "closing_paragraph",
        text: output.closing_paragraph,
      });
    }
    if (output.table_impact) {
      parts.push({ field: "table_impact", text: output.table_impact });
    }
    if (output.quiniela_impact) {
      parts.push({ field: "quiniela_impact", text: output.quiniela_impact });
    }
    if (output.standout_player) {
      parts.push({
        field: "standout_player.name",
        text: output.standout_player.name,
      });
      parts.push({
        field: "standout_player.reason",
        text: output.standout_player.reason,
      });
    }
    return parts;
  }

  return [
    { field: "headline", text: output.headline },
    { field: "lede", text: output.lede },
    ...output.body_paragraphs.map((p, i) => ({
      field: `body_paragraphs[${i}]`,
      text: p,
    })),
    ...output.facts.map((f, i) => ({ field: `facts[${i}]`, text: f })),
    ...(output.table_impact
      ? [{ field: "table_impact", text: output.table_impact }]
      : []),
    ...(output.quiniela_impact
      ? [{ field: "quiniela_impact", text: output.quiniela_impact }]
      : []),
    ...(output.standout_player
      ? [
          {
            field: "standout_player.name",
            text: output.standout_player.name,
          },
          {
            field: "standout_player.reason",
            text: output.standout_player.reason,
          },
        ]
      : []),
  ];
}

export function getSummaryDisplayParagraphs(
  output: MatchSummaryOutput,
): string[] {
  if (output.context_paragraphs && output.context_paragraphs.length > 0) {
    const closing = output.closing_paragraph?.trim();
    return [
      ...output.context_paragraphs,
      ...(output.event_paragraphs ?? []),
      ...(closing ? [closing] : []),
    ];
  }
  return output.body_paragraphs;
}

export function assembleMatchSummaryOutput(
  llm: MatchSummaryLlmOutput,
  input: MatchSummaryInput,
): MatchSummaryOutput {
  const event_paragraphs = getEventParagraphsFromInput(input);
  const context_paragraphs = llm.context_paragraphs.map((p) => p.trim());
  const closing_paragraph = llm.closing_paragraph.trim();
  const facts = input.verified_facts ?? [];

  return {
    version: "match-summary-v1",
    partido_id: llm.partido_id,
    persona_id: llm.persona_id,
    headline: llm.headline.trim(),
    lede: llm.lede.trim(),
    context_paragraphs,
    event_paragraphs,
    closing_paragraph,
    body_paragraphs: [
      ...context_paragraphs,
      ...event_paragraphs,
      closing_paragraph,
    ],
    standout_player: llm.standout_player
      ? {
          name: llm.standout_player.name.trim(),
          reason: llm.standout_player.reason.trim(),
        }
      : null,
    facts: facts.map((f) => f.trim()),
    table_impact: llm.table_impact?.trim() ?? null,
    quiniela_impact: llm.quiniela_impact?.trim() ?? null,
    confidence: llm.confidence,
    data_gaps_acknowledged: llm.data_gaps_acknowledged.map((g) => g.trim()),
  };
}
