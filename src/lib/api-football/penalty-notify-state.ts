export interface PenNotifyScore {
  local: number;
  away: number;
}

export function getPenNotifyScore(metadata: unknown): PenNotifyScore | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).pen_notify_score;
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.local !== "number" || typeof s.away !== "number") return null;
  return { local: s.local, away: s.away };
}

export function penScoreIncreased(
  prev: PenNotifyScore,
  nextLocal: number | null,
  nextAway: number | null,
): boolean {
  if (nextLocal == null || nextAway == null) return false;
  return nextLocal > prev.local || nextAway > prev.away;
}

export function isPenScoreAlreadyNotified(
  metadata: unknown,
  local: number,
  away: number,
): boolean {
  const notified = getPenNotifyScore(metadata);
  if (!notified) return false;
  return !penScoreIncreased(notified, local, away);
}

export function buildPenNotifyMetadata(
  metadata: unknown,
  local: number,
  away: number,
): Record<string, unknown> {
  const base =
    typeof metadata === "object" && metadata !== null
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return {
    ...base,
    pen_notify_score: { local, away },
  };
}

export function baselinePenNotifyScore(
  metadata: unknown,
  current: { local: number | null; away: number | null },
): PenNotifyScore | null {
  if (getPenNotifyScore(metadata)) return null;
  if (current.local == null || current.away == null) return null;
  return { local: current.local, away: current.away };
}
