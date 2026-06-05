import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import type { ApiFootballWebhookPayload } from "@/types/api-football";

/** Convierte un fixture api-sports al shape que usan los handlers de webhook. */
export function fixtureItemToWebhookPayload(
  item: ApiFootballFixtureItem,
): ApiFootballWebhookPayload {
  return {
    event: "fixture",
    fixture: {
      id: item.fixture.id,
      status: item.fixture.status,
      goals: { home: item.goals.home, away: item.goals.away },
      teams: {
        home: { id: item.teams.home.id, name: item.teams.home.name },
        away: { id: item.teams.away.id, name: item.teams.away.name },
      },
    },
    goal: {
      time: { elapsed: item.fixture.status.elapsed ?? undefined },
    },
  };
}
