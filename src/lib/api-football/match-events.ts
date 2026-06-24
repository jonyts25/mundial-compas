import type { ApiSportsFixtureEvent } from "@/lib/api-football/fetch-events";
import {
  isMissedPenaltyFromDetail,
  isVarGoalCancelledDetail,
} from "@/lib/api-football/goal-event-detail";
import { getTeamDisplayNameEs } from "@/lib/teams/display-names";

export type MomentoClaveTipo =
  | "gol"
  | "tarjeta_roja"
  | "penal_fallado"
  | "var"
  | "gol_anulado";

export interface MomentoClave {
  id: string;
  tipo: MomentoClaveTipo;
  jugador: string;
  equipo: string;
  minuto: number | null;
  extra: number | null;
  detail: string | null;
  es_local: boolean;
  comments?: string | null;
}

const MOMENTO_TIPOS: ReadonlySet<string> = new Set([
  "gol",
  "tarjeta_roja",
  "penal_fallado",
  "var",
  "gol_anulado",
]);

function minuteSortKey(m: MomentoClave): number {
  const base = m.minuto ?? 9999;
  const extra = m.extra ?? 0;
  return base * 100 + extra;
}

export function isMissedPenaltyEvent(event: ApiSportsFixtureEvent): boolean {
  return event.type === "Goal" && isMissedPenaltyFromDetail(event.detail);
}

export function isScoredGoalEvent(event: ApiSportsFixtureEvent): boolean {
  return event.type === "Goal" && !isMissedPenaltyFromDetail(event.detail);
}

export function isGoalEvent(event: ApiSportsFixtureEvent): boolean {
  return isScoredGoalEvent(event);
}

export function isRedCardEvent(event: ApiSportsFixtureEvent): boolean {
  if (event.type !== "Card") return false;
  const detail = (event.detail ?? "").toLowerCase();
  return detail.includes("red");
}

export function isVarEvent(event: ApiSportsFixtureEvent): boolean {
  return event.type === "Var";
}

function eventKind(event: ApiSportsFixtureEvent): string {
  if (isMissedPenaltyEvent(event)) return "penal_fallado";
  if (isScoredGoalEvent(event)) return "gol";
  if (isRedCardEvent(event)) return "roja";
  if (isVarEvent(event)) return "var";
  return event.type;
}

export function eventStableId(event: ApiSportsFixtureEvent): string {
  const playerId = event.player?.id ?? event.player?.name ?? "unknown";
  const teamId = event.team.id;
  const minute = event.time.elapsed ?? 0;
  const extra = event.time.extra ?? 0;
  const detail = (event.detail ?? "").replace(/\s+/g, "_").toLowerCase();
  return `${eventKind(event)}:${teamId}:${playerId}:${minute}:${extra}:${detail}`;
}

