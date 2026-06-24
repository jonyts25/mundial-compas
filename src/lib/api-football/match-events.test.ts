import { describe, expect, it } from "vitest";
import type { ApiSportsFixtureEvent } from "@/lib/api-football/fetch-events";
import { findLatestGoalForScore } from "@/lib/api-football/fetch-events";
import {
  isMissedPenaltyEvent,
  isScoredGoalEvent,
  mapFixtureEventsToMomentos,
  parseMomentosFromMetadata,
} from "@/lib/api-football/match-events";
import { mapMomentoToTimelineType } from "@/lib/ai/match-summary/build-match-summary-input";

const HOME_ID = 10;
const AWAY_ID = 20;

function goalEvent(detail: string, minute = 45): ApiSportsFixtureEvent {
  return {
    type: "Goal",
    detail,
    time: { elapsed: minute, extra: null },
    team: { id: HOME_ID, name: "Local FC" },
    player: { name: "Jugador" },
  };
}

function varEvent(detail: string, minute = 50): ApiSportsFixtureEvent {
  return {
    type: "Var",
    detail,
    time: { elapsed: minute, extra: null },
    team: { id: HOME_ID, name: "Local FC" },
    player: { name: "VAR Player" },
  };
}

describe("mapFixtureEventsToMomentos — goals", () => {
  it("maps Goal / Normal Goal as gol", () => {
    const momentos = mapFixtureEventsToMomentos(
      [goalEvent("Normal Goal", 12)],
      HOME_ID,
      "Local FC",
      "Away FC",
    );
    expect(momentos).toHaveLength(1);
    expect(momentos[0]!.tipo).toBe("gol");
    expect(momentos[0]!.detail).toBe("Normal Goal");
    expect(mapMomentoToTimelineType(momentos[0]!.tipo, momentos[0]!.detail)).toBe(
      "gol",
    );
  });

  it("maps Goal / Penalty as gol with penalty detail", () => {
    const momentos = mapFixtureEventsToMomentos(
      [goalEvent("Penalty", 70)],
      HOME_ID,
      "Local FC",
      "Away FC",
    );
    expect(momentos[0]!.tipo).toBe("gol");
    expect(momentos[0]!.detail).toBe("Penalty");
    expect(mapMomentoToTimelineType(momentos[0]!.tipo, momentos[0]!.detail)).toBe(
      "penalty_goal",
    );
  });

  it("maps Goal / Own Goal as gol with own goal detail", () => {
    const momentos = mapFixtureEventsToMomentos(
      [goalEvent("Own Goal", 33)],
      HOME_ID,
      "Local FC",
      "Away FC",
    );
    expect(momentos[0]!.tipo).toBe("gol");
    expect(mapMomentoToTimelineType(momentos[0]!.tipo, momentos[0]!.detail)).toBe(
      "own_goal",
    );
  });

  it("maps Goal / Missed Penalty as penal_fallado, not gol", () => {
    const ev = goalEvent("Missed Penalty", 9);
    expect(isMissedPenaltyEvent(ev)).toBe(true);
    expect(isScoredGoalEvent(ev)).toBe(false);

    const momentos = mapFixtureEventsToMomentos(
      [ev],
      HOME_ID,
      "Local FC",
      "Away FC",
    );
    expect(momentos).toHaveLength(1);
    expect(momentos[0]!.tipo).toBe("penal_fallado");
    expect(momentos[0]!.tipo).not.toBe("gol");
    expect(mapMomentoToTimelineType(momentos[0]!.tipo, momentos[0]!.detail)).toBe(
      "penal_fallado",
    );
  });
});

describe("mapFixtureEventsToMomentos — VAR", () => {
  const cases = [
    ["Goal cancelled", "var"],
    ["Penalty confirmed", "var"],
    ["Penalty cancelled", "var"],
    ["Card upgrade", "var"],
  ] as const;

  for (const [detail, expectedTipo] of cases) {
    it(`maps Var / ${detail} as ${expectedTipo}`, () => {
      const momentos = mapFixtureEventsToMomentos(
        [varEvent(detail)],
        HOME_ID,
        "Local FC",
        "Away FC",
      );
      expect(momentos).toHaveLength(1);
      expect(momentos[0]!.tipo).toBe(expectedTipo);
      expect(momentos[0]!.detail).toBe(detail);
      expect(mapMomentoToTimelineType(momentos[0]!.tipo, momentos[0]!.detail)).toBe(
        "var",
      );
    });
  }
});

describe("parseMomentosFromMetadata — extended tipos", () => {
  it("round-trips penal_fallado, var and gol_anulado", () => {
    const meta = {
      eventos_clave: [
        {
          id: "p1",
          tipo: "penal_fallado",
          jugador: "Messi",
          equipo: "Argentina",
          minuto: 9,
          extra: null,
          detail: "Missed Penalty",
          es_local: true,
        },
        {
          id: "v1",
          tipo: "var",
          jugador: "Taremi",
          equipo: "Irán",
          minuto: 27,
          extra: null,
          detail: "Goal cancelled",
          es_local: false,
        },
        {
          id: "ga1",
          tipo: "gol_anulado",
          jugador: "Taremi",
          equipo: "Irán",
          minuto: 27,
          extra: null,
          detail: "Goal cancelled",
          es_local: false,
        },
      ],
    };
    const parsed = parseMomentosFromMetadata(meta);
    expect(parsed).toHaveLength(3);
    expect(parsed.map((m) => m.tipo)).toEqual([
      "penal_fallado",
      "var",
      "gol_anulado",
    ]);
  });
});

describe("findLatestGoalForScore", () => {
  it("ignores Missed Penalty when resolving latest goal", () => {
    const events: ApiSportsFixtureEvent[] = [
      goalEvent("Normal Goal", 10),
      goalEvent("Missed Penalty", 20),
      {
        type: "Goal",
        detail: "Normal Goal",
        time: { elapsed: 55 },
        team: { id: AWAY_ID, name: "Away FC" },
        player: { name: "Away Scorer" },
      },
    ];
    const latest = findLatestGoalForScore(
      events,
      { local: 1, visitante: 1 },
      HOME_ID,
    );
    expect(latest?.detail).toBe("Normal Goal");
    expect(latest?.time.elapsed).toBe(55);
  });
});
