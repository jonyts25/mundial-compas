import type { GolNotifyScore } from "@/lib/api-football/goal-notify-state";

export function cancelledGoalNotifyKey(
  prev: GolNotifyScore,
  next: GolNotifyScore,
  side: "local" | "visitante",
): string {
  return `cancel:${prev.local}-${prev.away}->${next.local}-${next.away}:${side}`;
}

export function getNotifiedCancelledGoalKeys(metadata: unknown): Set<string> {
  if (!metadata || typeof metadata !== "object") return new Set();
  const raw = (metadata as Record<string, unknown>).notified_cancelled_goals;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((k): k is string => typeof k === "string"));
}

export function isCancelledGoalAlreadyNotified(
  metadata: unknown,
  key: string,
): boolean {
  return getNotifiedCancelledGoalKeys(metadata).has(key);
}

export function buildCancelledGoalNotifyMetadata(
  metadata: unknown,
  keys: string[],
): Record<string, unknown> {
  const base =
    typeof metadata === "object" && metadata !== null
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const existing = getNotifiedCancelledGoalKeys(metadata);
  for (const k of keys) existing.add(k);
  return { ...base, notified_cancelled_goals: [...existing] };
}
