import type { PartidoUpsertRow } from "@/lib/api-football/map-fixture-row";
import { buildMissingKnockoutFixtureRows } from "@/lib/world-cup/build-knockout-fixture-rows";
import type { Partido } from "@/types/database";

/**
 * Filas placeholder para cruces FIFA 73–104 aún sin fixture en BD.
 * Se upsertean tras cargar partidos desde API para habilitar /partidos/[id].
 */
export function buildKnockoutPlaceholderRows(
  existingKnockout: Partido[],
): PartidoUpsertRow[] {
  return buildMissingKnockoutFixtureRows(existingKnockout);
}
