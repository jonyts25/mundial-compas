import type { EstatusPartido } from "@/types/database";
import type { MatchPhaseKind } from "@/lib/api-football/push/types";

/** Periodo del partido (independiente de estatus en BD). */
export type MatchPeriod =
  | "NS"
  | "1H"
  | "HT"
  | "2H"
  /** Descanso entre 90' y tiempo extra (empate en eliminatoria). */
  | "BRK_REG"
  | "ET1"
  | "ET_HT"
  | "ET2"
  | "PEN"
  | "FT"
  | "AET"
  | "AP";

export interface MatchClockState {
  period: MatchPeriod;
  anchorMinute: number | null;
  anchoredAt: string;
  ticking: boolean;
}

const TICKING_PERIODS = new Set<MatchPeriod>(["1H", "2H", "ET1", "ET2"]);

const FINISHED_STATUS: Record<string, EstatusPartido> = {
  finished: "finalizado",
  ft: "finalizado",
  "after pen.": "finalizado",
  "after pen": "finalizado",
  "after et": "finalizado",
  "after penalties": "finalizado",
};

/** Mapeo de match_status apifootball → estatus BD. Break/penalties antes de match_live. */
export function mapApifootballLiveStatus(
  statusRaw: string | undefined,
  matchLive?: string | number,
): EstatusPartido {
  if (!statusRaw?.trim()) return "programado";
  const trimmed = statusRaw.trim();
  const key = trimmed.toLowerCase();

  if (key === "not started" || key === "ns" || key === "scheduled") {
    return "programado";
  }
  if (key === "half time" || key === "ht") return "medio_tiempo";
  if (key === "break time" || key === "break") return "medio_tiempo";
  if (key.includes("half time")) return "medio_tiempo";
  if (FINISHED_STATUS[key]) return FINISHED_STATUS[key];
  if (
    key.includes("penalt") ||
    key.includes("penalty") ||
    key === "pen." ||
    key === "pen"
  ) {
    return "en_vivo";
  }

  if (String(matchLive) === "1") return "en_vivo";
  if (/^\d+$/.test(trimmed)) return "en_vivo";

  if (key.includes("1st") || key === "1h") return "en_vivo";
  if (key.includes("2nd") || key === "2h") return "en_vivo";
  if (key.includes("extra") || key === "et" || key.includes("aet")) {
    return "en_vivo";
  }
  if (key === "in play") return "en_vivo";

  if (key.includes("postpon")) return "aplazado";
  if (key.includes("cancel")) return "cancelado";
  if (key.includes("abandon") || key.includes("suspend")) return "suspendido";

  return "programado";
}

export function parsePenaltyScores(
  payload: {
    match_hometeam_penalty_score?: string | number | null;
    match_awayteam_penalty_score?: string | number | null;
    [key: string]: unknown;
  },
): { local: number | null; visitante: number | null } {
  const parse = (v: string | number | null | undefined): number | null => {
    if (v == null || String(v).trim() === "") return null;
    const n = Number.parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  };
  return {
    local: parse(payload.match_hometeam_penalty_score),
    visitante: parse(payload.match_awayteam_penalty_score),
  };
}

export function parsePenaltyScoresFromMetadata(
  metadata: unknown,
): { local: number | null; visitante: number | null } {
  if (!metadata || typeof metadata !== "object") {
    return { local: null, visitante: null };
  }
  const m = metadata as Record<string, unknown>;
  const parse = (v: unknown): number | null => {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number.parseInt(v, 10);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };
  return {
    local: parse(m.marcador_penales_local),
    visitante: parse(m.marcador_penales_visitante),
  };
}

export function parseRelojFromMetadata(
  metadata: unknown,
): MatchClockState | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).reloj;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const period = r.period;
  if (typeof period !== "string") return null;
  return {
    period: period as MatchPeriod,
    anchorMinute:
      typeof r.anchorMinute === "number" ? r.anchorMinute : null,
    anchoredAt:
      typeof r.anchoredAt === "string"
        ? r.anchoredAt
        : new Date().toISOString(),
    ticking: r.ticking === true,
  };
}

