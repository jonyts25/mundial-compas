import type { MomentoClave } from "@/lib/api-football/match-events";

export function getNotifiedPenalFalladoIds(metadata: unknown): Set<string> {
  if (!metadata || typeof metadata !== "object") return new Set();
  const raw = (metadata as Record<string, unknown>).notified_penal_fallados;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((id): id is string => typeof id === "string"));
}

export function buildPenalFalladoNotifyMetadata(
  metadata: unknown,
  eventIds: string[],
): Record<string, unknown> {
  const base =
    typeof metadata === "object" && metadata !== null
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const existing = getNotifiedPenalFalladoIds(metadata);
  for (const id of eventIds) existing.add(id);
  return { ...base, notified_penal_fallados: [...existing] };
}

export function baselineNotifiedPenalFallados(
  metadata: unknown,
  momentos: MomentoClave[],
): string[] | null {
  if (getNotifiedPenalFalladoIds(metadata).size > 0) return null;
  const items = momentos.filter((m) => m.tipo === "penal_fallado");
  if (items.length === 0) return null;
  return items.map((m) => m.id);
}

export function findNewPenalFallados(
  metadata: unknown,
  momentos: MomentoClave[],
): MomentoClave[] {
  const notified = getNotifiedPenalFalladoIds(metadata);
  return momentos.filter(
    (m) => m.tipo === "penal_fallado" && !notified.has(m.id),
  );
}
