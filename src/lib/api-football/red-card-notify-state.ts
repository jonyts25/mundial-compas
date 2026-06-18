import type { MomentoClave } from "@/lib/api-football/match-events";

export function getNotifiedRedCardIds(metadata: unknown): Set<string> {
  if (!metadata || typeof metadata !== "object") return new Set();
  const raw = (metadata as Record<string, unknown>).notified_red_cards;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((id): id is string => typeof id === "string"));
}

export function isRedCardAlreadyNotified(metadata: unknown, eventId: string): boolean {
  return getNotifiedRedCardIds(metadata).has(eventId);
}

export function buildRedCardNotifyMetadata(
  metadata: unknown,
  eventIds: string[],
): Record<string, unknown> {
  const base =
    typeof metadata === "object" && metadata !== null
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const existing = getNotifiedRedCardIds(metadata);
  for (const id of eventIds) existing.add(id);
  return { ...base, notified_red_cards: [...existing] };
}

/** Al entrar en vivo sin historial, no spamear rojas ya ocurridas. */
export function baselineNotifiedRedCards(
  metadata: unknown,
  momentos: MomentoClave[],
): string[] | null {
  if (getNotifiedRedCardIds(metadata).size > 0) return null;
  const rojas = momentos.filter((m) => m.tipo === "tarjeta_roja");
  if (rojas.length === 0) return null;
  return rojas.map((m) => m.id);
}

export function findNewRedCards(
  metadata: unknown,
  momentos: MomentoClave[],
): MomentoClave[] {
  const notified = getNotifiedRedCardIds(metadata);
  return momentos.filter((m) => m.tipo === "tarjeta_roja" && !notified.has(m.id));
}
