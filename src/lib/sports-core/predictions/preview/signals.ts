/**
 * Señales de preview — contradicción multitud / tabla / forma (Sports Core · SC-3).
 *
 * TypeScript puro. Sin Supabase, React ni tipos de producto Mundial.
 *
 * TODO(SC-6): renombrar Pitoniso* → Signal* en exports públicos del core.
 */

import type { Outcome } from "@/lib/insights/pick-aggregates";
import type {
  MatchPreviewInput,
  MatchPreviewTeamInput,
} from "@/lib/sports-core/predictions/preview/match-preview";

export interface PreviewPhaseFlags {
  isGroupPhase: boolean;
  isKnockout: boolean;
  isLastGroupMatch: boolean;
}

/** @deprecated SC-6 — usar PreviewPhaseFlags */
export type PitonisoPhaseFlags = PreviewPhaseFlags;

/** Lado favorecido por cada familia de señal. null = sin datos suficientes. */
export interface SignalLeaders {
  crowd: Outcome | null;
  table: Outcome | null;
  form: Outcome | null;
}

/** @deprecated SC-6 — usar SignalLeaders */
export type PitonisoSignalLeaders = SignalLeaders;

export type SignalConflict =
  | "crowd_vs_table"
  | "crowd_vs_form"
  | "table_vs_form";

/** @deprecated SC-6 */
export type PitonisoSignalConflict = SignalConflict;

export type SignalSummary =
  | "aligned"
  | "crowd_vs_form"
  | "crowd_vs_table"
  | "table_vs_form"
  | "mixed";

/** @deprecated SC-6 */
export type PitonisoSignalSummary = SignalSummary;

export interface SignalContradiction {
  hasContradiction: boolean;
  conflicts: SignalConflict[];
  leaders: SignalLeaders;
  summary: SignalSummary;
}

/** @deprecated SC-6 */
export type PitonisoSignalContradiction = SignalContradiction;

const FORM_TIE_EPSILON = 0.05;

export function leaderFromCrowdOutcomes(
  localPct: number,
  drawPct: number,
  awayPct: number,
): Outcome {
  if (localPct >= drawPct && localPct >= awayPct) return "local";
  if (awayPct >= drawPct && awayPct >= localPct) return "visitante";
  return "empate";
}

function conflictKey(
  left: Outcome | null,
  right: Outcome | null,
  key: SignalConflict,
): SignalConflict | null {
  if (left == null || right == null || left === right) return null;
  return key;
}

export function analyzeSignalContradiction(
  leaders: SignalLeaders,
): SignalContradiction {
  const conflicts: SignalConflict[] = [];

  const cvt = conflictKey(leaders.crowd, leaders.table, "crowd_vs_table");
  if (cvt) conflicts.push(cvt);
  const cvf = conflictKey(leaders.crowd, leaders.form, "crowd_vs_form");
  if (cvf) conflicts.push(cvf);
  const tvf = conflictKey(leaders.table, leaders.form, "table_vs_form");
  if (tvf) conflicts.push(tvf);

  let summary: SignalSummary = "aligned";
  if (conflicts.length >= 2) {
    summary = "mixed";
  } else if (conflicts.length === 1) {
    summary = conflicts[0] as SignalSummary;
  }

  return {
    hasContradiction: conflicts.length > 0,
    conflicts,
    leaders,
    summary,
  };
}

/** @deprecated SC-6 — usar analyzeSignalContradiction */
export const analyzePitonisoSignalContradiction = analyzeSignalContradiction;

export function analyzeSignalContradictionWithCrowd(
  staticLeaders: Pick<SignalLeaders, "table" | "form">,
  crowd: Outcome | null,
): SignalContradiction {
  return analyzeSignalContradiction({
    crowd,
    table: staticLeaders.table,
    form: staticLeaders.form,
  });
}

/** @deprecated SC-6 */
export const analyzePitonisoSignalContradictionWithCrowd =
  analyzeSignalContradictionWithCrowd;

export function toMatchPreviewPhaseFlags(
  phase: PreviewPhaseFlags,
): Pick<
  MatchPreviewInput,
  "isGroupPhase" | "isKnockout" | "isLastGroupMatch"
> {
  return {
    isGroupPhase: phase.isGroupPhase,
    isKnockout: phase.isKnockout,
    isLastGroupMatch: phase.isLastGroupMatch,
  };
}

export function leaderFromTable(
  local: MatchPreviewTeamInput,
  visitante: MatchPreviewTeamInput,
): Outcome | null {
  if (local.tablePosition == null || visitante.tablePosition == null) {
    return null;
  }
  if (local.tablePosition < visitante.tablePosition) return "local";
  if (visitante.tablePosition < local.tablePosition) return "visitante";
  return "empate";
}

export function leaderFromForm(
  local: MatchPreviewTeamInput,
  visitante: MatchPreviewTeamInput,
): Outcome | null {
  const lf = local.formNorm;
  const af = visitante.formNorm;
  if (lf == null && af == null) return null;
  if (lf == null) return "visitante";
  if (af == null) return "local";
  if (Math.abs(lf - af) <= FORM_TIE_EPSILON) return "empate";
  return lf > af ? "local" : "visitante";
}

export function buildStaticSignalLeaders(
  localInput: MatchPreviewTeamInput,
  visitanteInput: MatchPreviewTeamInput,
): SignalLeaders {
  return {
    crowd: null,
    table: leaderFromTable(localInput, visitanteInput),
    form: leaderFromForm(localInput, visitanteInput),
  };
}
