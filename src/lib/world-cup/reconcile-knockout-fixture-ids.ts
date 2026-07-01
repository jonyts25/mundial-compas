import type { SupabaseClient } from "@supabase/supabase-js";
import { loadApiSportsFixtures } from "@/lib/api-football/cargar-fixtures";
import { mapFixtureToPartidoRow } from "@/lib/api-football/map-fixture-row";
import { upsertPartidoRows } from "@/lib/partidos/upsert-partido-rows";
import { kickoffDateInTimezone } from "@/lib/partidos/kickoff-date-key";
import { withSeasonIdRows } from "@/lib/partidos/with-season-id";
import { PLACEHOLDER_FIXTURE_BASE } from "@/lib/world-cup/knockout-match-ids";

const LOOKAHEAD_MS = 48 * 60 * 60 * 1000;
const LOOKBACK_MS = 30 * 60 * 1000;
const POSTPONED_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/** Enlaza fixture ids placeholder (9xxxxxx) con ids reales de api-sports por fecha + equipos. */
export async function reconcileKnockoutPlaceholderFixtureIds(
  supabase: SupabaseClient,
  timezone = "America/Mexico_City",
): Promise<{ linked: number; dates: string[]; errors: string[] }> {
  const now = Date.now();
  const fromIso = new Date(now - LOOKBACK_MS).toISOString();
  const toIso = new Date(now + LOOKAHEAD_MS).toISOString();
  const postponedFromIso = new Date(now - POSTPONED_LOOKBACK_MS).toISOString();

  const [windowResult, postponedResult] = await Promise.all([
    supabase
      .from("partidos")
      .select("id, fecha_kickoff, fase")
      .gte("api_football_fixture_id", PLACEHOLDER_FIXTURE_BASE)
      .neq("fase", "grupos")
      .gte("fecha_kickoff", fromIso)
      .lte("fecha_kickoff", toIso),
    supabase
      .from("partidos")
      .select("id, fecha_kickoff, fase")
      .gte("api_football_fixture_id", PLACEHOLDER_FIXTURE_BASE)
      .neq("fase", "grupos")
      .eq("estatus", "aplazado")
      .gte("fecha_kickoff", postponedFromIso),
  ]);

  const error = windowResult.error ?? postponedResult.error;
  const placeholders = [
    ...((windowResult.data ?? []) as Array<{ fecha_kickoff: string }>),
    ...((postponedResult.data ?? []) as Array<{ fecha_kickoff: string }>),
  ];

  if (error) {
    return { linked: 0, dates: [], errors: [error.message] };
  }
  if (!placeholders.length) {
    return { linked: 0, dates: [], errors: [] };
  }

  const dates = [
    ...new Set(
      placeholders.map((p) =>
        kickoffDateInTimezone(String(p.fecha_kickoff), timezone),
      ),
    ),
  ];

  let linked = 0;
  const errors: string[] = [];

  for (const date of dates) {
    try {
      const { items } = await loadApiSportsFixtures({ date });
      if (items.length === 0) continue;

      const rows = items.map((item) => mapFixtureToPartidoRow(item));
      const { upserted, batchErrors } = await upsertPartidoRows(
        supabase,
        withSeasonIdRows(rows),
      );
      linked += upserted;
      errors.push(...batchErrors);
    } catch (e) {
      errors.push(
        e instanceof Error ? `${date}: ${e.message}` : `${date}: reconcile failed`,
      );
    }
  }

  return { linked, dates, errors };
}
