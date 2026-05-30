import { MEXICO_TZ } from "@/lib/datetime/mexico-constants";

export { MEXICO_TZ };

function getPartsInMexico(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Inicio y fin del día calendario en Ciudad de México (como Date UTC). */
export function getMexicoDayBounds(reference = new Date()): {
  start: Date;
  end: Date;
} {
  const { year, month, day } = getPartsInMexico(reference);
  const probe = new Date(`${year}-${month}-${day}T12:00:00Z`);
  const mexParts = getPartsInMexico(probe);
  const localized = new Date(
    `${mexParts.year}-${mexParts.month}-${mexParts.day}T${mexParts.hour}:${mexParts.minute}:${mexParts.second}`,
  );
  const offsetMs = probe.getTime() - localized.getTime();

  const start = new Date(
    new Date(`${year}-${month}-${day}T00:00:00`).getTime() + offsetMs,
  );
  const end = new Date(
    new Date(`${year}-${month}-${day}T23:59:59.999`).getTime() + offsetMs,
  );

  return { start, end };
}

/** Hora corta 24h para chat (ej. 14:32) */
export function formatMexicoTimeShort(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatMexicoTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatMexicoDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** Fecha + hora del partido en CDMX (para quiniela / detalle) */
export function formatMexicoKickoff(iso: string): {
  fecha: string;
  hora: string;
} {
  return {
    fecha: formatMexicoDateLabel(iso),
    hora: formatMexicoTime(iso),
  };
}

/** Clave de día en CDMX: YYYY-MM-DD */
export function toMexicoDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Etiqueta para pestaña del calendario: "Lun" + "15" */
export function formatCalendarioTab(dateKey: string): {
  weekdayShort: string;
  dayNumber: string;
} {
  const [y, m, d] = dateKey.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 18, 0, 0));

  const weekdayShort = new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TZ,
    weekday: "short",
  })
    .format(probe)
    .replace(".", "")
    .slice(0, 3);
  const dayNumber = new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TZ,
    day: "numeric",
  }).format(probe);

  const cap =
    weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1).toLowerCase();

  return { weekdayShort: cap, dayNumber };
}
