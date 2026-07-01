import type { SupabaseClient } from "@supabase/supabase-js";
import { loadApiSportsFixtures } from "@/lib/api-football/cargar-fixtures";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import { kickoffDateInTimezone } from "@/lib/partidos/kickoff-date-key";
import { normalizeTeamNameForMatch } from "@/lib/partidos/partido-match-key";
import type { SyncLiveResult } from "@/lib/partidos/sync-live-scores";
import { PLACEHOLDER_FIXTURE_BASE } from "@/lib/world-cup/knockout-match-ids";

type AplazadoRow = {
  api_football_fixture_id: number | null;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  fecha_kickoff: string;
};

function teamPairKey(local: string, visitante: string): string {
  return `${normalizeTeamNameForMatch(local)}|${normalizeTeamNameForMatch(visitante)}`;
}

function fixtureMatchesAplazado(
  item: ApiFootballFixtureItem,
  row: AplazadoRow,
): boolean {
  const fixtureId = row.api_football_fixture_id;
  if (fixtureId != null && fixtureId < PLACEHOLDER_FIXTURE_BASE) {
    return item.fixture.id === fixtureId;
  }
  const rowKey = teamPairKey(row.equipo_local_nombre, row.equipo_visitante_nombre);
  const apiKey = teamPairKey(item.teams.home.name, item.teams.away.name);
  const apiKeySwapped = teamPairKey(item.teams.away.name, item.teams.home.name);
  return rowKey === apiKey || rowKey === apiKeySwapped;
}

function collectAplazadoDates(
  rows: AplazadoRow[],
  timezone: string,
): string[] {
  const dates = new Set<string>();
  dates.add(kickoffDateInTimezone(new Date().toISOString(), timezone));
  for (const row of rows) {
    dates.add(kickoffDateInTimezone(row.fecha_kickoff, timezone));
    const nextDay = new Date(new Date(row.fecha_kickoff).getTime() + 24 * 60 * 60_000);
    dates.add(kickoffDateInTimezone(nextDay.toISOString(), timezone));
  }
  return [...dates];
}

/** Reconsulta partidos aplazados por fecha (cubre placeholders sin id real de API). */
export async function syncAplazadoPartidosFromApiDates(
  supabase: SupabaseClient,
  timezone: string,
  syncFixture: (
    item: ApiFootballFixtureItem,
  ) => Promise<void>,
  result: SyncLiveResult,
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("partidos")
    .select(
      "api_football_fixture_id, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff",
    )
    .eq("estatus", "aplazado");

  if (error) throw new Error(error.message);
  if (!rows?.length) return;

  const aplazados = rows as AplazadoRow[];
  const dates = collectAplazadoDates(aplazados, timezone);

  for (const date of dates) {
    const { items } = await loadApiSportsFixtures({ date });
    result.apiRequests = (result.apiRequests ?? 0) + 1;
    result.fetched += items.length;

    for (const item of items) {
      const matched = aplazados.some((row) => fixtureMatchesAplazado(item, row));
      if (!matched) continue;
      try {
        await syncFixture(item);
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }
}
