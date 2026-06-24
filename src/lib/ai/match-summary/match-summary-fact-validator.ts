import { collectLlmNarrativeStrings } from "@/lib/ai/match-summary/match-summary-output-utils";
import {
  INITIAL_EXPANSION_BLOCKLIST,
  parseInitialSurname,
} from "@/lib/ai/match-summary/match-summary-name-guard";
import type {
  MatchSummaryInput,
  MatchSummaryLlmOutput,
} from "@/lib/ai/match-summary/match-summary-types";

export interface FactMismatchViolation {
  rule_id: string;
  matched: string;
  field: string;
}

const FACT_MISMATCH_FORBIDDEN_RULES: Array<{
  id: string;
  patterns: RegExp[];
}> = [
  {
    id: "second_yellow",
    patterns: [/segunda\s+amarilla/i, /doble\s+amarilla/i],
  },
  {
    id: "accumulation",
    patterns: [/acumulaci[oó]n/i],
  },
  {
    id: "direct_red",
    patterns: [/roja\s+directa/i],
  },
  {
    id: "normal_goal",
    patterns: [/gol\s+normal/i],
  },
  {
    id: "course_change",
    patterns: [/cambi[oó]\s+el\s+curso/i, /cambi[oó]\s+el\s+rumbo/i],
  },
  {
    id: "destabilized",
    patterns: [/desestabiliz[oó]/i],
  },
  {
    id: "score_confirmation",
    patterns: [
      /confirm[oó]\s+el\s+resultado/i,
      /confirmando\s+el\s+resultado/i,
      /confirm[oó]\s+el\s+marcador/i,
      /confirmando\s+el\s+marcador/i,
    ],
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCompletedNameViolation(
  text: string,
  lockedName: string,
  surname: string,
  field: string,
): FactMismatchViolation | null {
  const pattern = new RegExp(
    `\\b(?!${escapeRegExp(lockedName)})[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\\s+${escapeRegExp(surname)}\\b`,
    "i",
  );
  const match = text.match(pattern);
  if (!match) return null;
  return {
    rule_id: "expanded_name",
    matched: match[0],
    field,
  };
}

function scanExpandedNames(
  llm: MatchSummaryLlmOutput,
  lockedNames: string[],
): FactMismatchViolation[] {
  const violations: FactMismatchViolation[] = [];
  const seen = new Set<string>();

  function push(v: FactMismatchViolation) {
    const key = `${v.rule_id}:${v.matched}:${v.field}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push(v);
  }

  for (const lockedName of lockedNames) {
    const parsed = parseInitialSurname(lockedName);
    if (!parsed) continue;

    const blocklist = INITIAL_EXPANSION_BLOCKLIST[parsed.initial] ?? [];
    for (const { field, text } of collectLlmNarrativeStrings(llm)) {
      for (const forbidden of blocklist) {
        if (text.includes(forbidden)) {
          push({
            rule_id: "expanded_name",
            matched: forbidden,
            field,
          });
        }
      }

      const completed = findCompletedNameViolation(
        text,
        lockedName,
        parsed.surname,
        field,
      );
      if (completed) push(completed);
    }
  }

  return violations;
}

export function scanMatchSummaryFactMismatch(
  llm: MatchSummaryLlmOutput,
  input: MatchSummaryInput,
): FactMismatchViolation[] {
  const violations: FactMismatchViolation[] = [];
  const seen = new Set<string>();

  function push(v: FactMismatchViolation) {
    const key = `${v.rule_id}:${v.matched}:${v.field}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push(v);
  }

  for (const { field, text } of collectLlmNarrativeStrings(llm)) {
    for (const rule of FACT_MISMATCH_FORBIDDEN_RULES) {
      for (const pattern of rule.patterns) {
        const match = text.match(pattern);
        if (match) {
          push({
            rule_id: rule.id,
            matched: match[0],
            field,
          });
          break;
        }
      }
    }
  }

  const lockedNames =
    input.facts_locked ??
    input.event_facts_locked?.map((e) => e.player_name) ??
    [];
  for (const v of scanExpandedNames(llm, lockedNames)) {
    push(v);
  }

  return violations;
}

export function formatFactMismatchError(
  violations: FactMismatchViolation[],
): string {
  if (violations.length === 0) return "MATCH_SUMMARY_FACT_MISMATCH";
  const first = violations[0]!;
  return `MATCH_SUMMARY_FACT_MISMATCH:${first.rule_id}`;
}