/** Minuto del partido desde API (NO usar minuto del último gol). */
export function parseApiMatchMinute(
  statusRaw: string,
  fixtureElapsed?: number | string | null,
): number | null {
  if (fixtureElapsed != null && fixtureElapsed !== "") {
    const n = Number.parseInt(String(fixtureElapsed), 10);
    if (!Number.isNaN(n)) return n;
  }
  const st = statusRaw.trim();
  if (/^\d+$/.test(st)) return Number.parseInt(st, 10);
  return null;
}

export function hasPenaltyShootoutPayload(payload: {
  match_hometeam_penalty_score?: string | number | null;
  match_awayteam_penalty_score?: string | number | null;
  [key: string]: unknown;
}): boolean {
  const h = payload.match_hometeam_penalty_score;
  const a = payload.match_awayteam_penalty_score;
  const has = (v: string | number | null | undefined) =>
    v != null && String(v).trim() !== "";
  return has(h) || has(a);
}

export function resolveMatchPeriod(
  statusRaw: string,
  estatus: EstatusPartido,
  minute: number | null,
  opts: {
    hasPenaltyScores?: boolean;
    prevPeriod?: MatchPeriod | null;
    prevAnchorMinute?: number | null;
    statusShort?: string | null;
  } = {},
): MatchPeriod {
  const s = statusRaw.trim().toLowerCase();
  const shortUpper = (opts.statusShort ?? statusRaw).trim().toUpperCase();
  const prev = opts.prevPeriod ?? null;
  const prevMin = opts.prevAnchorMinute ?? null;

  if (shortUpper === "1H") return "1H";
  if (shortUpper === "2H") return "2H";
  if (shortUpper === "HT" || shortUpper === "BT") return "HT";
  if (shortUpper === "ET") {
    if (minute != null && minute > 105) return "ET2";
    if (prev === "ET2" || (prevMin != null && prevMin > 105)) return "ET2";
    return "ET1";
  }
  if (shortUpper === "P" || shortUpper === "PEN") return "PEN";
  if (shortUpper === "FT") return "FT";
  if (shortUpper === "AET") return "AET";
  if (shortUpper === "AP") return "AP";

  if (estatus === "programado") return "NS";

  if (estatus === "finalizado") {
    if (s.includes("pen")) return "AP";
    if (s.includes("et") || s.includes("extra")) return "AET";
    return "FT";
  }

  if (
    opts.hasPenaltyScores ||
    s.includes("penalt") ||
    s.includes("penalty") ||
    s.includes("pen.") ||
    s === "pen"
  ) {
    return "PEN";
  }

  if (s === "break time" || s === "break") {
    if (prev === "ET2" || (prevMin != null && prevMin >= 105)) return "PEN";
    if (prev === "ET1" || (prevMin != null && prevMin > 90 && prevMin <= 105)) {
      return "ET_HT";
    }
    if (prev === "2H" || (prevMin != null && prevMin >= 90 && prevMin <= 90)) {
      return "BRK_REG";
    }
    if (prev === "ET_HT") return "ET_HT";
    if (prev === "BRK_REG") return "BRK_REG";
    return "HT";
  }

  if (estatus === "medio_tiempo") {
    if (prev === "ET2" || (prevMin != null && prevMin >= 105)) return "PEN";
    if (prev === "2H" || (prevMin != null && prevMin >= 90 && prevMin < 105)) {
      return "BRK_REG";
    }
    if (minute != null && minute > 90) return "ET_HT";
    if (prev === "ET1" || (prevMin != null && prevMin > 90)) return "ET_HT";
    if (s.includes("extra")) return "ET_HT";
    return "HT";
  }

  if (s.includes("half time") || s === "ht") return "HT";

  if (minute != null) {
    if (minute > 120) return "PEN";
    if (minute > 105) return "ET2";
    if (minute > 90) return "ET1";
    if (minute > 45 || s.includes("2nd") || s === "2h") return "2H";
    return "1H";
  }

  if (s.includes("2nd") || s === "2h") return "2H";
  if (s.includes("1st") || s === "1h") return "1H";
  if (s.includes("extra") || s === "et" || s.includes("aet")) {
    if (s.includes("2nd")) return "ET2";
    return "ET1";
  }

  return "1H";
}