function readEventComments(event: ApiSportsFixtureEvent): string | null {
  const raw = (event as { comments?: string | null }).comments;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function mapFixtureEventsToMomentos(
  events: ApiSportsFixtureEvent[],
  homeTeamId: number,
  localName: string,
  visitanteName: string,
): MomentoClave[] {
  const localDisplay = getTeamDisplayNameEs(localName);
  const visitanteDisplay = getTeamDisplayNameEs(visitanteName);

  const momentos: MomentoClave[] = [];

  for (const event of events) {
    const esLocal = event.team.id === homeTeamId;
    const equipoDisplay = esLocal ? localDisplay : visitanteDisplay;
    const jugador = event.player?.name?.trim() || equipoDisplay;
    const comments = readEventComments(event);

    if (isMissedPenaltyEvent(event)) {
      momentos.push({
        id: eventStableId(event),
        tipo: "penal_fallado",
        jugador,
        equipo: equipoDisplay,
        minuto: event.time.elapsed,
        extra: event.time.extra ?? null,
        detail: event.detail ?? null,
        es_local: esLocal,
        comments,
      });
      continue;
    }

    if (isScoredGoalEvent(event)) {
      momentos.push({
        id: eventStableId(event),
        tipo: "gol",
        jugador,
        equipo: equipoDisplay,
        minuto: event.time.elapsed,
        extra: event.time.extra ?? null,
        detail: event.detail ?? null,
        es_local: esLocal,
        comments,
      });
      continue;
    }

    if (isVarEvent(event)) {
      momentos.push({
        id: eventStableId(event),
        tipo: "var",
        jugador,
        equipo: equipoDisplay,
        minuto: event.time.elapsed,
        extra: event.time.extra ?? null,
        detail: event.detail ?? null,
        es_local: esLocal,
        comments,
      });
      continue;
    }

    if (isRedCardEvent(event)) {
      momentos.push({
        id: eventStableId(event),
        tipo: "tarjeta_roja",
        jugador,
        equipo: equipoDisplay,
        minuto: event.time.elapsed,
        extra: event.time.extra ?? null,
        detail: event.detail ?? null,
        es_local: esLocal,
        comments,
      });
    }
  }

  return momentos.sort((a, b) => minuteSortKey(a) - minuteSortKey(b));
}

export function parseMomentosFromMetadata(metadata: unknown): MomentoClave[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as Record<string, unknown>).eventos_clave;
  if (!Array.isArray(raw)) return [];

  const out: MomentoClave[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.tipo !== "string" || !MOMENTO_TIPOS.has(r.tipo)) continue;
    if (typeof r.id !== "string" || typeof r.jugador !== "string") continue;
    out.push({
      id: r.id,
      tipo: r.tipo as MomentoClaveTipo,
      jugador: r.jugador,
      equipo: typeof r.equipo === "string" ? r.equipo : "",
      minuto: typeof r.minuto === "number" ? r.minuto : null,
      extra: typeof r.extra === "number" ? r.extra : null,
      detail: typeof r.detail === "string" ? r.detail : null,
      es_local: r.es_local === true,
      comments: typeof r.comments === "string" ? r.comments : null,
    });
  }

  return out.sort((a, b) => minuteSortKey(a) - minuteSortKey(b));
}

export function buildMomentosMetadata(
  metadata: unknown,
  momentos: MomentoClave[],
): Record<string, unknown> {
  const base =
    typeof metadata === "object" && metadata !== null
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return { ...base, eventos_clave: momentos };
}

export function mergeGolAnuladoMomento(
  momentos: MomentoClave[],
  golAnulado: MomentoClave,
): MomentoClave[] {
  if (momentos.some((m) => m.id === golAnulado.id)) return momentos;
  return [...momentos, golAnulado].sort((a, b) => minuteSortKey(a) - minuteSortKey(b));
}

export function formatMomentoMinuto(minuto: number | null, extra: number | null): string {
  if (minuto == null) return "";
  if (extra != null && extra > 0) return `${minuto}+${extra}'`;
  return `${minuto}'`;
}

/** Busca evento Var reciente de gol anulado para el equipo afectado. */
export function findVarGoalCancelledForTeam(
  events: ApiSportsFixtureEvent[],
  homeTeamId: number,
  affectedIsLocal: boolean,
): ApiSportsFixtureEvent | null {
  const teamId = affectedIsLocal ? homeTeamId : undefined;
  const candidates = events.filter(
    (e) =>
      isVarEvent(e) &&
      isVarGoalCancelledDetail(e.detail) &&
      (teamId == null || e.team.id === teamId),
  );
  if (candidates.length === 0) return null;
  return candidates[candidates.length - 1] ?? null;
}

export function buildGolAnuladoMomento(params: {
  id: string;
  jugador: string;
  equipo: string;
  minuto: number | null;
  extra: number | null;
  detail: string | null;
  es_local: boolean;
}): MomentoClave {
  return {
    id: params.id,
    tipo: "gol_anulado",
    jugador: params.jugador,
    equipo: params.equipo,
    minuto: params.minuto,
    extra: params.extra,
    detail: params.detail,
    es_local: params.es_local,
  };
}
