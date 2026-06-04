import { mapApiStatus } from "@/lib/api-football/status-map";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
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

/** IDs API-Football → código FIFA (3 letras) cuando `team.code` viene vacío */
const TEAM_ID_TO_FIFA: Record<number, string> = {
  13: "SEN",
  14: "NED",
  16: "ENG",
  17: "POL",
  18: "FRA",
  19: "GER",
  20: "POR",
  21: "ESP",
  22: "URU",
  23: "ARG",
  24: "BRA",
  25: "MEX",
  26: "USA",
  27: "CRC",
  29: "COL",
  30: "JPN",
  31: "KOR",
  32: "MAR",
  33: "TUN",
  34: "EGY",
  35: "IRN",
  36: "AUS",
  37: "SAU",
  38: "CAN",
  39: "ECU",
  40: "QAT",
  41: "SUI",
  42: "SRB",
  43: "DEN",
  44: "WAL",
  45: "CRO",
  46: "BEL",
  47: "ITA",
  48: "AUT",
  1500: "MEX",
  1501: "USA",
  1502: "CAN",
};

function resolveTeamCode(team: { id: number; name: string; code?: string | null }): string {
  if (team.code && /^[A-Za-z]{2,4}$/.test(team.code)) {
    return team.code.toUpperCase().slice(0, 3);
  }
  const mapped = TEAM_ID_TO_FIFA[team.id];
  if (mapped) return mapped;
  const letters = team.name.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3) return letters.slice(0, 3).toUpperCase();
  return `T${team.id}`.slice(0, 3).toUpperCase();
}

function parseFaseAndGrupo(round: string | null | undefined): {
  fase: FaseMundial;
  grupo: string | null;
  jornada: number | null;
} {
  if (!round) return { fase: "grupos", grupo: null, jornada: null };

  const r = round.toLowerCase();

  const groupMatch = r.match(/group\s+([a-l])/i);
  if (groupMatch || r.includes("group")) {
    const grupo = groupMatch?.[1]?.toUpperCase() ?? null;
    const jornadaMatch = r.match(/-?\s*(\d+)\s*$/);
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

export function mapFixtureToPartidoRow(item: ApiFootballFixtureItem): PartidoUpsertRow {
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
    minuto_actual: item.fixture.status.elapsed,
    metadata: {
      api_football: {
        round: item.league.round,
        home_team_id: item.teams.home.id,
        away_team_id: item.teams.away.id,
        home_logo: item.teams.home.logo,
        away_logo: item.teams.away.logo,
        status_long: item.fixture.status.long,
      },
    },
  };
}
