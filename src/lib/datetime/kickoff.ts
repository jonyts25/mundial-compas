import { MEXICO_TZ } from "@/lib/datetime/mexico-constants";

export { MEXICO_TZ };

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getPartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Convierte fecha/hora “de pared” en una zona IANA a instante UTC (ms).
 */
export function zonedWallTimeToUtcMs(
  parts: DateParts,
  timeZone: string = MEXICO_TZ,
): number {
  let utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  for (let i = 0; i < 4; i++) {
    const zoned = getPartsInTimeZone(new Date(utcGuess), timeZone);
    const desiredAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const actualAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    utcGuess += desiredAsUtc - actualAsUtc;
  }

  return utcGuess;
}

/** match_date + match_time de apifootball → ISO UTC (hora en CDMX por defecto). */
export function buildKickoffIsoFromApi(
  matchDate: string,
  matchTime?: string,
  timeZone: string = MEXICO_TZ,
): string {
  const dateMatch = matchDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    const fallback = new Date(matchDate);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toISOString();
    }
    return new Date().toISOString();
  }

  const [, y, mo, d] = dateMatch;
  const timeRaw = matchTime?.trim() || "12:00";
  const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  const hour = timeMatch ? Number(timeMatch[1]) : 12;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const second = timeMatch?.[3] ? Number(timeMatch[3]) : 0;

  const ms = zonedWallTimeToUtcMs(
    {
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour,
      minute,
      second,
    },
    timeZone,
  );

  return new Date(ms).toISOString();
}

/**
 * Parsea fecha_kickoff a milisegundos UTC.
 * - ISO con Z u offset → instante absoluto.
 * - Sin zona → hora de pared en America/Mexico_City (convención API / carga).
 */
export function parseKickoffToMs(fechaKickoff: string): number {
  const raw = fechaKickoff?.trim();
  if (!raw) return Number.NaN;

  if (/[zZ]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    return new Date(raw).getTime();
  }

  const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/,
  );

  if (match) {
    const [, y, mo, d, h = "12", mi = "00", se = "00"] = match;
    return zonedWallTimeToUtcMs({
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour: Number(h),
      minute: Number(mi),
      second: Number(se),
    });
  }

  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}
