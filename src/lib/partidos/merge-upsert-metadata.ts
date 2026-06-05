import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeLiveNotifyMetadata } from "@/lib/api-football/goal-notify-state";

type PartidoRowWithMetadata = {
  api_football_fixture_id: number;
  metadata: Record<string, unknown>;
};

export async function mergePartidoUpsertRowsWithStoredMetadata<T extends PartidoRowWithMetadata>(
  supabase: SupabaseClient,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const fixtureIds = rows.map((r) => r.api_football_fixture_id);
  const { data: existingRows } = await supabase
    .from("partidos")
    .select("api_football_fixture_id, metadata")
    .in("api_football_fixture_id", fixtureIds);

  const metaByFixture = new Map(
    (existingRows ?? []).map((r) => [
      r.api_football_fixture_id as number,
      r.metadata,
    ]),
  );

  return rows.map((row) => ({
    ...row,
    metadata: mergeLiveNotifyMetadata(
      row.metadata,
      metaByFixture.get(row.api_football_fixture_id),
    ),
  }));
}
