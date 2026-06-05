import { apiSportsGet } from "@/lib/api-football/client";

export interface ApiSportsFixtureEvent {
  time: { elapsed: number | null; extra?: number | null };
  team: { id: number; name: string };
  player?: { id?: number; name?: string | null };
  assist?: { id?: number; name?: string | null };
  type: string;
  detail?: string | null;
}

export async function fetchApiSportsFixtureEvents(
  apiKey: string,
  fixtureId: number,
): Promise<ApiSportsFixtureEvent[]> {
  const envelope = await apiSportsGet<ApiSportsFixtureEvent[]>(
    "/fixtures/events",
    apiKey,
    { fixture: fixtureId },
  );
  return envelope.response ?? [];
}

/** Último gol que explica el marcador actual (heurística para polling). */
export function findLatestGoalForScore(
  events: ApiSportsFixtureEvent[],
  score: { local: number; visitante: number },
  homeTeamId?: number,
): ApiSportsFixtureEvent | null {
  const goals = events.filter((e) => e.type === "Goal");
  if (goals.length === 0) return null;

  const total = score.local + score.visitante;
  if (goals.length < total) return goals[goals.length - 1] ?? null;

  const targetIndex = total - 1;
  const ordered = [...goals].sort(
    (a, b) => (a.time.elapsed ?? 0) - (b.time.elapsed ?? 0),
  );
  return ordered[targetIndex] ?? ordered[ordered.length - 1] ?? null;
}
