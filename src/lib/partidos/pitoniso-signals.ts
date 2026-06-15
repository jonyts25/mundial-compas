/**
 * Tipos de contexto estático — El Pitoniso (capa producto Mundial Compas).
 *
 * Funciones puras de señales: `@/lib/sports-core/predictions/preview/signals`.
 * TODO(SC-6): mover tipos de producto a adapters/mundial-compas.
 */

import type { MatchPreviewTeamInput } from "@/lib/prediction-engine/match-preview";
import type {
  GroupMiniStandings,
  TeamCompetitionForm,
} from "@/lib/prediction-engine/team-competition-form";
import type { FaseMundial } from "@/types/database";

export type {
  PitonisoPhaseFlags,
  PitonisoSignalConflict,
  PitonisoSignalContradiction,
  PitonisoSignalLeaders,
  PitonisoSignalSummary,
  PreviewPhaseFlags,
  SignalConflict,
  SignalContradiction,
  SignalLeaders,
  SignalSummary,
} from "@/lib/sports-core/predictions/preview/signals";

export {
  analyzePitonisoSignalContradiction,
  analyzePitonisoSignalContradictionWithCrowd,
  analyzeSignalContradiction,
  analyzeSignalContradictionWithCrowd,
  buildStaticSignalLeaders,
  leaderFromCrowdOutcomes,
  leaderFromForm,
  leaderFromTable,
  toMatchPreviewPhaseFlags,
} from "@/lib/sports-core/predictions/preview/signals";

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

export interface PitonisoStaticContext {
  partido: PitonisoPartidoSnapshot;
  phase: import("@/lib/sports-core/predictions/preview/signals").PreviewPhaseFlags;
  local: PitonisoTeamStaticBundle;
  visitante: PitonisoTeamStaticBundle;
  groupStandings: GroupMiniStandings | null;
  signalLeaders: import("@/lib/sports-core/predictions/preview/signals").SignalLeaders;
  staticSignalContradiction: import("@/lib/sports-core/predictions/preview/signals").SignalContradiction;
}
