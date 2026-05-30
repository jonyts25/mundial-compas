import { parseKickoffToMs } from "@/lib/datetime/kickoff";

/** Minutos antes del pitazo en que se bloquea la quiniela */
export const QUINIELA_LOCK_MINUTES_BEFORE = 5;

const LOCK_MS = QUINIELA_LOCK_MINUTES_BEFORE * 60 * 1000;

/** Milisegundos UTC del pitazo */
export function getKickoffMs(fechaKickoff: string): number {
  return parseKickoffToMs(fechaKickoff);
}

/** Milisegundos UTC en que se cierra la quiniela (kickoff − 5 min) */
export function getLockAtMs(fechaKickoff: string): number {
  const kickoff = getKickoffMs(fechaKickoff);
  if (Number.isNaN(kickoff)) return Number.NaN;
  return kickoff - LOCK_MS;
}

/**
 * true si ya pasó el cierre: now >= (kickoff − 5 min).
 * Comparación en ms UTC (Date.now() vs parseKickoffToMs).
 */
export function isPronosticoLocked(
  fechaKickoff: string,
  nowMs: number = Date.now(),
): boolean {
  const lockAt = getLockAtMs(fechaKickoff);
  if (Number.isNaN(lockAt)) return false;
  return nowMs >= lockAt;
}

/** Ms restantes hasta el cierre (0 si ya cerró) */
export function msUntilLock(fechaKickoff: string, nowMs = Date.now()): number {
  const lockAt = getLockAtMs(fechaKickoff);
  if (Number.isNaN(lockAt)) return 0;
  return Math.max(0, lockAt - nowMs);
}

/** @deprecated Usar formatTimeUntilLock */
export function minutesUntilLock(fechaKickoff: string, nowMs = Date.now()): number {
  return Math.ceil(msUntilLock(fechaKickoff, nowMs) / 60_000);
}

/** Texto humano: días → horas → minutos */
export function formatTimeUntilLock(fechaKickoff: string, nowMs = Date.now()): string {
  const ms = msUntilLock(fechaKickoff, nowMs);
  if (ms <= 0) return "Cerrado";

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return `Cierra en ${days} día${days === 1 ? "" : "s"}`;
  }
  if (hours >= 1) {
    const minPart = minutes > 0 ? ` ${minutes} min` : "";
    return `Cierra en ${hours} h${minPart}`;
  }
  return `Cierra en ${Math.max(1, minutes)} min`;
}
