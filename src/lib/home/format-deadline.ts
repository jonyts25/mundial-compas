import { msUntilLock } from "@/lib/quiniela/lock";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/** Texto tipo "En 2 días" / "En 8 horas" / "En 43 minutos" hasta el cierre de quiniela. */
export function formatDeadlineCountdown(
  fechaKickoff: string,
  nowMs: number = Date.now(),
): string {
  const ms = msUntilLock(fechaKickoff, nowMs);
  if (ms <= 0) return "Cerrado";

  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return `En ${days} día${days === 1 ? "" : "s"}`;
  }
  if (hours >= 1) {
    return `En ${hours} hora${hours === 1 ? "" : "s"}`;
  }
  return `En ${Math.max(1, minutes)} minuto${minutes === 1 ? "" : "s"}`;
}

export function isDeadlineUrgent(
  fechaKickoff: string,
  nowMs: number = Date.now(),
): boolean {
  const ms = msUntilLock(fechaKickoff, nowMs);
  return ms > 0 && ms < MS_PER_DAY;
}
