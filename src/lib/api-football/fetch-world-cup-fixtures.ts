/**
 * Puente hacia apifootball.com (apiv3.apifootball.com).
 * Auth: query param APIkey — NO headers x-apisports-key.
 */
import { fetchWorldCupEvents } from "@/lib/apifootball/fetch-world-cup-events";
import type { ApifootballEvent } from "@/lib/apifootball/types";

export type { ApifootballEvent };

export async function fetchWorldCupFixtures(
  apiKey: string,
  _legacyBaseUrl?: string,
): Promise<ApifootballEvent[]> {
  return fetchWorldCupEvents(apiKey, { validateKey: false });
}

export { fetchApifootballCountries } from "@/lib/apifootball/fetch-world-cup-events";