const PERIOD_START_MINUTE: Partial<Record<MatchPeriod, number>> = {
  "1H": 1,
  "2H": 46,
  ET1: 91,
  ET2: 106,
};

export function buildClockState(
  statusRaw: string,
  estatus: EstatusPartido,
  apiMinute: number | null,
  prev: MatchClockState | null | undefined,
  opts: { hasPenaltyScores?: boolean; statusShort?: string | null } = {},
  now = new Date(),
): MatchClockState {
  const period = resolveMatchPeriod(statusRaw, estatus, apiMinute, {
    hasPenaltyScores: opts.hasPenaltyScores,
    prevPeriod: prev?.period ?? null,
    prevAnchorMinute: prev?.anchorMinute ?? null,
    statusShort: opts.statusShort ?? null,
  });
  const ticking = TICKING_PERIODS.has(period);
  const nowIso = now.toISOString();

  if (!ticking) {
    return {
      period,
      anchorMinute: null,
      anchoredAt: nowIso,
      ticking: false,
    };
  }

  if (apiMinute != null) {
    return { period, anchorMinute: apiMinute, anchoredAt: nowIso, ticking: true };
  }

  if (prev && prev.period === period) {
    if (prev.anchorMinute != null && prev.ticking) {
      const elapsed = Math.floor(
        (now.getTime() - new Date(prev.anchoredAt).getTime()) / 60_000,
      );
      return {
        period,
        anchorMinute: prev.anchorMinute + Math.max(0, elapsed),
        anchoredAt: nowIso,
        ticking,
      };
    }
    return { ...prev, ticking };
  }

  return {
    period,
    anchorMinute: PERIOD_START_MINUTE[period] ?? null,
    anchoredAt: nowIso,
    ticking,
  };
}

/** Máximo de minutos a interpolar entre polls de sync-live (~60s cron). */
const MAX_MINUTE_INTERPOLATION = 3;

export function computeDisplayMinute(
  clock: MatchClockState | null | undefined,
  now = Date.now(),
): number | null {
  if (!clock) return null;
  if (!clock.ticking || clock.anchorMinute == null) return clock.anchorMinute;
  const elapsed = Math.floor(
    (now - new Date(clock.anchoredAt).getTime()) / 60_000,
  );
  const interpolated = Math.min(Math.max(0, elapsed), MAX_MINUTE_INTERPOLATION);
  return clock.anchorMinute + interpolated;
}

export function detectPhaseTransition(
  prevPeriod: MatchPeriod | null | undefined,
  nextPeriod: MatchPeriod,
): MatchPhaseKind | null {
  const list = detectPhaseTransitions(prevPeriod, nextPeriod);
  return list.length > 0 ? list[list.length - 1]! : null;
}

export type PhaseTransitionContext = {
  homeScore?: number;
  awayScore?: number;
  isEliminatoria?: boolean;
};

