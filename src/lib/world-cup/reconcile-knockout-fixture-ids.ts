import type { SupabaseClient } from "@supabase/supabase-js";
import { loadApiSportsFixtures } from "@/lib/api-football/cargar-fixtures";
import { mapFixtureToPartidoRow } from "@/lib/api-football/map-fixture-row";
import { upsertPartidoRows } from "@/lib/partidos/upsert-partido-rows";
import { withSeasonIdRows } from "@/lib/partidos/with-season-id";
import { PLACEHOLDER_FIXTURE_BASE } from "@/lib/world-cup/knockout-match-ids";

const LOOKAHEAD_MS = 48 * 60 * 60 * 1000;
const LOOKBACK_MS = 30 * 60 * 1000;

function kickoffDateInTimezone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Enlaza fixture ids placeholder (9xxxxxx) con ids reales de api-sports por fecha + equipos. */
export async function reconcileKnockoutPlaceholderFixtureIds(
  supabase: SupabaseClient,
  timezone = "America/Mexico_City",
): Promise<{ linked: number; dates: string[]; errors: string[] }> {
  const now = Date.now();
  const fromIso = new Date(now - LOOKBACK_MS).toISOString();
  const toIso = new Date(now + LOOKAHEAD_MS).toISOString();

  const { data: placeholders, error } = await supabase
    .from("partidos")
    .select("id, fecha_kickoff, fase")
    .gte("api_football_fixture_id", PLACEHOLDER_FIXTURE_BASE)
    .neq("fase", "grupos")
    .gte("fecha_kickoff", fromIso)
    .lte("fecha_kickoff", toIso);

  if (error) {
    return { linked: 0, dates: [], errors: [error.message] };
  }
  if (!placeholders?.length) {
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
