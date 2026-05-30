import type { EstatusPartido } from "@/types/database";
import type {
  ApifootballCardRow,
  ApifootballGoalscorerRow,
  ApifootballLiveMatchPayload,
  NormalizedLiveEvent,
  NormalizedMatchSnapshot,
  WebhookIncident,
} from "@/lib/apifootball/webhook/types";

const STATUS_MAP: Record<string, EstatusPartido> = {
  "not started": "programado",
  ns: "programado",
  scheduled: "programado",
  live: "en_vivo",
  "1h": "en_vivo",
  "2h": "en_vivo",
  "half time": "medio_tiempo",
  ht: "medio_tiempo",
  finished: "finalizado",
  ft: "finalizado",
  "after pen.": "finalizado",
  "after et": "finalizado",
  "after penalties": "finalizado",
  postponed: "aplazado",
  cancelled: "cancelado",
  canceled: "cancelado",
  abandoned: "suspendido",
  suspended: "suspendido",
};

function mapStatus(raw: string | undefined): EstatusPartido {
  if (!raw) return "programado";
  return STATUS_MAP[raw.trim().toLowerCase()] ?? "programado";
}

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

function phaseFromStatus(
  status: string,
  prevStatus: string | undefined,
): NormalizedLiveEvent | null {
  const s = status.trim().toLowerCase();
  const prev = prevStatus?.trim().toLowerCase();

  if (
    (s === "half time" || s === "ht") &&
    prev !== "half time" &&
    prev !== "ht"
  ) {
    return { kind: "match_phase", eventKey: "phase-halftime", phase: "halftime" };
  }

  if (
    (s === "finished" || s === "ft" || s.startsWith("after")) &&
    prev !== s &&
    !prev?.startsWith("after")
  ) {
    return { kind: "match_phase", eventKey: "phase-fulltime", phase: "fulltime" };
  }

  if (
    (s === "live" || s === "1h" || s === "2h") &&
    (prev === "not started" || prev === "ns" || prev === "scheduled" || !prev)
  ) {
    return { kind: "match_phase", eventKey: "phase-kickoff", phase: "kickoff" };
  }

  return null;
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

function goalsFromApifootballRows(
  rows: ApifootballGoalscorerRow[],
  homeName: string,
  awayName: string,
): NormalizedLiveEvent[] {
  const events: NormalizedLiveEvent[] = [];

  rows.forEach((row, index) => {
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
  prevMatchStatus?: string,
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

  const statusRaw =
    payload.fixture?.status?.short ??
    payload.match_status ??
    "programado";
  const estatus = mapStatus(String(statusRaw));
  const minute =
    payload.fixture?.status?.elapsed ??
    parseMinute(
      payload.goalscorer?.[payload.goalscorer.length - 1]?.time ??
        payload.cards?.[payload.cards.length - 1]?.time,
    );

  const events: NormalizedLiveEvent[] = [];

  const phase = phaseFromStatus(String(statusRaw), prevMatchStatus);
  if (phase) events.push(phase);

  if (Array.isArray(payload.incidents)) {
    payload.incidents.forEach((inc, i) => {
      const g = goalFromIncident(inc, i);
      if (g) events.push(g);
      const c = cardFromIncident(inc, i);
      if (c) events.push(c);
    });
  }

  if (Array.isArray(payload.goalscorer)) {
    events.push(...goalsFromApifootballRows(payload.goalscorer, homeName, awayName));
  }

  if (Array.isArray(payload.cards)) {
    events.push(...redsFromApifootballCards(payload.cards, homeName, awayName));
  }

  return {
    fixtureId,
    homeName,
    awayName,
    homeScore,
    awayScore,
    estatus,
    minute,
    events,
  };
}
