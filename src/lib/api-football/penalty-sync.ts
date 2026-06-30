import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import { parsePenaltyScoresFromMetadata } from "@/lib/partidos/match-clock";
import type { MatchPeriod } from "@/lib/partidos/match-clock";

export function extractPenaltyScoresFromFixture(
  item: ApiFootballFixtureItem,
): { local: number | null; visitante: number | null } {
  const pen = item.score?.penalty;
  if (!pen) return { local: null, visitante: null };

  const parse = (v: number | null | undefined): number | null =>
    typeof v === "number" && !Number.isNaN(v) ? v : null;

  return {
    local: parse(pen.home),
    visitante: parse(pen.away),
  };
}

export function mergePenaltyMetadata(
  metadata: Record<string, unknown>,
  penLocal: number | null,
  penAway: number | null,
): Record<string, unknown> {
  if (penLocal == null && penAway == null) return metadata;
  return {
    ...metadata,
    ...(penLocal != null ? { marcador_penales_local: penLocal } : {}),
    ...(penAway != null ? { marcador_penales_visitante: penAway } : {}),
  };
}

export function readPenaltyScoresFromMetadata(
  metadata: unknown,
): { local: number | null; visitante: number | null } {
  return parsePenaltyScoresFromMetadata(metadata);
}

export function isPenaltyShootoutLive(
  statusShort: string | null | undefined,
  period: MatchPeriod | null | undefined,
): boolean {
  const s = (statusShort ?? "").trim().toUpperCase();
  return s === "P" || period === "PEN";
}

export function isKnockoutPenaltyMetadataMissing(
  row: {
    marcador_local: number | null;
    marcador_visitante: number | null;
    metadata: unknown;
  },
): boolean {
  if (row.marcador_local == null || row.marcador_visitante == null) return false;
  if (row.marcador_local !== row.marcador_visitante) return false;
  const pen = readPenaltyScoresFromMetadata(row.metadata);
  return pen.local == null || pen.visitante == null;
}

export function penaltySideIncreased(
  prev: { local: number | null; visitante: number | null },
  next: { local: number | null; visitante: number | null },
): "local" | "visitante" | null {
  const prevLocal = prev.local ?? 0;
  const prevAway = prev.visitante ?? 0;
  const nextLocal = next.local ?? 0;
  const nextAway = next.visitante ?? 0;

  const localUp = nextLocal > prevLocal;
  const awayUp = nextAway > prevAway;
  if (localUp && !awayUp) return "local";
  if (awayUp && !localUp) return "visitante";
  if (localUp && awayUp) return "local";
  return null;
}
