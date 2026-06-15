/**
 * Señales y tipos de El Pitoniso — puro (client + server safe).
 * Sin Supabase ni next/headers.
 */

import type { Outcome } from "@/lib/insights/pick-aggregates";
import type { MatchPreviewTeamInput } from "@/lib/prediction-engine/match-preview";
import type {
  GroupMiniStandings,
  TeamCompetitionForm,
} from "@/lib/prediction-engine/team-competition-form";
import type { FaseMundial } from "@/types/database";

export interface PitonisoPartidoSnapshot {
  id: string;
  fase: FaseMundial;
  grupo: string | null;
  jornada: number | null;
  equipoLocalCodigo: string;
  equipoVisitanteCodigo: string;
  equipoLocalNombre: string;
  equipoVisitanteNombre: string;
  fechaKickoff: string;
  estatus: string;
}

export interface PitonisoTeamStaticBundle {
  form: TeamCompetitionForm;
  standing: GroupMiniStandings["local"] | null;
  teamInput: MatchPreviewTeamInput;
  formDebut: boolean;
}

export interface PitonisoPhaseFlags {
  isGroupPhase: boolean;
  isKnockout: boolean;
  isLastGroupMatch: boolean;
}

/** Lado favorecido por cada familia de señal. null = sin datos suficientes. */
export interface PitonisoSignalLeaders {
  crowd: Outcome | null;
  table: Outcome | null;
  form: Outcome | null;
}

export type PitonisoSignalConflict =
  | "crowd_vs_table"
  | "crowd_vs_form"
  | "table_vs_form";

export type PitonisoSignalSummary =
  | "aligned"
  | "crowd_vs_form"
  | "crowd_vs_table"
  | "table_vs_form"
  | "mixed";

/** Metadata de contradicción para copy PI-3 (§1.6 del plan). */
export interface PitonisoSignalContradiction {
  hasContradiction: boolean;
  conflicts: PitonisoSignalConflict[];
  leaders: PitonisoSignalLeaders;
  summary: PitonisoSignalSummary;
}

export interface PitonisoStaticContext {
  partido: PitonisoPartidoSnapshot;
  phase: PitonisoPhaseFlags;
  local: PitonisoTeamStaticBundle;
  visitante: PitonisoTeamStaticBundle;
  groupStandings: GroupMiniStandings | null;
  signalLeaders: PitonisoSignalLeaders;
  staticSignalContradiction: PitonisoSignalContradiction;
}

const FORM_TIE_EPSILON = 0.05;

/** Multitud dominante desde agregados (PI-3). */
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
  key: PitonisoSignalConflict,
): PitonisoSignalConflict | null {
  if (left == null || right == null || left === right) return null;
  return key;
}

/**
 * Detecta contradicción entre multitud, tabla y forma.
 * Pura — PI-3 pasa `crowd` tras calcular agregados.
 */
export function analyzePitonisoSignalContradiction(
  leaders: PitonisoSignalLeaders,
): PitonisoSignalContradiction {
  const conflicts: PitonisoSignalConflict[] = [];

  const cvt = conflictKey(leaders.crowd, leaders.table, "crowd_vs_table");
  if (cvt) conflicts.push(cvt);
  const cvf = conflictKey(leaders.crowd, leaders.form, "crowd_vs_form");
  if (cvf) conflicts.push(cvf);
  const tvf = conflictKey(leaders.table, leaders.form, "table_vs_form");
  if (tvf) conflicts.push(tvf);

  let summary: PitonisoSignalSummary = "aligned";
  if (conflicts.length >= 2) {
    summary = "mixed";
  } else if (conflicts.length === 1) {
    summary = conflicts[0] as PitonisoSignalSummary;
  }

  return {
    hasContradiction: conflicts.length > 0,
    conflicts,
    leaders,
    summary,
  };
}

/** Re-calcula contradicción incluyendo multitud (PI-3). */
export function analyzePitonisoSignalContradictionWithCrowd(
  staticLeaders: Pick<PitonisoSignalLeaders, "table" | "form">,
  crowd: Outcome | null,
): PitonisoSignalContradiction {
  return analyzePitonisoSignalContradiction({
    crowd,
    table: staticLeaders.table,
    form: staticLeaders.form,
  });
}

/** Convierte contexto estático a flags de `MatchPreviewInput` (PI-3). */
export function toMatchPreviewPhaseFlags(
  phase: PitonisoPhaseFlags,
): Pick<
  import("@/lib/prediction-engine/match-preview").MatchPreviewInput,
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
): PitonisoSignalLeaders {
  return {
    crowd: null,
    table: leaderFromTable(localInput, visitanteInput),
    form: leaderFromForm(localInput, visitanteInput),
  };
}
