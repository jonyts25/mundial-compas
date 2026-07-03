import { mapApiStatus } from "@/lib/api-football/status-map";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import {
  buildClockState,
  parseRelojFromMetadata,
  relojToMetadata,
  type MatchClockState,
} from "@/lib/partidos/match-clock";

/**
 * Convierte elapsed/extra de api-sports al minuto absoluto del partido.
 * En tiempo añadido la API a veces envía elapsed=6 (contador del complemento) en lugar de 96.
 */
export function normalizeApiSportsElapsed(
  statusShort: string,
  elapsed: number | null | undefined,
  extra: number | null | undefined,
  prevReloj: MatchClockState | null,
): number | null {
  if (elapsed == null || Number.isNaN(elapsed)) return null;

  const short = statusShort.trim().toUpperCase();
  const prevMin = prevReloj?.anchorMinute ?? null;
  const prevPeriod = prevReloj?.period ?? null;

  if (extra != null && extra > 0) {
    if (short === "1H") {
      const base = elapsed >= 45 ? elapsed : 45;
      return base + extra;
    }
    if (short === "2H") {
      // En 90+ la API a veces manda elapsed=46 (inicio 2T) con extra=18 → base debe ser 90.
      const base = elapsed >= 90 ? elapsed : 90;
      return base + extra;
    }
    if (short === "ET") {
      const base = elapsed >= 91 ? elapsed : prevMin != null && prevMin > 105 ? 105 : 90;
      return base + extra;
    }
  }

  if (short === "2H" && elapsed < 46) {
    return 90 + elapsed;
  }

  // elapsed=46 pegado al arranque del 2T mientras el partido ya va en 90+.
  if (
    short === "2H" &&
    elapsed === 46 &&
    prevMin != null &&
    prevMin >= 55
  ) {
    return prevMin;
  }

  if (
    short === "1H" &&
    elapsed < 45 &&
    (prevPeriod === "1H" || prevPeriod === null) &&
    prevMin != null &&
    prevMin >= 40
  ) {
    return 45 + elapsed;
  }

  if (short === "ET" && elapsed < 91 && prevMin != null && prevMin >= 90) {
    return 90 + elapsed;
  }

  return elapsed;
}

/** Reloj local que avanza entre polls (misma lógica que apifootball sync-live). */
export function buildRelojFromApiSportsFixture(
  item: ApiFootballFixtureItem,
  prevMetadata?: unknown,
  now = new Date(),
  penaltyScores: { local: number | null; visitante: number | null } = {
    local: null,
    visitante: null,
  },
): { reloj: Record<string, unknown>; minuto_actual: number | null } {
  const prevReloj = parseRelojFromMetadata(prevMetadata);
  const statusShort = item.fixture.status.short || "";
  const statusRaw = statusShort || item.fixture.status.long || "";
  const estatus = mapApiStatus(statusShort);
  const apiMinute = normalizeApiSportsElapsed(
    statusShort,
    item.fixture.status.elapsed,
    item.fixture.status.extra ?? null,
    prevReloj,
  );

  const hasPenaltyScores =
    penaltyScores.local != null || penaltyScores.visitante != null;

  const reloj = buildClockState(
    statusRaw,
    estatus,
    apiMinute,
    prevReloj,
    { statusShort: statusShort || null, hasPenaltyScores },
    now,
  );

  const displayMinute =
    reloj.ticking && reloj.anchorMinute != null
      ? reloj.anchorMinute
      : apiMinute;

  return {
    reloj: relojToMetadata(reloj),
    minuto_actual: displayMinute,
  };
}
