import { mapApiStatus } from "@/lib/api-football/status-map";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import {
  buildClockState,
  parseRelojFromMetadata,
  relojToMetadata,
} from "@/lib/partidos/match-clock";

/** Reloj local que avanza entre polls (misma lógica que apifootball sync-live). */
export function buildRelojFromApiSportsFixture(
  item: ApiFootballFixtureItem,
  prevMetadata?: unknown,
  now = new Date(),
): { reloj: Record<string, unknown>; minuto_actual: number | null } {
  const prevReloj = parseRelojFromMetadata(prevMetadata);
  const statusRaw =
    item.fixture.status.short || item.fixture.status.long || "";
  const estatus = mapApiStatus(item.fixture.status.short);
  const apiMinute = item.fixture.status.elapsed;

  const reloj = buildClockState(
    statusRaw,
    estatus,
    apiMinute,
    prevReloj,
    {},
    now,
  );

  return {
    reloj: relojToMetadata(reloj),
    minuto_actual: reloj.ticking ? reloj.anchorMinute : apiMinute,
  };
}
