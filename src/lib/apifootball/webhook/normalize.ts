import {
  detectPhaseTransition,
  hasPenaltyShootoutPayload,
  mapApifootballLiveStatus,
  parseApiMatchMinute,
  parsePenaltyScores,
  parseRelojFromMetadata,
  resolveMatchPeriod,
} from "@/lib/partidos/match-clock";
import type {
  ApifootballCardRow,
  ApifootballGoalscorerRow,
  ApifootballLiveMatchPayload,
  MatchPhaseKind,
  NormalizedLiveEvent,
  NormalizedMatchSnapshot,
  WebhookIncident,
} from "@/lib/apifootball/webhook/types";
import { extractPenaltyShootoutEvents } from "@/lib/apifootball/webhook/penalty-shootout";
import type { EstatusPartido } from "@/types/database";

function parseNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number.parseInt(String(v), 10);
  return Number.isNaN(n) ? 0 : n;
}

function parseMinute(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function unwrapPayload(body: unknown): ApifootballLiveMatchPayload {
  if (!body || typeof body !== "object") return {};
  const o = body as Record<string, unknown>;
  if (o.match && typeof o.match === "object") return o.match as ApifootballLiveMatchPayload;
  if (o.data && typeof o.data === "object") return o.data as ApifootballLiveMatchPayload;
  if (Array.isArray(o) && o[0] && typeof o[0] === "object") {
    return o[0] as ApifootballLiveMatchPayload;
  }
  return o as ApifootballLiveMatchPayload;
}

function resolveFixtureId(payload: ApifootballLiveMatchPayload): number | null {
  if (payload.match_id != null) {
    const id = Number.parseInt(String(payload.match_id), 10);
    if (!Number.isNaN(id)) return id;
  }
  if (payload.fixture?.id != null) {
    const id = Number.parseInt(String(payload.fixture.id), 10);
    if (!Number.isNaN(id)) return id;
  }
  return null;
}

function phaseEvent(phase: MatchPhaseKind): NormalizedLiveEvent {
  return { kind: "match_phase", eventKey: `phase-${phase}`, phase };
}

function goalFromIncident(inc: WebhookIncident, index: number): NormalizedLiveEvent | null {
  const type = (inc.type ?? "").toLowerCase();
  if (type !== "goal") return null;

  const detail = (inc.detail ?? inc.comments ?? "").toLowerCase();
  const player = inc.player?.name ?? "Jugador";
  const teamName = inc.team?.name ?? "Equipo";
  const minute = parseMinute(inc.time?.elapsed);
  const isPenalty = detail.includes("penalty");
  const isOwnGoal = detail.includes("own");

  return {
    kind: "goal",
    eventKey: `inc-goal-${index}-${minute}-${player}`,
    player,
    teamName,
    minute,
    isPenalty,
    isOwnGoal,
    isHome: false,
  };
}

function cardFromIncident(inc: WebhookIncident, index: number): NormalizedLiveEvent | null {
  const type = (inc.type ?? "").toLowerCase();
  if (type !== "card") return null;

  const detail = (inc.detail ?? "").toLowerCase();
  if (!detail.includes("red")) return null;

  const player = inc.player?.name ?? "Jugador";
  const teamName = inc.team?.name ?? "Equipo";
  const minute = parseMinute(inc.time?.elapsed);

  return {
    kind: "red_card",
    eventKey: `inc-red-${index}-${minute}-${player}`,
    player,
    teamName,
    minute,
  };
}

function isPenaltyGoalscorerRow(row: ApifootballGoalscorerRow): boolean {
  if ((row.score_info_time ?? "").trim().toLowerCase() === "penalty") return true;
  return /\(pen\.?\)/i.test(row.home_scorer ?? "") || /\(pen\.?\)/i.test(row.away_scorer ?? "");
}

function goalsFromApifootballRows(
  rows: ApifootballGoalscorerRow[],
  homeName: string,
  awayName: string,
): NormalizedLiveEvent[] {
  const events: NormalizedLiveEvent[] = [];

  rows.forEach((row, index) => {
    if (isPenaltyGoalscorerRow(row)) return;

    const homeScorer = row.home_scorer?.trim();
    const awayScorer = row.away_scorer?.trim();
    if (!homeScorer && !awayScorer) return;

    const info = (row.info ?? "").toLowerCase();
    const isPenalty = info.includes("penalty") || info.includes("penal");
    const isOwnGoal = info.includes("own");

    if (homeScorer) {
      events.push({
        kind: "goal",
        eventKey: `gf-h-${row.time}-${homeScorer}-${index}`,
        player: homeScorer,
        teamName: homeName,
        minute: parseMinute(row.time),
        isPenalty,
        isOwnGoal,
        isHome: true,
      });
    }
    if (awayScorer) {
      events.push({
        kind: "goal",
        eventKey: `gf-a-${row.time}-${awayScorer}-${index}`,
        player: awayScorer,
        teamName: awayName,
        minute: parseMinute(row.time),
        isPenalty,
        isOwnGoal,
        isHome: false,
      });
    }
  });

  return events;
}

function redsFromApifootballCards(
  rows: ApifootballCardRow[],
  homeName: string,
  awayName: string,
): NormalizedLiveEvent[] {
  const events: NormalizedLiveEvent[] = [];

  rows.forEach((row, index) => {
    const card = (row.card ?? "").toLowerCase();
    if (!card.includes("red")) return;

    if (row.home_fault?.trim()) {
      events.push({
        kind: "red_card",
        eventKey: `card-h-${row.time}-${row.home_fault}-${index}`,
        player: row.home_fault.trim(),
        teamName: homeName,
        minute: parseMinute(row.time),
      });
    }
    if (row.away_fault?.trim()) {
      events.push({
        kind: "red_card",
        eventKey: `card-a-${row.time}-${row.away_fault}-${index}`,
        player: row.away_fault.trim(),
        teamName: awayName,
        minute: parseMinute(row.time),
      });
    }
  });

  return events;
}

export function normalizeLivePayload(
  body: unknown,
  prevMetadata?: unknown,
): NormalizedMatchSnapshot | null {
  const payload = unwrapPayload(body);
  const fixtureId = resolveFixtureId(payload);
  if (fixtureId === null) return null;

  const homeName = payload.match_hometeam_name ?? "Local";
  const awayName = payload.match_awayteam_name ?? "Visitante";

  const homeScore =
    payload.fixture?.goals?.home != null
      ? parseNum(payload.fixture.goals.home)
      : parseNum(payload.match_hometeam_score);
  const awayScore =
    payload.fixture?.goals?.away != null
      ? parseNum(payload.fixture.goals.away)
      : parseNum(payload.match_awayteam_score);

  const statusRaw = String(
    payload.fixture?.status?.short ?? payload.match_status ?? "programado",
  );
  const penaltyScores = hasPenaltyShootoutPayload(payload);
  const pen = parsePenaltyScores(payload);
  const prevReloj = parseRelojFromMetadata(prevMetadata);
  const minute = parseApiMatchMinute(
    statusRaw,
    payload.fixture?.status?.elapsed,
  );
  const estatus = mapApifootballLiveStatus(statusRaw, payload.match_live);
  const period = resolveMatchPeriod(statusRaw, estatus, minute, {
    hasPenaltyScores: penaltyScores,
    prevPeriod: prevReloj?.period ?? null,
    prevAnchorMinute: prevReloj?.anchorMinute ?? null,
  });

  const prevPeriod = prevReloj?.period ?? "NS";
  const phaseKind = detectPhaseTransition(prevPeriod, period);

  const inShootout =
    period === "PEN" ||
    period === "AP" ||
    penaltyScores ||
    statusRaw.toLowerCase().includes("penalt");

  const events: NormalizedLiveEvent[] = [];
  if (phaseKind) events.push(phaseEvent(phaseKind));

  if (Array.isArray(payload.incidents)) {
    payload.incidents.forEach((inc, i) => {
      if (!inShootout) {
        const g = goalFromIncident(inc, i);
        if (g) events.push(g);
      }
      const c = cardFromIncident(inc, i);
      if (c) events.push(c);
    });
  }

  if (Array.isArray(payload.goalscorer) && !inShootout) {
    events.push(...goalsFromApifootballRows(payload.goalscorer, homeName, awayName));
  }

  if (Array.isArray(payload.cards)) {
    events.push(...redsFromApifootballCards(payload.cards, homeName, awayName));
  }

  let penaltyKeysToPersist: string[] = [];

  if (inShootout && Array.isArray(payload.goalscorer)) {
    const penResult = extractPenaltyShootoutEvents(
      payload.goalscorer,
      homeName,
      awayName,
      prevMetadata,
    );
    penaltyKeysToPersist = penResult.keysToPersist;
    for (const pe of penResult.events) {
      if (pe.kind === "penalty_scored") {
        events.push({
          kind: "penalty_scored",
          eventKey: pe.eventKey,
          player: pe.player,
          teamName: pe.teamName,
          isHome: pe.isHome,
          penHome: pe.penHome,
          penAway: pe.penAway,
        });
      } else {
        events.push({
          kind: "penalty_missed",
          eventKey: pe.eventKey,
          player: pe.player,
          teamName: pe.teamName,
          isHome: pe.isHome,
          penHome: pe.penHome,
          penAway: pe.penAway,
        });
      }
    }
  }

  return {
    fixtureId,
    homeName,
    awayName,
    homeScore,
    awayScore,
    estatus,
    minute,
    statusRaw,
    period,
    homePenaltyScore: pen.local,
    awayPenaltyScore: pen.visitante,
    penaltyKeysToPersist: inShootout ? penaltyKeysToPersist : [],
    events,
  };
}
