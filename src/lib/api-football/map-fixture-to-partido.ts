import type { ApiFootballWebhookPayload } from "@/types/api-football";

const STATUS_MAP: Record<string, string> = {
  NS: "programado",
  TBD: "programado",
  "1H": "en_vivo",
  HT: "medio_tiempo",
  "2H": "en_vivo",
  ET: "en_vivo",
  BT: "medio_tiempo",
  P: "en_vivo",
  FT: "finalizado",
  AET: "finalizado",
  PEN: "finalizado",
  PST: "aplazado",
  CANC: "cancelado",
  ABD: "suspendido",
  SUSP: "suspendido",
  INT: "suspendido",
};

export interface PartidoUpdateFromWebhook {
  api_football_fixture_id: number;
  estatus?: string;
  marcador_local?: number | null;
  marcador_visitante?: number | null;
  minuto_actual?: number | null;
}

export function mapFixtureToPartidoUpdate(
  payload: ApiFootballWebhookPayload,
): PartidoUpdateFromWebhook | null {
  const fixture = payload.fixture;
  if (!fixture?.id) return null;

  const short = fixture.status?.short;
  const estatus = short ? STATUS_MAP[short] : undefined;

  return {
    api_football_fixture_id: fixture.id,
    ...(estatus ? { estatus } : {}),
  };
}

export function extractScoreFromPayload(payload: ApiFootballWebhookPayload): {
  local: number;
  visitante: number;
} | null {
  const home = payload.fixture?.goals?.home;
  const away = payload.fixture?.goals?.away;
  if (home == null || away == null) return null;
  return { local: home, visitante: away };
}

export function extractTeamNames(payload: ApiFootballWebhookPayload): {
  local: string;
  visitante: string;
} {
  return {
    local: payload.fixture?.teams?.home?.name ?? "Local",
    visitante: payload.fixture?.teams?.away?.name ?? "Visitante",
  };
}
