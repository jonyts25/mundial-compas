import {
  buildTimelineEventText,
  formatTimelineMinute,
} from "@/lib/ai/match-summary/match-summary-event-text";
import { buildFactsLocked } from "@/lib/ai/match-summary/match-summary-name-guard";
import type { MatchSummaryInput } from "@/lib/ai/match-summary/match-summary-types";

export interface MatchSummaryNarrativeEvidence {
  allows_second_yellow_red: boolean;
  allows_direct_red: boolean;
  allows_controversial_penalty: boolean;
  allows_momentum_shift: boolean;
  allows_score_confirmation: boolean;
  allows_psychological_control: boolean;
}

function isSecondYellowDetail(detail: string | null): boolean {
  const d = (detail ?? "").toLowerCase();
  return d.includes("second yellow") || d.includes("2nd yellow");
}

function isDirectRedDetail(detail: string | null): boolean {
  const d = (detail ?? "").toLowerCase();
  if (!d.includes("red")) return false;
  return !isSecondYellowDetail(detail);
}

function isControversialPenaltyDetail(detail: string | null): boolean {
  const d = (detail ?? "").toLowerCase();
  return (
    d.includes("penalty confirmed") ||
    d.includes("penalty cancelled") ||
    d.includes("penal confirmado") ||
    d.includes("penal cancelado")
  );
}

/** Flags explícitos: la IA solo puede usar frases prohibidas si el flag es true. */
export function buildNarrativeEvidence(
  input: MatchSummaryInput,
): MatchSummaryNarrativeEvidence {
  let allows_second_yellow_red = false;
  let allows_direct_red = false;
  let allows_controversial_penalty = false;

  for (const ev of input.timeline) {
    if (ev.type === "tarjeta_roja" && isSecondYellowDetail(ev.detail)) {
      allows_second_yellow_red = true;
    }
    if (ev.type === "tarjeta_roja" && isDirectRedDetail(ev.detail)) {
      allows_direct_red = true;
    }
    if (ev.type === "var" && isControversialPenaltyDetail(ev.detail)) {
      allows_controversial_penalty = true;
    }
  }

  return {
    allows_second_yellow_red,
    allows_direct_red,
    allows_controversial_penalty,
    allows_momentum_shift: false,
    allows_score_confirmation: false,
    allows_psychological_control: false,
  };
}

/** Hechos verificables generados por código (no por IA). */
export function buildVerifiedFacts(input: MatchSummaryInput): string[] {
  const { match, statistics, timeline } = input;
  const facts: string[] = [];

  facts.push(
    `Marcador final: ${match.home_name} ${match.score_home}–${match.score_away} ${match.away_name}.`,
  );

  if (statistics) {
    if (
      statistics.possession_home_pct != null &&
      statistics.possession_away_pct != null
    ) {
      facts.push(
        `Posesión: ${match.home_code} ${statistics.possession_home_pct}% – ${statistics.possession_away_pct}% ${match.away_code}.`,
      );
    }
    if (statistics.shots_on_home != null && statistics.shots_on_away != null) {
      facts.push(
        `Tiros a puerta: ${match.home_code} ${statistics.shots_on_home} – ${statistics.shots_on_away} ${match.away_code}.`,
      );
    }
  }

  const sorted = [...timeline].sort((a, b) => {
    const ka = (a.minute ?? 9999) * 100 + (a.extra ?? 0);
    const kb = (b.minute ?? 9999) * 100 + (b.extra ?? 0);
    return ka - kb;
  });

  for (const ev of sorted) {
    facts.push(
      ev.event_text ?? buildTimelineEventText(ev),
    );
  }

  const scoring = sorted.filter(
    (e) => e.type === "gol" || e.type === "penalty_goal" || e.type === "own_goal",
  );
  if (scoring.length === 1) {
    const g = scoring[0]!;
    facts.push(
      `Único gol del partido: ${g.player} (${g.team_code}) al ${formatTimelineMinute(g.minute, g.extra)}.`,
    );
  }

  return facts;
}

export function enrichMatchSummaryInput(input: MatchSummaryInput): MatchSummaryInput {
  const timeline = input.timeline.map((ev) => ({
    ...ev,
    event_text:
      ev.event_text ?? buildTimelineEventText(ev),
  }));
  const withTimeline = { ...input, timeline };
  return {
    ...withTimeline,
    verified_facts: buildVerifiedFacts(withTimeline),
    facts_locked: buildFactsLocked(withTimeline),
    narrative_evidence: buildNarrativeEvidence(withTimeline),
  };
}

