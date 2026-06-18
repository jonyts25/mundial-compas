import { buildKickoffIsoFromApi } from "@/lib/datetime/kickoff";
import type { ApifootballEvent } from "@/lib/apifootball/types";
import {
  buildClockState,
  hasPenaltyShootoutPayload,
  mapApifootballLiveStatus,
  parseApiMatchMinute,
  parsePenaltyScores,
  relojToMetadata,
} from "@/lib/partidos/match-clock";
import { getTeamStorageCode } from "@/lib/utils";
import type { EstatusPartido, FaseMundial } from "@/types/database";

export interface PartidoUpsertRow {
  api_football_fixture_id: number;
  fase: FaseMundial;
  grupo: string | null;
  jornada: number | null;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  sede: string | null;
  fecha_kickoff: string;
  estatus: EstatusPartido;
  marcador_local: number | null;
  marcador_visitante: number | null;
  minuto_actual: number | null;
  metadata: Record<string, unknown>;
  season_id?: string | null;
}

function parseScore(value: string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

function mapMatchStatus(status: string, matchLive?: string): EstatusPartido {
  return mapApifootballLiveStatus(status, matchLive);
}

function parseMinuteFromEvent(event: ApifootballEvent): number | null {
  return parseApiMatchMinute(event.match_status ?? "");
}
function teamCode(name: string, teamId?: string): string {
  const code = getTeamStorageCode(name);
  if (code !== "UN") return code;
  if (teamId) return `T${teamId}`.slice(0, 8);
  return "TBD";
}

function parseFase(event: ApifootballEvent): {
  fase: FaseMundial;
  grupo: string | null;
  jornada: number | null;
} {
  const stage = (event.stage_name ?? "").toLowerCase();
  const round = (event.match_round ?? "").toLowerCase();
  const league = (event.league_name ?? "").toLowerCase();

  const groupMatch =
    stage.match(/group\s+([a-l])/i) ?? round.match(/group\s+([a-l])/i);
  if (groupMatch || stage.includes("group") || league.includes("group")) {
    return {
      fase: "grupos",
      grupo: groupMatch?.[1]?.toUpperCase() ?? null,
      jornada: event.match_round ? Number.parseInt(event.match_round, 10) || null : null,
    };
  }

  if (round.includes("16") || stage.includes("round of 16")) {
    return { fase: "dieciseisavos", grupo: null, jornada: null };
  }
  if (round.includes("8") || stage.includes("quarter")) {
    return { fase: "cuartos", grupo: null, jornada: null };
  }
  if (stage.includes("semi")) {
    return { fase: "semifinal", grupo: null, jornada: null };
  }
  if (stage.includes("3rd") || stage.includes("third")) {
    return { fase: "tercer_lugar", grupo: null, jornada: null };
  }
  if (stage.includes("final") && !stage.includes("semi")) {
    return { fase: "final", grupo: null, jornada: null };
  }

  return { fase: "grupos", grupo: null, jornada: null };
}

/** Combina match_date + match_time → ISO UTC (hora en timezone del torneo, default CDMX) */
export function toKickoffISO(
  matchDate: string,
  matchTime?: string,
  timezone = "America/Mexico_City",
): string {
  return buildKickoffIsoFromApi(matchDate, matchTime, timezone);
}

export interface MapEventToPartidoOptions {
  timezone?: string;
  /** Etiqueta en metadata para fin de semana de prueba (Champions, etc.) */
  pilot?: { label: string };
}

export function mapEventToPartidoRow(
  event: ApifootballEvent,
  timezoneOrOptions: string | MapEventToPartidoOptions = "America/Mexico_City",
): PartidoUpsertRow {
  const options: MapEventToPartidoOptions =
    typeof timezoneOrOptions === "string"
      ? { timezone: timezoneOrOptions }
      : timezoneOrOptions;
  const timezone = options.timezone ?? "America/Mexico_City";
  const estatus = mapMatchStatus(event.match_status, event.match_live);
  const apiMinute = parseMinuteFromEvent(event);
  const pen = parsePenaltyScores(event);
  const reloj = buildClockState(
    event.match_status ?? "",
    estatus,
    apiMinute,
    null,
    {
      hasPenaltyScores:
        pen.local != null ||
        pen.visitante != null ||
        hasPenaltyShootoutPayload(event),
    },
  );
  const { fase, grupo, jornada } = parseFase(event);
  const localScore = parseScore(event.match_hometeam_score);
  const awayScore = parseScore(event.match_awayteam_score);
  const hasScore =
    estatus !== "programado" &&
    estatus !== "aplazado" &&
    localScore !== null &&
    awayScore !== null;

  return {
    api_football_fixture_id: Number.parseInt(event.match_id, 10),
    fase,
    grupo,
    jornada,
    equipo_local_codigo: teamCode(event.match_hometeam_name, event.match_hometeam_id),
    equipo_visitante_codigo: teamCode(
      event.match_awayteam_name,
      event.match_awayteam_id,
    ),
    equipo_local_nombre: event.match_hometeam_name,
    equipo_visitante_nombre: event.match_awayteam_name,
    sede: event.match_stadium ?? null,
    fecha_kickoff: toKickoffISO(event.match_date, event.match_time, timezone),
    estatus,
    marcador_local: hasScore ? localScore : null,
    marcador_visitante: hasScore ? awayScore : null,
    minuto_actual: reloj.ticking ? reloj.anchorMinute : null,
    metadata: {
      ...(options.pilot
        ? {
            competencia: "pilot",
            pilot: true,
            competencia_label: options.pilot.label,
          }
        : {}),
      reloj: relojToMetadata(reloj),
      ...(pen.local != null ? { marcador_penales_local: pen.local } : {}),
      ...(pen.visitante != null ? { marcador_penales_visitante: pen.visitante } : {}),
      ...(event.team_home_badge
        ? { escudo_local: event.team_home_badge }
        : {}),
      ...(event.team_away_badge
        ? { escudo_visitante: event.team_away_badge }
        : {}),
      apifootball: {
        match_id: event.match_id,
        league_id: event.league_id,
        league_name: event.league_name,
        stage_name: event.stage_name,
        match_round: event.match_round,
        match_status: event.match_status,
        timezone,
        ...(event.team_home_badge
          ? { team_home_badge: event.team_home_badge }
          : {}),
        ...(event.team_away_badge
          ? { team_away_badge: event.team_away_badge }
          : {}),
      },
    },
  };
}
