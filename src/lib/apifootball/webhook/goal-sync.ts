import type { ApifootballGoalscorerRow } from "@/lib/apifootball/webhook/types";

export type AnnouncedGoal = {
  key: string;
  player: string;
  teamName: string;
  isHome: boolean;
  minute: number | null;
};

export type GoalCancelledEvent = {
  kind: "goal_cancelled";
  eventKey: string;
  player: string | null;
  teamName: string;
  isHome: boolean;
  prevHome: number;
  prevAway: number;
  newHome: number;
  newAway: number;
};

function isPenaltyGoalscorerRow(row: ApifootballGoalscorerRow): boolean {
  if ((row.score_info_time ?? "").trim().toLowerCase() === "penalty") return true;
  return /\(pen\.?\)/i.test(row.home_scorer ?? "") || /\(pen\.?\)/i.test(row.away_scorer ?? "");
}

export function fingerprintRegulationGoals(
  rows: ApifootballGoalscorerRow[] | undefined,
  homeName: string,
  awayName: string,
): AnnouncedGoal[] {
  if (!Array.isArray(rows)) return [];

  const out: AnnouncedGoal[] = [];
  rows.forEach((row, index) => {
    if (isPenaltyGoalscorerRow(row)) return;

    const homeScorer = row.home_scorer?.trim();
    const awayScorer = row.away_scorer?.trim();
    const minute =
      row.time != null && row.time !== ""
        ? Number.parseInt(String(row.time), 10)
        : null;

    if (homeScorer) {
      out.push({
        key: `gf-h-${row.time}-${homeScorer}-${index}`,
        player: homeScorer,
        teamName: homeName,
        isHome: true,
        minute: Number.isNaN(minute as number) ? null : minute,
      });
    }
    if (awayScorer) {
      out.push({
        key: `gf-a-${row.time}-${awayScorer}-${index}`,
        player: awayScorer,
        teamName: awayName,
        isHome: false,
        minute: Number.isNaN(minute as number) ? null : minute,
      });
    }
  });
  return out;
}

export function readAnnouncedGoals(metadata: unknown): AnnouncedGoal[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as Record<string, unknown>).goles_anunciados;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (g): g is AnnouncedGoal =>
      g != null &&
      typeof g === "object" &&
      typeof (g as AnnouncedGoal).key === "string",
  );
}

export function announcedGoalsToMetadata(goals: AnnouncedGoal[]): AnnouncedGoal[] {
  return goals;
}

/** Detecta goles anulados (VAR): baja de marcador o desaparición en goalscorer. */
export function detectGoalCancellations(params: {
  prevHome: number;
  prevAway: number;
  newHome: number;
  newAway: number;
  announced: AnnouncedGoal[];
  currentGoals: AnnouncedGoal[];
}): GoalCancelledEvent[] {
  const { prevHome, prevAway, newHome, newAway, announced, currentGoals } =
    params;

  const homeLost = Math.max(0, prevHome - newHome);
  const awayLost = Math.max(0, prevAway - newAway);
  if (homeLost === 0 && awayLost === 0) return [];

  const currentKeys = new Set(currentGoals.map((g) => g.key));
  const removed = announced.filter((g) => !currentKeys.has(g.key));

  const events: GoalCancelledEvent[] = [];
  let homeRemaining = homeLost;
  let awayRemaining = awayLost;

  const pickRemoved = (isHome: boolean) => {
    const side = removed.filter((g) => g.isHome === isHome);
    if (side.length > 0) return side[side.length - 1]!;
    const sideAnnounced = announced.filter((g) => g.isHome === isHome);
    return sideAnnounced.length > 0 ? sideAnnounced[sideAnnounced.length - 1]! : null;
  };

  while (homeRemaining > 0) {
    const g = pickRemoved(true);
    events.push({
      kind: "goal_cancelled",
      eventKey: `var-cancel-h-${g?.key ?? homeRemaining}-${prevHome}-${newHome}`,
      player: g?.player ?? null,
      teamName: g?.teamName ?? "Local",
      isHome: true,
      prevHome,
      prevAway,
      newHome,
      newAway,
    });
    homeRemaining -= 1;
  }

  while (awayRemaining > 0) {
    const g = pickRemoved(false);
    events.push({
      kind: "goal_cancelled",
      eventKey: `var-cancel-a-${g?.key ?? awayRemaining}-${prevAway}-${newAway}`,
      player: g?.player ?? null,
      teamName: g?.teamName ?? "Visitante",
      isHome: false,
      prevHome,
      prevAway,
      newHome,
      newAway,
    });
    awayRemaining -= 1;
  }

  return events;
}
