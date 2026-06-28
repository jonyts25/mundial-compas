import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import { buildFullKnockoutTree } from "@/lib/standings/build-knockout-bracket";
import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import {
  calculateGroupStandingsFromPartidos,
  type PartidoGrupoRow,
} from "@/lib/standings/calculate-group-standings";
import { indexKnockoutPartidosByMatchNumber } from "@/lib/standings/knockout-schedule-utils";
import type { StandingGroup } from "@/lib/standings/types";
import { knockoutMatchIdFromNumber } from "@/lib/world-cup/knockout-match-ids";
import {
  areBothTeamsConfirmed,
  isTbdTeamCode,
} from "@/lib/world-cup/knockout-participant-utils";
import type { Partido } from "@/types/database";

export interface ResolvedKnockoutSide {
  teamId: string | null;
  teamName: string | null;
  label: string;
  codigo: string;
  nombre: string;
}

export interface ResolvedKnockoutParticipant {
  matchNumber: number;
  knockoutMatchId: string | null;
  partidoId: string | null;
  home: ResolvedKnockoutSide;
  away: ResolvedKnockoutSide;
  isDefined: boolean;
}

const TBD_CODE = "TBD";
const TBD2_CODE = "TBD2";

function sideToStorage(
  teamId: string | null,
  teamName: string | null,
  label: string,
  side: "home" | "away",
): ResolvedKnockoutSide {
  if (teamId && teamName) {
    return {
      teamId,
      teamName,
      label,
      codigo: teamId,
      nombre: teamName,
    };
  }

  return {
    teamId: null,
    teamName: null,
    label,
    codigo: side === "home" ? TBD_CODE : TBD2_CODE,
    nombre: label || "Equipo por definir",
  };
}

export function resolveKnockoutParticipants(input: {
  groups?: StandingGroup[];
  bestThirdPlaces?: BestThirdPlaceRow[];
  partidosGrupo: PartidoGrupoRow[];
  knockoutPartidos: Partido[];
}): ResolvedKnockoutParticipant[] {
  const { groups: calculatedGroups } = calculateGroupStandingsFromPartidos(
    input.partidosGrupo,
  );
  const groups = input.groups ?? calculatedGroups;
  const bestThirdPlaces =
    input.bestThirdPlaces ?? buildBestThirdPlacesRanking(groups);

  const tree = buildFullKnockoutTree({
    groups,
    bestThirdPlaces,
    partidosGrupo: input.partidosGrupo,
    knockoutPartidos: input.knockoutPartidos,
  });

  const dbByMatch = indexKnockoutPartidosByMatchNumber(input.knockoutPartidos);
  const results: ResolvedKnockoutParticipant[] = [];

  for (const phase of tree.phases) {
    for (const match of phase.matches) {
      const db = dbByMatch.get(match.matchNumber);
      results.push({
        matchNumber: match.matchNumber,
        knockoutMatchId: knockoutMatchIdFromNumber(match.matchNumber),
        partidoId: db?.id ?? null,
        home: sideToStorage(
          match.home.teamId,
          match.home.teamName,
          match.home.label,
          "home",
        ),
        away: sideToStorage(
          match.away.teamId,
          match.away.teamName,
          match.away.label,
          "away",
        ),
        isDefined: match.isDefined,
      });
    }
  }

  return results;
}

export type ParticipantPatch = {
  partidoId: string;
  matchNumber: number;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  metadata: Record<string, unknown>;
};

const LIVE_OR_DONE = new Set(["en_vivo", "medio_tiempo", "finalizado"]);

/** Build DB patches for scheduled knockout matches; skips live/finished. */
export function buildKnockoutParticipantPatches(
  partidosGrupo: PartidoGrupoRow[],
  knockoutPartidos: Partido[],
): ParticipantPatch[] {
  const resolved = resolveKnockoutParticipants({
    partidosGrupo,
    knockoutPartidos,
  });
  const dbByMatch = indexKnockoutPartidosByMatchNumber(knockoutPartidos);
  const patches: ParticipantPatch[] = [];

  for (const row of resolved) {
    const db = dbByMatch.get(row.matchNumber);
    if (!db?.id) continue;
    if (LIVE_OR_DONE.has(db.estatus)) continue;

    const existingMeta =
      typeof db.metadata === "object" && db.metadata !== null
        ? (db.metadata as Record<string, unknown>)
        : {};

    const patch: ParticipantPatch = {
      partidoId: db.id,
      matchNumber: row.matchNumber,
      equipo_local_codigo: row.home.codigo,
      equipo_visitante_codigo: row.away.codigo,
      equipo_local_nombre: row.home.nombre,
      equipo_visitante_nombre: row.away.nombre,
      metadata: {
        ...existingMeta,
        participants_resolved_at: new Date().toISOString(),
        participants_defined: row.isDefined,
      },
    };

    const unchanged =
      db.equipo_local_codigo === patch.equipo_local_codigo &&
      db.equipo_visitante_codigo === patch.equipo_visitante_codigo &&
      db.equipo_local_nombre === patch.equipo_local_nombre &&
      db.equipo_visitante_nombre === patch.equipo_visitante_nombre;

    if (!unchanged) {
      patches.push(patch);
    }
  }

  return patches;
}

export function partidoFromResolvedSide(
  partido: Pick<
    Partido,
    "equipo_local_codigo" | "equipo_visitante_codigo" | "equipo_local_nombre" | "equipo_visitante_nombre"
  >,
): boolean {
  return areBothTeamsConfirmed(partido);
}

export function isResolvableTeamCode(code: string): boolean {
  return !isTbdTeamCode(code);
}
