/**
 * Forma y mini-tabla del torneo — El Pitoniso (PI-2).
 *
 * Solo lectura sobre `partidos` en Supabase. Sin API Football.
 * Reutiliza `calculateGroupStandingsFromPartidos` para la mini-tabla.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateGroupStandingsFromPartidos,
  type PartidoGrupoRow,
} from "@/lib/standings/calculate-group-standings";
import { isWorldCupGroupLetter } from "@/lib/standings/world-cup-groups";
import type { StandingTeamRow } from "@/lib/standings/types";

export const DEFAULT_FORM_LIMIT = 3;

const PARTIDO_FORM_SELECT =
  "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante";

const PARTIDO_GRUPO_SELECT =
  "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, estatus, marcador_local, marcador_visitante";

export interface TeamCompetitionForm {
  /** Partidos considerados (≤ limit). */
  played: number;
  /** Suma 3/1/0 en la ventana. */
  formPoints: number;
  /** Goles a favor en la ventana. */
  formGF: number;
  /** Goles en contra en la ventana. */
  formGC: number;
  /** Racha reciente, ej. "WDL" (más reciente primero). */
  formString: string;
  /** formPoints / (3 × min(played, limit)), 0–1. null si sin historial. */
  formNorm: number | null;
}

export interface GroupMiniStandings {
  groupKey: string;
  groupSize: number;
  teams: StandingTeamRow[];
  local: TeamStandingInGroup | null;
  visitante: TeamStandingInGroup | null;
}

export interface TeamStandingInGroup {
  teamCode: string;
  teamName: string;
  position: number;
  points: number;
  played: number;
  goalDiff: number;
  /** 0 si top 2; si no, pts del 2.º − pts del equipo. */
  pointsFromTop2: number;
}

interface PartidoFormRow {
  id: string;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  fecha_kickoff: string;
  marcador_local: number;
  marcador_visitante: number;
}

function toPartidoGrupoRow(row: {
  id: string;
  fase: string;
  grupo: string | null;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  estatus: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
}): PartidoGrupoRow {
  return {
    id: row.id,
    fase: row.fase,
    grupo: row.grupo,
    equipo_local_codigo: row.equipo_local_codigo,
    equipo_visitante_codigo: row.equipo_visitante_codigo,
    equipo_local_nombre: row.equipo_local_nombre,
    equipo_visitante_nombre: row.equipo_visitante_nombre,
    marcador_local: row.marcador_local,
    marcador_visitante: row.marcador_visitante,
    estatus: row.estatus,
  };
}

function computePointsFromTop2(
  position: number,
  teamPoints: number,
  secondPlacePoints: number,
): number {
  if (position <= 2) return 0;
  return Math.max(0, secondPlacePoints - teamPoints);
}

function findTeamInGroup(
  teams: StandingTeamRow[],
  teamCode: string,
): TeamStandingInGroup | null {
  const row = teams.find((t) => t.teamId === teamCode);
  if (!row) return null;

  const sorted = [...teams].sort((a, b) => a.position - b.position);
  const second = sorted.find((t) => t.position === 2) ?? sorted[1];
  const secondPoints = second?.points ?? 0;

  return {
    teamCode: row.teamId,
    teamName: row.teamName,
    position: row.position,
    points: row.points,
    played: row.played,
    goalDiff: row.goalDiff,
    pointsFromTop2: computePointsFromTop2(row.position, row.points, secondPoints),
  };
}

/**
 * Mini-tabla del grupo calculada solo con partidos **finalizados** antes del kickoff.
 */
export async function fetchGroupMiniStandings(
  supabase: SupabaseClient,
  grupo: string,
  localTeamCode: string,
  visitanteTeamCode: string,
  beforeKickoffIso: string,
): Promise<GroupMiniStandings | null> {
  if (!isWorldCupGroupLetter(grupo)) return null;

  const { data: rows, error } = await supabase
    .from("partidos")
    .select(PARTIDO_GRUPO_SELECT)
    .eq("fase", "grupos")
    .eq("grupo", grupo.toUpperCase())
    .eq("estatus", "finalizado")
    .lt("fecha_kickoff", beforeKickoffIso)
    .not("marcador_local", "is", null)
    .not("marcador_visitante", "is", null);

  if (error) throw new Error(error.message);
  if (!rows?.length) return null;

  const partidoRows = rows.map((r) => toPartidoGrupoRow(r as PartidoGrupoRow));
  const { groups } = calculateGroupStandingsFromPartidos(partidoRows);
  const group = groups.find((g) => g.groupKey === grupo.toUpperCase());
  if (!group || group.teams.length === 0) return null;

  return {
    groupKey: group.groupKey,
    groupSize: group.teams.length,
    teams: group.teams,
    local: findTeamInGroup(group.teams, localTeamCode),
    visitante: findTeamInGroup(group.teams, visitanteTeamCode),
  };
}

/**
 * Forma reciente del equipo en el torneo (partidos finalizados antes del kickoff).
 */
export async function fetchTeamCompetitionForm(
  supabase: SupabaseClient,
  teamCode: string,
  beforeKickoffIso: string,
  limit = DEFAULT_FORM_LIMIT,
): Promise<TeamCompetitionForm> {
  const empty: TeamCompetitionForm = {
    played: 0,
    formPoints: 0,
    formGF: 0,
    formGC: 0,
    formString: "",
    formNorm: null,
  };

  const { data: rows, error } = await supabase
    .from("partidos")
    .select(PARTIDO_FORM_SELECT)
    .eq("estatus", "finalizado")
    .lt("fecha_kickoff", beforeKickoffIso)
    .not("marcador_local", "is", null)
    .not("marcador_visitante", "is", null)
    .or(
      `equipo_local_codigo.eq.${teamCode},equipo_visitante_codigo.eq.${teamCode}`,
    )
    .order("fecha_kickoff", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!rows?.length) return empty;

  let formPoints = 0;
  let formGF = 0;
  let formGC = 0;
  const chars: string[] = [];

  for (const raw of rows as PartidoFormRow[]) {
    const isHome = raw.equipo_local_codigo === teamCode;
    const gf = isHome ? raw.marcador_local : raw.marcador_visitante;
    const gc = isHome ? raw.marcador_visitante : raw.marcador_local;

    formGF += gf;
    formGC += gc;

    if (gf > gc) {
      formPoints += 3;
      chars.push("W");
    } else if (gf < gc) {
      chars.push("L");
    } else {
      formPoints += 1;
      chars.push("D");
    }
  }

  const played = rows.length;
  const formNorm = formPoints / (3 * Math.min(played, limit));

  return {
    played,
    formPoints,
    formGF,
    formGC,
    formString: chars.join(""),
    formNorm,
  };
}

/**
 * ¿Es la última jornada programada del grupo?
 */
export async function fetchIsLastGroupMatch(
  supabase: SupabaseClient,
  grupo: string,
  jornada: number | null,
): Promise<boolean> {
  if (jornada == null || !isWorldCupGroupLetter(grupo)) return false;

  const { data, error } = await supabase
    .from("partidos")
    .select("jornada")
    .eq("fase", "grupos")
    .eq("grupo", grupo.toUpperCase())
    .not("jornada", "is", null);

  if (error || !data?.length) return false;

  const maxJornada = Math.max(...data.map((r) => r.jornada as number));
  return jornada >= maxJornada;
}
