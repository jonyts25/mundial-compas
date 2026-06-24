import { parseMomentosFromMetadata, type MomentoClaveTipo } from "@/lib/api-football/match-events";
import { isOwnGoalFromDetail, isMissedPenaltyFromDetail } from "@/lib/api-football/goal-event-detail";
import { readPersistedMatchStatistics } from "@/lib/api-football/match-statistics";
import type { SportsNarratorPersonaId } from "@/lib/ai/sports-narrator-personas";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import {
  calculateGroupStandingsFromPartidos,
  type PartidoGrupoRow,
} from "@/lib/standings/calculate-group-standings";
import { isWorldCupGroupLetter } from "@/lib/standings/world-cup-groups";
import { readLineupsFromMetadata } from "@/lib/partidos/lineups-types";
import { createServerDataClient } from "@/lib/supabase/server-data";
import type {
  BuildMatchSummaryInputOptions,
  MatchSummaryInput,
  MatchSummaryTimelineType,
} from "@/lib/ai/match-summary/match-summary-types";

type PartidoRow = {
  id: string;
  api_football_fixture_id: number | null;
  fase: string;
  grupo: string | null;
  jornada: number | null;
  sede: string | null;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  fecha_kickoff: string;
  estatus: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  metadata: Record<string, unknown> | null;
};

function isPenaltyDetail(detail: string | null): boolean {
  if (!detail) return false;
  const d = detail.toLowerCase();
  return d.includes("penalty") && !d.includes("missed");
}

/** Exported for unit tests — maps momento → timeline type for match summary. */
export function mapMomentoToTimelineType(
  tipo: MomentoClaveTipo,
  detail: string | null,
): MatchSummaryTimelineType {
  if (tipo === "tarjeta_roja") return "tarjeta_roja";
  if (tipo === "penal_fallado") return "penal_fallado";
  if (tipo === "var") return "var";
  if (tipo === "gol_anulado") return "gol_anulado";
  if (tipo === "gol") {
    if (isMissedPenaltyFromDetail(detail)) return "penal_fallado";
    if (isOwnGoalFromDetail(detail)) return "own_goal";
    if (isPenaltyDetail(detail)) return "penalty_goal";
    return "gol";
  }
  return "gol";
}

function parseStatistics(metadata: Record<string, unknown> | null) {
  const persisted = readPersistedMatchStatistics(metadata);
  if (!persisted) return null;

  return {
    possession_home_pct: persisted.possession_home_pct,
    possession_away_pct: persisted.possession_away_pct,
    shots_on_home: persisted.shots_on_home,
    shots_on_away: persisted.shots_on_away,
    corners_home: persisted.corners_home,
    corners_away: persisted.corners_away,
    xg_home: persisted.xg_home,
    xg_away: persisted.xg_away,
  };
}

/** Exported for unit tests — maps metadata → resumen IA statistics block. */
export function parseMatchSummaryStatisticsFromMetadata(
  metadata: unknown,
): ReturnType<typeof parseStatistics> {
  if (!metadata || typeof metadata !== "object") return null;
  return parseStatistics(metadata as Record<string, unknown>);
}

function readReferee(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (typeof metadata.referee === "string" && metadata.referee.trim()) {
    return metadata.referee.trim();
  }
  const api = metadata.api_football;
  if (api && typeof api === "object") {
    const ref = (api as Record<string, unknown>).referee;
    if (typeof ref === "string" && ref.trim()) return ref.trim();
  }
  return null;
}

function toGrupoRow(p: PartidoRow): PartidoGrupoRow {
  return {
    id: p.id,
    fase: p.fase,
    grupo: p.grupo,
    equipo_local_codigo: p.equipo_local_codigo,
    equipo_visitante_codigo: p.equipo_visitante_codigo,
    equipo_local_nombre: p.equipo_local_nombre,
    equipo_visitante_nombre: p.equipo_visitante_nombre,
    marcador_local: p.marcador_local,
    marcador_visitante: p.marcador_visitante,
    estatus: p.estatus,
  };
}

function teamPosition(
  groups: ReturnType<typeof calculateGroupStandingsFromPartidos>["groups"],
  groupLetter: string,
  teamCode: string,
): number | null {
  const group = groups.find((g) => g.groupKey === groupLetter);
  const row = group?.teams.find((t) => t.teamId === teamCode);
  return row?.position ?? null;
}

function buildStandingsContext(
  partido: PartidoRow,
  groupPartidos: PartidoRow[],
): MatchSummaryInput["standings_context"] {
  if (partido.fase !== "grupos" || !isWorldCupGroupLetter(partido.grupo)) {
    return null;
  }

  const letter = partido.grupo!.toUpperCase();
  const allRows = groupPartidos.map(toGrupoRow);
  const withoutCurrent = allRows.map((row) =>
    row.id === partido.id
      ? {
          ...row,
          marcador_local: null,
          marcador_visitante: null,
          estatus: "programado",
        }
      : row,
  );

  const before = calculateGroupStandingsFromPartidos(withoutCurrent).groups;
  const after = calculateGroupStandingsFromPartidos(allRows).groups;

  return {
    group_letter: letter,
    home_position_before: teamPosition(before, letter, partido.equipo_local_codigo),
    home_position_after: teamPosition(after, letter, partido.equipo_local_codigo),
    away_position_before: teamPosition(
      before,
      letter,
      partido.equipo_visitante_codigo,
    ),
    away_position_after: teamPosition(
      after,
      letter,
      partido.equipo_visitante_codigo,
    ),
  };
}

