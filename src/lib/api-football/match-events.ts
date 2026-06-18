import type { ApiSportsFixtureEvent } from "@/lib/api-football/fetch-events";
import { getTeamDisplayNameEs } from "@/lib/teams/display-names";

export type MomentoClaveTipo = "gol" | "tarjeta_roja";

export interface MomentoClave {
  id: string;
  tipo: MomentoClaveTipo;
  jugador: string;
  equipo: string;
  minuto: number | null;
  extra: number | null;
  detail: string | null;
  es_local: boolean;
}

function minuteSortKey(m: MomentoClave): number {
  const base = m.minuto ?? 9999;
  const extra = m.extra ?? 0;
  return base * 100 + extra;
}

export function isGoalEvent(event: ApiSportsFixtureEvent): boolean {
  return event.type === "Goal";
}

export function isRedCardEvent(event: ApiSportsFixtureEvent): boolean {
  if (event.type !== "Card") return false;
  const detail = (event.detail ?? "").toLowerCase();
  return detail.includes("red");
}

export function eventStableId(event: ApiSportsFixtureEvent): string {
  const playerId = event.player?.id ?? event.player?.name ?? "unknown";
  const teamId = event.team.id;
  const minute = event.time.elapsed ?? 0;
  const extra = event.time.extra ?? 0;
  const kind = isGoalEvent(event) ? "gol" : isRedCardEvent(event) ? "roja" : event.type;
  return `${kind}:${teamId}:${playerId}:${minute}:${extra}`;
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
    const equipoRaw = esLocal ? localName : visitanteName;
    const equipoDisplay = esLocal ? localDisplay : visitanteDisplay;
    const jugador = event.player?.name?.trim() || equipoDisplay;

    if (isGoalEvent(event)) {
      momentos.push({
        id: eventStableId(event),
        tipo: "gol",
        jugador,
        equipo: equipoDisplay,
        minuto: event.time.elapsed,
        extra: event.time.extra ?? null,
        detail: event.detail ?? null,
        es_local: esLocal,
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
    if (r.tipo !== "gol" && r.tipo !== "tarjeta_roja") continue;
    if (typeof r.id !== "string" || typeof r.jugador !== "string") continue;
    out.push({
      id: r.id,
      tipo: r.tipo,
      jugador: r.jugador,
      equipo: typeof r.equipo === "string" ? r.equipo : "",
      minuto: typeof r.minuto === "number" ? r.minuto : null,
      extra: typeof r.extra === "number" ? r.extra : null,
      detail: typeof r.detail === "string" ? r.detail : null,
      es_local: r.es_local === true,
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

export function formatMomentoMinuto(minuto: number | null, extra: number | null): string {
  if (minuto == null) return "";
  if (extra != null && extra > 0) return `${minuto}+${extra}'`;
  return `${minuto}'`;
}
