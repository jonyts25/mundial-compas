import { apiSportsGet } from "@/lib/api-football/client";
import { isScoredGoalEvent } from "@/lib/api-football/match-events";

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
  const goals = events.filter((e) => isScoredGoalEvent(e));
  if (goals.length === 0) return null;

  const total = score.local + score.visitante;
  if (goals.length < total) return goals[goals.length - 1] ?? null;

  const targetIndex = total - 1;
  const ordered = [...goals].sort(
    (a, b) => (a.time.elapsed ?? 0) - (b.time.elapsed ?? 0),
  );
  return ordered[targetIndex] ?? ordered[ordered.length - 1] ?? null;
}

function isShootoutPenaltyGoal(event: ApiSportsFixtureEvent): boolean {
  const detail = (event.detail ?? "").toLowerCase();
  if (event.type !== "Goal") return false;
  if (!detail.includes("penalty") || detail.includes("missed")) return false;
  const elapsed = event.time.elapsed;
  // Tanda de penales: elapsed null o post-120; en juego suele ser 1–120.
  return elapsed == null || elapsed >= 120;
}

/** N-ésimo penal anotado de un equipo en la tanda (1-based). */
export function findNthPenaltyGoalForTeam(
  events: ApiSportsFixtureEvent[],
  teamId: number,
  kickIndex: number,
): ApiSportsFixtureEvent | null {
  const teamPenGoals = events.filter(
    (event) => isShootoutPenaltyGoal(event) && event.team.id === teamId,
  );
  if (teamPenGoals.length === 0) return null;
  return teamPenGoals[kickIndex - 1] ?? teamPenGoals[teamPenGoals.length - 1] ?? null;
}