async function buildQuinielaImpact(
  partidoId: string,
  ligaId: string,
): Promise<MatchSummaryInput["quiniela_impact"]> {
  const supabase = createServerDataClient();
  const { data: rows, error } = await supabase
    .from("pronosticos")
    .select("goles_local, goles_visitante, puntos")
    .eq("liga_id", ligaId)
    .eq("partido_id", partidoId);

  if (error || !rows?.length) return null;

  const picks = rows.map((r) => ({
    local: r.goles_local as number,
    visitante: r.goles_visitante as number,
    puntos: r.puntos as number,
  }));

  const scoreCounts = new Map<string, number>();
  for (const p of picks) {
    const key = `${p.local}-${p.visitante}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }

  let topScore: string | null = null;
  let topCount = 0;
  for (const [score, count] of scoreCounts) {
    if (count > topCount) {
      topScore = score;
      topCount = count;
    }
  }

  const total = picks.length;
  const exactHits = picks.filter((p) => p.puntos === 3).length;
  const trendHits = picks.filter((p) => p.puntos > 0).length;

  return {
    liga_scope: ligaId === LIGA_GLOBAL_ID ? "global" : "grupo",
    picks_total: total,
    most_common_score: topScore,
    most_common_score_pct:
      total > 0 && topScore ? Math.round((topCount / total) * 1000) / 10 : null,
    exact_hits_estimated: exactHits,
    trend_hits_estimated: trendHits,
  };
}

export type BuildMatchSummaryResult =
  | { ok: true; input: MatchSummaryInput }
  | { ok: false; error: string };

export async function buildMatchSummaryInput(
  partidoId: string,
  options: BuildMatchSummaryInputOptions,
): Promise<BuildMatchSummaryResult> {
  const supabase = createServerDataClient();
  const ligaId = options.liga_id ?? LIGA_GLOBAL_ID;

  const { data: partido, error } = await supabase
    .from("partidos")
    .select(
      "id, api_football_fixture_id, fase, grupo, jornada, sede, metadata, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante",
    )
    .eq("id", partidoId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!partido) return { ok: false, error: "PARTIDO_NOT_FOUND" };

  const row = partido as PartidoRow;

  if (row.estatus !== "finalizado" && row.estatus !== "en_vivo") {
    return {
      ok: false,
      error: "MATCH_NOT_FINISHED",
    };
  }

  if (row.marcador_local == null || row.marcador_visitante == null) {
    return { ok: false, error: "SCORE_UNAVAILABLE" };
  }

  const metadata = row.metadata;
  const dataGaps: string[] = [];

  const statistics = parseStatistics(metadata);
  if (!statistics) {
    dataGaps.push("statistics_not_persisted");
  }

  const lineupsRaw = readLineupsFromMetadata(metadata);
  const lineups = lineupsRaw
    ? {
        home_formation: lineupsRaw.home.formation,
        away_formation: lineupsRaw.away.formation,
      }
    : null;
  if (!lineups) {
    dataGaps.push("lineups_not_available");
  }

  const referee = readReferee(metadata);
  if (!referee) {
    dataGaps.push("referee_not_persisted");
  }

  const momentos = parseMomentosFromMetadata(metadata);
  if (momentos.length === 0) {
    dataGaps.push("timeline_empty");
  }

  const timeline = momentos.map((m) => ({
    minute: m.minuto,
    extra: m.extra,
    type: mapMomentoToTimelineType(m.tipo, m.detail),
    player: m.jugador,
    team_code: m.es_local ? row.equipo_local_codigo : row.equipo_visitante_codigo,
    detail: m.detail,
  }));

  let standings_context: MatchSummaryInput["standings_context"] = null;
  if (row.fase === "grupos" && isWorldCupGroupLetter(row.grupo)) {
    const { data: groupRows } = await supabase
      .from("partidos")
      .select(
        "id, fase, grupo, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, estatus",
      )
      .eq("fase", "grupos")
      .eq("grupo", row.grupo);

    standings_context = buildStandingsContext(
      row,
      (groupRows ?? []) as PartidoRow[],
    );
  } else {
    dataGaps.push("standings_context_not_group_stage");
  }

  const quiniela_impact = await buildQuinielaImpact(partidoId, ligaId);
  if (!quiniela_impact) {
    dataGaps.push("quiniela_picks_unavailable");
  }

  const input: MatchSummaryInput = {
    version: "match-summary-v1",
    partido_id: partidoId,
    fixture_id: row.api_football_fixture_id,
    persona_id: options.persona_id,
    locale: "es-MX",
    match: {
      home_code: row.equipo_local_codigo,
      home_name: row.equipo_local_nombre,
      away_code: row.equipo_visitante_codigo,
      away_name: row.equipo_visitante_nombre,
      score_home: row.marcador_local,
      score_away: row.marcador_visitante,
      status: row.estatus === "finalizado" ? "finalizado" : "en_vivo",
      phase: row.fase,
      group: row.grupo,
      jornada: row.jornada,
      venue: row.sede,
      referee,
      kickoff_iso: row.fecha_kickoff,
    },
    timeline,
    statistics,
    lineups,
    standings_context,
    quiniela_impact,
    data_gaps: dataGaps,
  };

  return { ok: true, input };
}

export function inferStandoutPlayer(
  input: MatchSummaryInput,
): { name: string; reason: string } | null {
  const goals = input.timeline.filter(
    (e) => e.type === "gol" || e.type === "penalty_goal",
  );
  if (goals.length === 0) return null;

  const counts = new Map<string, number>();
  for (const g of goals) {
    counts.set(g.player, (counts.get(g.player) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }

  if (!best || bestCount === 0) return null;
  if ([...counts.values()].filter((c) => c === bestCount).length > 1) {
    return null;
  }

  return {
    name: best,
    reason:
      bestCount >= 2
        ? `${bestCount} goles en el partido`
        : "Autor de un gol en el partido",
  };
}
