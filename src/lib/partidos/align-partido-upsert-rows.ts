import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPartidoMatchKey } from "@/lib/partidos/partido-match-key";

type PartidoUpsertLike = {
  api_football_fixture_id: number;
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  metadata: Record<string, unknown>;
};

type ExistingPartidoRow = {
  id: string;
  api_football_fixture_id: number;
  fecha_kickoff: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
};

export type AlignedPartidoUpsertRows<T extends PartidoUpsertLike> = {
  inserts: T[];
  updates: Array<T & { id: string }>;
};

/**
 * Evita duplicar partidos cuando api-sports y apifootball usan distintos fixture ids
 * para el mismo encuentro (mismo kickoff + equipos).
 */
export async function alignPartidoUpsertRowsToExistingMatches<
  T extends PartidoUpsertLike,
>(supabase: SupabaseClient, rows: T[]): Promise<AlignedPartidoUpsertRows<T>> {
  if (rows.length === 0) {
    return { inserts: [], updates: [] };
  }

  const kickoffs = [...new Set(rows.map((r) => r.fecha_kickoff))];
  const { data: existingRows, error } = await supabase
    .from("partidos")
    .select(
      "id, api_football_fixture_id, fecha_kickoff, equipo_local_nombre, equipo_visitante_nombre",
    )
    .in("fecha_kickoff", kickoffs);

  if (error) {
    throw new Error(error.message);
  }

  const byMatchKey = new Map<string, ExistingPartidoRow>();
  const byFixtureId = new Map<number, ExistingPartidoRow>();

  for (const row of (existingRows ?? []) as ExistingPartidoRow[]) {
    byMatchKey.set(buildPartidoMatchKey(row), row);
    byFixtureId.set(row.api_football_fixture_id, row);
  }

  const inserts: T[] = [];
  const updates: Array<T & { id: string }> = [];

  for (const row of rows) {
    const sameFixture = byFixtureId.get(row.api_football_fixture_id);
    if (sameFixture) {
      updates.push({ ...row, id: sameFixture.id });
      continue;
    }

    const matchKey = buildPartidoMatchKey(row);
    const sameMatch = byMatchKey.get(matchKey);
    if (sameMatch && sameMatch.api_football_fixture_id !== row.api_football_fixture_id) {
      updates.push({ ...row, id: sameMatch.id });
      byMatchKey.set(matchKey, {
        ...sameMatch,
        api_football_fixture_id: row.api_football_fixture_id,
        equipo_local_nombre: row.equipo_local_nombre,
        equipo_visitante_nombre: row.equipo_visitante_nombre,
      });
      byFixtureId.set(row.api_football_fixture_id, {
        ...sameMatch,
        api_football_fixture_id: row.api_football_fixture_id,
      });
      continue;
    }

    inserts.push(row);
    const synthetic: ExistingPartidoRow = {
      id: `pending-${row.api_football_fixture_id}`,
      api_football_fixture_id: row.api_football_fixture_id,
      fecha_kickoff: row.fecha_kickoff,
      equipo_local_nombre: row.equipo_local_nombre,
      equipo_visitante_nombre: row.equipo_visitante_nombre,
    };
    byMatchKey.set(matchKey, synthetic);
    byFixtureId.set(row.api_football_fixture_id, synthetic);
  }

  return { inserts, updates };
}
