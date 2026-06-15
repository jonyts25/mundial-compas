/**
 * Orquestación de contexto estático — El Pitoniso (PI-2).
 *
 * Server-only: partido + mini-tabla + forma + alineación/contradicción de señales.
 * Los agregados de multitud llegan por `fetchPronosticosPartidoAgregados` en PI-3.
 */

import type { Outcome } from "@/lib/insights/pick-aggregates";
import type { MatchPreviewTeamInput } from "@/lib/prediction-engine/match-preview";
import {
  fetchGroupMiniStandings,
  fetchIsLastGroupMatch,
  fetchTeamCompetitionForm,
  type GroupMiniStandings,
  type TeamCompetitionForm,
} from "@/lib/prediction-engine/team-competition-form";
import { createClient } from "@/lib/supabase/server";
import type { FaseMundial } from "@/types/database";

const PITONISO_PARTIDO_SELECT =
  "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus";

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
  /** Tabla + forma (crowd null hasta PI-3). */
  signalLeaders: PitonisoSignalLeaders;
  /** Solo señales estáticas; PI-3 re-calcula con multitud. */
  staticSignalContradiction: PitonisoSignalContradiction;
}

const FORM_TIE_EPSILON = 0.05;

function buildTeamInput(
  standing: GroupMiniStandings["local"] | null,
  form: TeamCompetitionForm,
  groupSize: number | null,
): MatchPreviewTeamInput {
  return {
    tablePosition: standing?.position ?? null,
    groupSize,
    formNorm: form.formNorm,
    pointsFromTop2: standing?.pointsFromTop2 ?? null,
  };
}

function leaderFromTable(
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

function leaderFromForm(
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

function buildStaticLeaders(
  localInput: MatchPreviewTeamInput,
  visitanteInput: MatchPreviewTeamInput,
): PitonisoSignalLeaders {
  return {
    crowd: null,
    table: leaderFromTable(localInput, visitanteInput),
    form: leaderFromForm(localInput, visitanteInput),
  };
}

export type FetchPitonisoStaticContextResult =
  | { ok: true; context: PitonisoStaticContext }
  | { ok: false; error: string };

/**
 * Contexto estático serializable para PitonisoCard (PI-3).
 * Solo partidos `programado`.
 */
export async function fetchPitonisoStaticContext(
  partidoId: string,
): Promise<FetchPitonisoStaticContextResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión" };
  }

  const { data: partido, error: partidoError } = await supabase
    .from("partidos")
    .select(PITONISO_PARTIDO_SELECT)
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) {
    return { ok: false, error: "Partido no encontrado" };
  }

  if (partido.estatus !== "programado") {
    return {
      ok: false,
      error: "El Pitoniso solo está disponible antes del partido",
    };
  }

  const snapshot: PitonisoPartidoSnapshot = {
    id: partido.id as string,
    fase: partido.fase as FaseMundial,
    grupo: partido.grupo as string | null,
    jornada: partido.jornada as number | null,
    equipoLocalCodigo: partido.equipo_local_codigo as string,
    equipoVisitanteCodigo: partido.equipo_visitante_codigo as string,
    equipoLocalNombre: partido.equipo_local_nombre as string,
    equipoVisitanteNombre: partido.equipo_visitante_nombre as string,
    fechaKickoff: partido.fecha_kickoff as string,
    estatus: partido.estatus as string,
  };

  const isGroupPhase = snapshot.fase === "grupos";
  const isKnockout = !isGroupPhase;

  const [localForm, visitanteForm, groupStandings, isLastGroupMatch] =
    await Promise.all([
      fetchTeamCompetitionForm(
        supabase,
        snapshot.equipoLocalCodigo,
        snapshot.fechaKickoff,
      ),
      fetchTeamCompetitionForm(
        supabase,
        snapshot.equipoVisitanteCodigo,
        snapshot.fechaKickoff,
      ),
      snapshot.grupo && isGroupPhase
        ? fetchGroupMiniStandings(
            supabase,
            snapshot.grupo,
            snapshot.equipoLocalCodigo,
            snapshot.equipoVisitanteCodigo,
            snapshot.fechaKickoff,
          )
        : Promise.resolve(null),
      snapshot.grupo && isGroupPhase
        ? fetchIsLastGroupMatch(supabase, snapshot.grupo, snapshot.jornada)
        : Promise.resolve(false),
    ]);

  const groupSize = groupStandings?.groupSize ?? null;

  const localInput = buildTeamInput(
    groupStandings?.local ?? null,
    localForm,
    groupSize,
  );
  const visitanteInput = buildTeamInput(
    groupStandings?.visitante ?? null,
    visitanteForm,
    groupSize,
  );

  const signalLeaders = buildStaticLeaders(localInput, visitanteInput);
  const staticSignalContradiction =
    analyzePitonisoSignalContradiction(signalLeaders);

  return {
    ok: true,
    context: {
      partido: snapshot,
      phase: {
        isGroupPhase,
        isKnockout,
        isLastGroupMatch,
      },
      local: {
        form: localForm,
        standing: groupStandings?.local ?? null,
        teamInput: localInput,
        formDebut: localForm.formNorm == null,
      },
      visitante: {
        form: visitanteForm,
        standing: groupStandings?.visitante ?? null,
        teamInput: visitanteInput,
        formDebut: visitanteForm.formNorm == null,
      },
      groupStandings,
      signalLeaders,
      staticSignalContradiction,
    },
  };
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