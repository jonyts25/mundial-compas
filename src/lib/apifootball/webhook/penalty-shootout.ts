import type { ApifootballGoalscorerRow } from "@/lib/apifootball/webhook/types";

export type PenaltyShootoutRow = {
  kick: number;
  homeScorer: string;
  awayScorer: string;
  penHome: number;
  penAway: number;
  info: string;
};

export type PenaltyShootoutEvent =
  | {
      kind: "penalty_scored";
      eventKey: string;
      kick: number;
      player: string;
      teamName: string;
      isHome: boolean;
      penHome: number;
      penAway: number;
    }
  | {
      kind: "penalty_missed";
      eventKey: string;
      kick: number;
      player: string | null;
      teamName: string;
      isHome: boolean;
      penHome: number;
      penAway: number;
    };

function parsePenScore(score: string | undefined): { home: number; away: number } | null {
  if (!score?.trim()) return null;
  const m = score.trim().match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!m) return null;
  return { home: Number.parseInt(m[1]!, 10), away: Number.parseInt(m[2]!, 10) };
}

export function parsePenaltyShootoutRows(
  rows: ApifootballGoalscorerRow[] | undefined,
): PenaltyShootoutRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((r) => {
      if ((r.score_info_time ?? "").trim().toLowerCase() === "penalty") return true;
      return (
        /\(pen\.?\)/i.test(r.home_scorer ?? "") || /\(pen\.?\)/i.test(r.away_scorer ?? "")
      );
    })
    .map((r) => {
      const pen = parsePenScore(r.score);
      return {
        kick: Number.parseInt(String(r.time ?? ""), 10),
        homeScorer: r.home_scorer?.trim() ?? "",
        awayScorer: r.away_scorer?.trim() ?? "",
        penHome: pen?.home ?? 0,
        penAway: pen?.away ?? 0,
        info: (r.info ?? "").toLowerCase(),
      };
    })
    .filter((r) => !Number.isNaN(r.kick))
    .sort((a, b) => a.kick - b.kick);
}

export function readProcessedPenaltyKickKeys(metadata: unknown): Set<string> {
  if (!metadata || typeof metadata !== "object") return new Set();
  const raw = (metadata as Record<string, unknown>).penales_kicks_vistos;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((k): k is string => typeof k === "string"));
}

export function penaltyKickKeysToMetadata(keys: Set<string>): string[] {
  return [...keys];
}

function stripPenSuffix(name: string): string {
  return name.replace(/\s*\(pen\.?\)\s*$/i, "").trim();
}

function kickIsHome(kick: number): boolean {
  return kick % 2 === 1;
}

/** Nuevos eventos de tanda de penales (anotados y fallados). */
export function extractPenaltyShootoutEvents(
  rows: ApifootballGoalscorerRow[] | undefined,
  homeName: string,
  awayName: string,
  prevMetadata: unknown,
): { events: PenaltyShootoutEvent[]; keysToPersist: string[] } {
  const parsed = parsePenaltyShootoutRows(rows);
  if (parsed.length === 0) return { events: [], keysToPersist: [] };

  const processed = readProcessedPenaltyKickKeys(prevMetadata);
  const isBootstrap = processed.size === 0;
  const events: PenaltyShootoutEvent[] = [];
  const keysToPersist: string[] = [];
  let lastKick = 0;
  let lastPen = { home: 0, away: 0 };

  const pushEvent = (event: PenaltyShootoutEvent) => {
    keysToPersist.push(event.eventKey);
    if (!processed.has(event.eventKey) && !isBootstrap) {
      events.push(event);
    }
  };

  for (const row of parsed) {
    const prevScore = lastPen;
    const scoreIncreased =
      row.penHome > prevScore.home || row.penAway > prevScore.away;
    const hasScorer = Boolean(row.homeScorer || row.awayScorer);

    if (row.kick > lastKick + 1) {
      for (let k = lastKick + 1; k < row.kick; k += 1) {
        const isHome = kickIsHome(k);
        pushEvent({
          kind: "penalty_missed",
          eventKey: `pen-miss-${k}-gap`,
          kick: k,
          player: null,
          teamName: isHome ? homeName : awayName,
          isHome,
          penHome: prevScore.home,
          penAway: prevScore.away,
        });
      }
    }

    if (hasScorer && !scoreIncreased) {
      const isHome = Boolean(row.homeScorer);
      const player = stripPenSuffix(isHome ? row.homeScorer : row.awayScorer);
      pushEvent({
        kind: "penalty_missed",
        eventKey: `pen-miss-${row.kick}-${player || (isHome ? "home" : "away")}`,
        kick: row.kick,
        player: player || null,
        teamName: isHome ? homeName : awayName,
        isHome,
        penHome: prevScore.home,
        penAway: prevScore.away,
      });
      lastKick = Math.max(lastKick, row.kick);
      continue;
    }

    if (hasScorer && scoreIncreased) {
      const isHome = Boolean(row.homeScorer);
      const player = stripPenSuffix(isHome ? row.homeScorer : row.awayScorer);
      pushEvent({
        kind: "penalty_scored",
        eventKey: `pen-goal-${row.kick}-${player}`,
        kick: row.kick,
        player,
        teamName: isHome ? homeName : awayName,
        isHome,
        penHome: row.penHome,
        penAway: row.penAway,
      });
      lastKick = row.kick;
      lastPen = { home: row.penHome, away: row.penAway };
    }
  }

  return { events, keysToPersist };
}
