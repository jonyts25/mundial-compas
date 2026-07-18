import { describe, expect, it } from "vitest";
import { resolveFifaMatchNumber } from "@/lib/api-football/map-fixture-row";
import type { ApiFootballFixtureItem } from "@/lib/api-football/types-fixtures";
import {
  mapFixtureScoresToPartido,
  teamsMatchEitherOrder,
} from "@/lib/partidos/map-api-scores-to-partido";
import { normalizeTeamNameForMatch } from "@/lib/partidos/partido-match-key";

function fixture(partial: Partial<ApiFootballFixtureItem>): ApiFootballFixtureItem {
  return {
    fixture: {
      id: 1,
      date: "2026-07-18T21:00:00+00:00",
      timestamp: 1781893200,
      status: { short: "1H", long: "First Half", elapsed: 20 },
      venue: { name: "Hard Rock Stadium", city: "Miami Gardens" },
    },
    league: {
      id: 1,
      name: "World Cup",
      round: "3rd Place Final",
      season: 2026,
    },
    teams: {
      home: { id: 10, name: "England", logo: null },
      away: { id: 11, name: "France", logo: null },
    },
    goals: { home: 3, away: 0 },
    ...partial,
  } as ApiFootballFixtureItem;
}

describe("normalizeTeamNameForMatch aliases", () => {
  it("empareja Francia/Inglaterra con France/England", () => {
    expect(normalizeTeamNameForMatch("Francia")).toBe("france");
    expect(normalizeTeamNameForMatch("Inglaterra")).toBe("england");
    expect(
      normalizeTeamNameForMatch("Francia") ===
        normalizeTeamNameForMatch("France"),
    ).toBe(true);
  });
});

describe("mapFixtureScoresToPartido", () => {
  it("invierte marcador si local/visitante están al revés en BD", () => {
    const item = fixture({});
    const mapped = mapFixtureScoresToPartido(
      { equipo_local_nombre: "Francia", equipo_visitante_nombre: "Inglaterra" },
      item,
    );
    expect(mapped).toEqual({ marcador_local: 0, marcador_visitante: 3 });
  });

  it("teamsMatchEitherOrder tolera orden invertido", () => {
    expect(
      teamsMatchEitherOrder(
        { equipo_local_nombre: "Francia", equipo_visitante_nombre: "Inglaterra" },
        fixture({}),
      ),
    ).toBe(true);
  });
});

describe("resolveFifaMatchNumber tercer lugar", () => {
  it("resuelve M103 por fase aunque falte venue exacto", () => {
    const n = resolveFifaMatchNumber(
      fixture({
        fixture: {
          id: 2,
          date: "2026-07-18T21:00:00+00:00",
          timestamp: 1781893200,
          status: { short: "1H", long: "First Half", elapsed: 10 },
          venue: { name: "Miami Stadium", city: "Miami" },
        },
        league: { id: 1, name: "World Cup", round: "3rd Place Final", season: 2026 },
      }),
    );
    expect(n).toBe(103);
  });
});
