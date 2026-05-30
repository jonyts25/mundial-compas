import { apifootballGet } from "@/lib/apifootball/client";
import {
  APIFOOTBALL_DEFAULT_TIMEZONE,
  WORLD_CUP_DEFAULT_FROM,
  WORLD_CUP_DEFAULT_TO,
} from "@/lib/apifootball/constants";
import {
  resolveChampionsLeagueId,
  resolveWorldCupLeagueId,
} from "@/lib/apifootball/resolve-league";
import type { ApifootballCountry, ApifootballEvent } from "@/lib/apifootball/types";

export interface FetchLeagueEventsOptions {
  from?: string;
  to?: string;
  leagueId?: string;
  timezone?: string;
  /** Si true, llama get_countries antes (validación de APIkey) */
  validateKey?: boolean;
  /** Resuelve league_id de Champions si no viene leagueId */
  resolveChampions?: boolean;
}

/** @deprecated Usa FetchLeagueEventsOptions */
export type FetchWorldCupOptions = FetchLeagueEventsOptions;

/** Valida APIkey con get_countries */
export async function fetchApifootballCountries(
  apiKey: string,
): Promise<ApifootballCountry[]> {
  const data = await apifootballGet<ApifootballCountry[] | { error: number; message?: string }>(
    "get_countries",
    apiKey,
  );

  if (!Array.isArray(data)) {
    throw new Error(
      `get_countries inesperado: ${JSON.stringify(data).slice(0, 200)}`,
    );
  }

  return data;
}

export { resolveChampionsLeagueId, resolveWorldCupLeagueId } from "@/lib/apifootball/resolve-league";

/**
 * Descarga partidos de una liga vía action=get_events (apifootball.com).
 */
export async function fetchLeagueEvents(
  apiKey: string,
  options: FetchLeagueEventsOptions = {},
): Promise<ApifootballEvent[]> {
  const from = options.from ?? WORLD_CUP_DEFAULT_FROM;
  const to = options.to ?? WORLD_CUP_DEFAULT_TO;
  const timezone = options.timezone ?? APIFOOTBALL_DEFAULT_TIMEZONE;

  if (options.validateKey) {
    const countries = await fetchApifootballCountries(apiKey);
    console.log(
      `[apifootball] get_countries OK — ${countries.length} países en plan`,
    );
  }

  let leagueId = options.leagueId?.trim();
  if (!leagueId) {
    if (options.resolveChampions) {
      leagueId = await resolveChampionsLeagueId(apiKey);
    } else {
      leagueId =
        process.env.APIFOOTBALL_LEAGUE_ID?.trim() ??
        (await resolveWorldCupLeagueId(apiKey));
    }
  }

  console.log(
    `[apifootball] get_events league_id=${leagueId} from=${from} to=${to}`,
  );

  const events = await apifootballGet<ApifootballEvent[] | { error: number; message?: string }>(
    "get_events",
    apiKey,
    {
      from,
      to,
      league_id: leagueId,
      timezone,
    },
  );

  if (!Array.isArray(events)) {
    throw new Error(
      `get_events inesperado: ${JSON.stringify(events).slice(0, 300)}`,
    );
  }

  return events;
}

/** Descarga partidos del Mundial (alias de fetchLeagueEvents). */
export async function fetchWorldCupEvents(
  apiKey: string,
  options: FetchLeagueEventsOptions = {},
): Promise<ApifootballEvent[]> {
  return fetchLeagueEvents(apiKey, options);
}
