import type { MatchSummaryInput, MatchSummaryOutput } from "@/lib/ai/match-summary/match-summary-types";
import type { MatchSummaryNarrativeEvidence } from "@/lib/ai/match-summary/match-summary-verified-facts";
import { collectAssembledNarrativeStrings } from "@/lib/ai/match-summary/match-summary-output-utils";

export interface ForbiddenPhraseRule {
  id: string;
  patterns: RegExp[];
  evidenceKey: keyof MatchSummaryNarrativeEvidence;
}

export const FORBIDDEN_PHRASE_RULES: ForbiddenPhraseRule[] = [
  {
    id: "second_yellow",
    patterns: [
      /segunda\s+amarilla/i,
      /doble\s+amonestaci[oó]n/i,
      /2\.?\s*amarilla/i,
    ],
    evidenceKey: "allows_second_yellow_red",
  },
  {
    id: "direct_red",
    patterns: [/roja\s+directa/i, /expulsi[oó]n\s+directa/i],
    evidenceKey: "allows_direct_red",
  },
  {
    id: "controversial_penalty",
    patterns: [/penal\s+pol[eé]mico/i, /penalti\s+pol[eé]mico/i],
    evidenceKey: "allows_controversial_penalty",
  },
  {
    id: "momentum_shift",
    patterns: [
      /cambi[oó]\s+el\s+rumbo/i,
      /volte[oó]\s+el\s+partido/i,
      /deci(?:si[oó]n|dieron)\s+el\s+encuentro/i,
    ],
    evidenceKey: "allows_momentum_shift",
  },
  {
    id: "score_confirmation",
    patterns: [
      /confirm[oó]\s+el\s+marcador/i,
      /confirmando\s+el\s+marcador/i,
      /sell[oó]\s+la\s+victoria/i,
      /sentenci[oó]\s+el\s+partido/i,
    ],
    evidenceKey: "allows_score_confirmation",
  },
  {
    id: "psychological",
    patterns: [
      /domin[oó]\s+psicol[oó]gicamente/i,
      /control[oó]\s+emocionalmente/i,
      /superioridad\s+mental/i,
      /quebr[oó]\s+psicol[oó]gicamente/i,
    ],
    evidenceKey: "allows_psychological_control",
  },
];

export interface HallucinationViolation {
  rule_id: string;
  matched: string;
  field: string;
}

function collectOutputStrings(output: MatchSummaryOutput): Array<{ field: string; text: string }> {
  return collectAssembledNarrativeStrings(output);
}

export function scanMatchSummaryHallucinations(
  output: MatchSummaryOutput,
  input: MatchSummaryInput,
): HallucinationViolation[] {
  const evidence = input.narrative_evidence;
  if (!evidence) return [];

  const violations: HallucinationViolation[] = [];

  for (const { field, text } of collectOutputStrings(output)) {
    for (const rule of FORBIDDEN_PHRASE_RULES) {
      if (evidence[rule.evidenceKey]) continue;
      for (const pattern of rule.patterns) {
        const match = text.match(pattern);
        if (match) {
          violations.push({
            rule_id: rule.id,
            matched: match[0],
            field,
          });
          break;
        }
      }
    }
  }

  return violations;
}

export function isMatchSummaryHallucinationFree(
  output: MatchSummaryOutput,
  input: MatchSummaryInput,
): boolean {
  return scanMatchSummaryHallucinations(output, input).length === 0;
}

export function formatHallucinationError(
  violations: HallucinationViolation[],
): string {
  if (violations.length === 0) return "HALLUCINATION_GUARD";
  const first = violations[0]!;
  return `HALLUCINATION_GUARD:${first.rule_id}`;
}

