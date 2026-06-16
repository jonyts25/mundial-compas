import { buildRelojFromApiSportsFixture } from "@/lib/api-football/match-clock";
import { mapApiStatus } from "@/lib/api-football/status-map";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
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
  canal_transmision: "sin_asignar";
  minuto_actual: number | null;
  metadata: Record<string, unknown>;
}

function resolveTeamCode(team: { id: number; name: string; code?: string | null }): string {
  if (team.code && /^[A-Za-z]{2,4}$/.test(team.code)) {
    return team.code.toUpperCase().slice(0, 3);
  }
  return getTeamStorageCode(team.name);
}

function parseFaseAndGrupo(round: string | null | undefined): {
  fase: FaseMundial;
  grupo: string | null;
  jornada: number | null;
} {
  if (!round) return { fase: "grupos", grupo: null, jornada: null };

  const r = round.toLowerCase();

  const groupMatch = r.match(/group\s+([a-l])/i);
  if (groupMatch || r.includes("group stage") || r.includes("group")) {
    const grupo = groupMatch?.[1]?.toUpperCase() ?? null;
    const jornadaMatch =
      r.match(/group\s+stage\s*-\s*(\d+)/i) ?? r.match(/-?\s*(\d+)\s*$/);
    return {
      fase: "grupos",
      grupo,
      jornada: jornadaMatch ? Number(jornadaMatch[1]) : null,
    };
  }

  if (r.includes("round of 16") || r.includes("8th finals")) {
    return { fase: "dieciseisavos", grupo: null, jornada: null };
  }
  if (r.includes("quarter")) return { fase: "cuartos", grupo: null, jornada: null };
  if (r.includes("semi") && !r.includes("3rd")) {
    return { fase: "semifinal", grupo: null, jornada: null };
  }
  if (r.includes("3rd") || r.includes("third")) {
    return { fase: "tercer_lugar", grupo: null, jornada: null };
  }
  if (r === "final" || r.endsWith(" - final")) {
    return { fase: "final", grupo: null, jornada: null };
  }
  if (r.includes("round of 32")) {
    return { fase: "dieciseisavos", grupo: null, jornada: null };
  }

  return { fase: "grupos", grupo: null, jornada: null };
}

export interface MapFixtureOptions {
  pilot?: { label: string };
}

export function mapFixtureToPartidoRow(
  item: ApiFootballFixtureItem,
  options: MapFixtureOptions = {},
): PartidoUpsertRow {
  const { fase, grupo, jornada } = parseFaseAndGrupo(item.league.round);
  const estatus = mapApiStatus(item.fixture.status.short);
  const hasScore =
    item.goals.home !== null &&
    item.goals.away !== null &&
    estatus !== "programado" &&
    estatus !== "aplazado";

  const sedeParts = [
    item.fixture.venue?.name,
    item.fixture.venue?.city,
  ].filter(Boolean);

  const { reloj, minuto_actual: minutoReloj } = buildRelojFromApiSportsFixture(item);

  return {
    api_football_fixture_id: item.fixture.id,
    fase,
    grupo,
    jornada,
    equipo_local_codigo: resolveTeamCode(item.teams.home),
    equipo_visitante_codigo: resolveTeamCode(item.teams.away),
    equipo_local_nombre: item.teams.home.name,
    equipo_visitante_nombre: item.teams.away.name,
    sede: sedeParts.length ? sedeParts.join(", ") : null,
    fecha_kickoff: new Date(item.fixture.date).toISOString(),
    estatus,
    marcador_local: hasScore ? item.goals.home : null,
    marcador_visitante: hasScore ? item.goals.away : null,
    canal_transmision: "sin_asignar",
    minuto_actual: minutoReloj ?? item.fixture.status.elapsed,
    metadata: {
      ...(options.pilot
        ? {
            competencia: "pilot",
            pilot: true,
            competencia_label: options.pilot.label,
          }
        : {}),
      ...(item.teams.home.logo ? { escudo_local: item.teams.home.logo } : {}),
      ...(item.teams.away.logo ? { escudo_visitante: item.teams.away.logo } : {}),
      reloj,
      api_football: {
        provider: "api-sports",
        league_id: item.league.id,
        league_name: item.league.name,
        round: item.league.round,
        home_team_id: item.teams.home.id,
        away_team_id: item.teams.away.id,
        home_logo: item.teams.home.logo,
        away_logo: item.teams.away.logo,
        status_long: item.fixture.status.long,
        status_short: item.fixture.status.short,
      },
    },
  };
}