/** Transiciones de fase (puede devolver varias si la API salta estados). */
export function detectPhaseTransitions(
  prevPeriod: MatchPeriod | null | undefined,
  nextPeriod: MatchPeriod,
  ctx: PhaseTransitionContext = {},
): MatchPhaseKind[] {
  if (!prevPeriod || prevPeriod === nextPeriod) return [];

  const map: Partial<
    Record<MatchPeriod, Partial<Record<MatchPeriod, MatchPhaseKind>>>
  > = {
    NS: { "1H": "kickoff", "2H": "kickoff" },
    "1H": { HT: "halftime" },
    HT: { "2H": "second_half" },
    "2H": {
      BRK_REG: "regulation_end",
      ET1: "extra_time_1st",
      PEN: "penalties",
      FT: "fulltime",
      AET: "fulltime",
    },
    BRK_REG: { ET1: "extra_time_1st", PEN: "penalties" },
    ET1: {
      ET_HT: "extra_time_halftime",
      PEN: "penalties",
      FT: "fulltime",
      AET: "fulltime",
    },
    ET_HT: { ET2: "extra_time_2nd", PEN: "penalties" },
    ET2: { PEN: "penalties", FT: "fulltime", AET: "fulltime", BRK_REG: "penalties" },
    PEN: { FT: "fulltime", AP: "fulltime" },
  };

  const single = map[prevPeriod]?.[nextPeriod];
  const isDraw =
    ctx.homeScore != null &&
    ctx.awayScore != null &&
    ctx.homeScore === ctx.awayScore;

  if (prevPeriod === "1H" && nextPeriod === "2H") {
    return ["halftime", "second_half"];
  }

  if (
    prevPeriod === "2H" &&
    nextPeriod === "ET1" &&
    ctx.isEliminatoria &&
    isDraw
  ) {
    return ["regulation_end", "extra_time_1st"];
  }

  if (prevPeriod === "2H" && nextPeriod === "BRK_REG" && ctx.isEliminatoria && isDraw) {
    return ["regulation_end"];
  }

  if (prevPeriod === "BRK_REG" && nextPeriod === "ET1") {
    return ["extra_time_1st"];
  }

  if (prevPeriod === "ET2" && nextPeriod === "PEN" && isDraw) {
    return ["penalties"];
  }

  return single ? [single] : [];
}

export function isEliminatoriaFase(fase: string | null | undefined): boolean {
  if (!fase || fase === "grupos") return false;
  return true;
}

export function formatMatchClockDisplay(
  estatus: EstatusPartido,
  clock: MatchClockState | null | undefined,
  fallbackMinute: number | null,
  fechaKickoff?: string,
  now = Date.now(),
  metadata?: unknown,
): { text: string | null; minute: number | null; penaltyLine: string | null } {
  const pen = parsePenaltyScoresFromMetadata(metadata);

  if (estatus === "finalizado") {
    if (clock?.period === "AP" || (pen.local != null && pen.visitante != null)) {
      const penLine =
        pen.local != null && pen.visitante != null
          ? `Penales ${pen.local}-${pen.visitante}`
          : null;
      return { text: "Final (penales)", minute: null, penaltyLine: penLine };
    }
    if (clock?.period === "AET") {
      return { text: "Final (TE)", minute: null, penaltyLine: null };
    }
    return { text: "Final", minute: null, penaltyLine: null };
  }

  if (estatus !== "en_vivo" && estatus !== "medio_tiempo") {
    return { text: null, minute: null, penaltyLine: null };
  }

  const period =
    clock?.period ?? (estatus === "medio_tiempo" ? "HT" : "1H");

  if (period === "HT") {
    return { text: "Medio tiempo", minute: null, penaltyLine: null };
  }
  if (period === "BRK_REG") {
    return { text: "Descanso · va TE", minute: null, penaltyLine: null };
  }
  if (period === "ET_HT") {
    return { text: "Descanso TE", minute: null, penaltyLine: null };
  }
  if (period === "PEN") {
    const hasPenScore = pen.local != null && pen.visitante != null;
    return {
      text: hasPenScore ? "Penales" : "Próx. penales",
      minute: null,
      penaltyLine: hasPenScore ? `${pen.local}-${pen.visitante}` : null,
    };
  }

  let minute = computeDisplayMinute(clock, now) ?? fallbackMinute;

  if (minute == null && fechaKickoff) {
    const kickoff = new Date(fechaKickoff).getTime();
    if (now >= kickoff) {
      const raw = Math.floor((now - kickoff) / 60_000) + 1;
      if (period === "2H") minute = Math.max(46, raw - 15);
      else if (period === "ET1") minute = Math.max(91, raw - 30);
      else minute = Math.max(1, raw);
    }
  }

  if (minute == null) return { text: null, minute: null, penaltyLine: null };

  const te = period === "ET1" || period === "ET2";
  return {
    text: te ? `${minute}' TE` : `${minute}'`,
    minute,
    penaltyLine: null,
  };
}

export function relojToMetadata(
  reloj: MatchClockState,
): Record<string, unknown> {
  return {
    period: reloj.period,
    anchorMinute: reloj.anchorMinute,
    anchoredAt: reloj.anchoredAt,
    ticking: reloj.ticking,
  };
}
