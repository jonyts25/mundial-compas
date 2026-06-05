export interface GolNotifyScore {
  local: number;
  away: number;
}

export function getGolNotifyScore(metadata: unknown): GolNotifyScore | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).gol_notify_score;
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.local !== "number" || typeof s.away !== "number") return null;
  return { local: s.local, away: s.away };
}

export function scoreIncreased(
  prev: GolNotifyScore,
  nextLocal: number | null,
  nextAway: number | null,
): boolean {
  if (nextLocal == null || nextAway == null) return false;
  return nextLocal > prev.local || nextAway > prev.away;
}

export function goalScoreKey(local: number, away: number): string {
  return `${local}-${away}`;
}

/** True si el marcador ya fue cubierto por gol_notify_score (no re-notificar). */
export function isGoalAlreadyNotified(
  metadata: unknown,
  local: number,
  away: number,
): boolean {
  const notified = getGolNotifyScore(metadata);
  if (!notified) return false;
  return !scoreIncreased(notified, local, away);
}

export function buildGolNotifyMetadata(
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
    gol_notify_score: { local, away },
  };
}

/** Preserva gol_notify_score y announced_phases al recargar fixture desde API. */
export function mergeLiveNotifyMetadata(
  incoming: Record<string, unknown>,
  existing: unknown,
): Record<string, unknown> {
  if (!existing || typeof existing !== "object") return incoming;
  const ex = existing as Record<string, unknown>;
  const out = { ...incoming };
  if (ex.gol_notify_score) out.gol_notify_score = ex.gol_notify_score;
  if (Array.isArray(ex.announced_phases) && ex.announced_phases.length > 0) {
    out.announced_phases = ex.announced_phases;
  }
  return out;
}

/** Baseline al cargar partido ya en juego — no notificar goles pasados. */
export function baselineGolNotifyScore(
  metadata: unknown,
  current: { local: number | null; away: number | null },
): GolNotifyScore | null {
  if (getGolNotifyScore(metadata)) return null;
  if (current.local == null || current.away == null) return null;
  return { local: current.local, away: current.away };
}
