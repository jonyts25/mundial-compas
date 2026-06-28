/**
 * Orquestación de contexto estático — El Pitoniso (PI-2).
 *
 * Server-only: partido + mini-tabla + forma.
 * Los agregados de multitud llegan por `fetchPronosticosPartidoAgregados` en PI-3.
 */

import type { MatchPreviewTeamInput } from "@/lib/prediction-engine/match-preview";
import {
  fetchGroupMiniStandings,
  fetchIsLastGroupMatch,
  fetchTeamCompetitionForm,
  type GroupMiniStandings,
  type TeamCompetitionForm,
} from "@/lib/prediction-engine/team-competition-form";
import {
  areBothTeamsConfirmed,
  isKnockoutPartido,
} from "@/lib/world-cup/knockout-participant-utils";
import { createClient } from "@/lib/supabase/server";
import { lookupFifaRank } from "@/lib/sports-core/data/fifa-ranking-2026-06";
import { getFifaRankingSignal } from "@/lib/sports-core/predictions/preview/fifa-ranking-signal";
import type { FaseMundial } from "@/types/database";
import {
  analyzePitonisoSignalContradiction,
  buildStaticSignalLeaders,
  type PitonisoPartidoSnapshot,
  type PitonisoStaticContext,
} from "@/lib/partidos/pitoniso-signals";

export type {
  PitonisoPartidoSnapshot,
  PitonisoPhaseFlags,
  PitonisoSignalConflict,
  PitonisoSignalContradiction,
  PitonisoSignalLeaders,
  PitonisoSignalSummary,
  PitonisoStaticContext,
  PitonisoTeamStaticBundle,
} from "@/lib/partidos/pitoniso-signals";

export {
  analyzePitonisoSignalContradiction,
  analyzePitonisoSignalContradictionWithCrowd,
  leaderFromCrowdOutcomes,
  toMatchPreviewPhaseFlags,
} from "@/lib/partidos/pitoniso-signals";

const PITONISO_PARTIDO_SELECT =
  "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus";

function buildTeamInput(
  standing: GroupMiniStandings["local"] | null,
  form: TeamCompetitionForm,
  groupSize: number | null,
  teamCode: string,
): MatchPreviewTeamInput {
  const fifaEntry = lookupFifaRank(teamCode);
  return {
    tablePosition: standing?.position ?? null,
    groupSize,
    formNorm: form.formNorm,
    pointsFromTop2: standing?.pointsFromTop2 ?? null,
    fifaRank: fifaEntry?.rank ?? null,
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

  if (
    isKnockoutPartido({ fase: partido.fase as FaseMundial }) &&
    !areBothTeamsConfirmed({
      equipo_local_codigo: partido.equipo_local_codigo as string,
      equipo_visitante_codigo: partido.equipo_visitante_codigo as string,
      equipo_local_nombre: partido.equipo_local_nombre as string,
      equipo_visitante_nombre: partido.equipo_visitante_nombre as string,
    })
  ) {
    return {
      ok: false,
      error: "El Pitoniso estará disponible cuando se confirmen ambos equipos",
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
    snapshot.equipoLocalCodigo,
  );
  const visitanteInput = buildTeamInput(
    groupStandings?.visitante ?? null,
    visitanteForm,
    groupSize,
    snapshot.equipoVisitanteCodigo,
  );

  const rankingSignal = getFifaRankingSignal(
    snapshot.equipoLocalCodigo,
    snapshot.equipoVisitanteCodigo,
  );

  const signalLeaders = buildStaticSignalLeaders(
    localInput,
    visitanteInput,
    rankingSignal,
  );
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
      rankingSignal,
    },
  };
}
