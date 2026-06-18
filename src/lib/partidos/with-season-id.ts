import { DEFAULT_SEASON_ID } from "@/lib/constants";
import { isPilotPartidoMetadata } from "@/lib/api-football/pilot-config";

export type PartidoSeasonRow = {
  metadata?: unknown;
  season_id?: string | null;
};

/**
 * Asigna `season_id` WC 2026 a filas de ingest no-pilot.
 * No sobrescribe `season_id` existente; pilot queda sin asignar.
 */
export function withSeasonId<T extends PartidoSeasonRow>(row: T): T {
  if (isPilotPartidoMetadata(row.metadata)) {
    return row;
  }
  if (row.season_id != null && row.season_id !== "") {
    return row;
  }
  return { ...row, season_id: DEFAULT_SEASON_ID };
}

export function withSeasonIdRows<T extends PartidoSeasonRow>(rows: T[]): T[] {
  return rows.map(withSeasonId);
}
