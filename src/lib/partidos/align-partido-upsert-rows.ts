import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPartidoMatchKey,
  buildTeamPairKey,
} from "@/lib/partidos/partido-match-key";
import { PLACEHOLDER_FIXTURE_BASE } from "@/lib/world-cup/knockout-match-ids";

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

const KICKOFF_WINDOW_MS = 3 * 60 * 60 * 1000;

function findPlaceholderMatch<T extends PartidoUpsertLike>(
  row: T,
  placeholders: ExistingPartidoRow[],
): ExistingPartidoRow | undefined {
  const teamKey = buildTeamPairKey(row);
  const kickoffMs = new Date(row.fecha_kickoff).getTime();

  return placeholders.find((candidate) => {
    if (buildTeamPairKey(candidate) !== teamKey) return false;
    const delta = Math.abs(new Date(candidate.fecha_kickoff).getTime() - kickoffMs);
    return delta <= KICKOFF_WINDOW_MS;
  });
}

/**
 * Evita duplicar partidos cuando api-sports y placeholders KO usan distintos fixture ids
 * para el mismo encuentro (mismo kickoff + equipos, o par de equipos en ventana ±3 h).
 */
export async function alignPartidoUpsertRowsToExistingMatches<
  T extends PartidoUpsertLike,
>(supabase: SupabaseClient, rows: T[]): Promise<AlignedPartidoUpsertRows<T>> {
  if (rows.length === 0) {
    return { inserts: [], updates: [] };
  }

  const kickoffTimes = rows.map((r) => new Date(r.fecha_kickoff).getTime());
  const windowStart = new Date(Math.min(...kickoffTimes) - KICKOFF_WINDOW_MS).toISOString();
  const windowEnd = new Date(Math.max(...kickoffTimes) + KICKOFF_WINDOW_MS).toISOString();

  const { data: existingRows, error } = await supabase
    .from("partidos")
    .select(
      "id, api_football_fixture_id, fecha_kickoff, equipo_local_nombre, equipo_visitante_nombre",
    )
    .gte("fecha_kickoff", windowStart)
    .lte("fecha_kickoff", windowEnd);

  if (error) {
    throw new Error(error.message);
  }

  const placeholders = ((existingRows ?? []) as ExistingPartidoRow[]).filter(
    (row) => row.api_football_fixture_id >= PLACEHOLDER_FIXTURE_BASE,
  );

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
    let sameMatch = byMatchKey.get(matchKey);

    if (!sameMatch) {
      sameMatch = findPlaceholderMatch(row, placeholders);
    }

    if (sameMatch && sameMatch.api_football_fixture_id !== row.api_football_fixture_id) {
      updates.push({ ...row, id: sameMatch.id });
      const merged: ExistingPartidoRow = {
        ...sameMatch,
        api_football_fixture_id: row.api_football_fixture_id,
        equipo_local_nombre: row.equipo_local_nombre,
        equipo_visitante_nombre: row.equipo_visitante_nombre,
        fecha_kickoff: row.fecha_kickoff,
      };
      byMatchKey.set(buildPartidoMatchKey(merged), merged);
      byMatchKey.set(matchKey, merged);
      byFixtureId.set(row.api_football_fixture_id, merged);
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
