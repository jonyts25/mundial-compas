import { describe, expect, it } from "vitest";
import { calculateGroupStandingsFromPartidos } from "@/lib/standings/calculate-group-standings";
import { buildKnockoutBracket } from "@/lib/standings/build-knockout-bracket";
import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import { lookupThirdPlaceScenario } from "@/lib/standings/world-cup-third-place-scenarios";
import { explainRankBetweenTeams } from "@/lib/world-cup/fifa-tiebreaker-explainer";
import {
  assertFifaScenarioMessage,
  buildLiveScenarioCardModel,
  detectFifaScenarioChanges,
  serializeLiveSnapshotState,
} from "@/lib/world-cup/fifa-live-scenarios";
import { buildLiveWorldCupSnapshot } from "@/lib/world-cup/live-group-scenarios";
import { getProvisionalOpponent } from "@/lib/world-cup/knockout-slots";
import {
  buildMexicoKoreaBeforeLiveGoal,
  buildMexicoKoreaHeadToHeadFixtures,
  buildSouthAfricaThirdDropAfter,
  buildSouthAfricaThirdDropBefore,
} from "@/lib/world-cup/fixtures/world-cup-fifa-scenarios.fixture";

describe("FIFA tiebreaker — México vs Corea", () => {
  it("México mantiene 1.º tras gol de Corea en vivo (empate a puntos, gana H2H)", () => {
    const before = buildLiveWorldCupSnapshot(buildMexicoKoreaBeforeLiveGoal());
    const after = buildLiveWorldCupSnapshot(buildMexicoKoreaHeadToHeadFixtures());

    const mexBefore = before.groups
      .find((g) => g.groupKey === "A")!
      .teams.find((t) => t.teamId === "MEX")!;
    const mexAfter = after.groups
      .find((g) => g.groupKey === "A")!
      .teams.find((t) => t.teamId === "MEX")!;
    const korAfter = after.groups
      .find((g) => g.groupKey === "A")!
      .teams.find((t) => t.teamId === "KOR")!;

    expect(mexBefore.position).toBe(1);
    expect(mexAfter.position).toBe(1);
    expect(korAfter.position).toBe(2);
    expect(mexAfter.points).toBe(korAfter.points);

    const { groups, matchesByGroup } = calculateGroupStandingsFromPartidos(
      buildMexicoKoreaHeadToHeadFixtures(),
    );
    const groupAStats = groups.find((g) => g.groupKey === "A")!.teams;
    const stats = groupAStats.map((t) => ({
      teamKey: t.teamId,
      teamName: t.teamName,
      played: t.played,
      wins: t.wins,
      draws: t.draws,
      losses: t.losses,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      points: t.points,
    }));

    const decision = explainRankBetweenTeams(
      stats,
      matchesByGroup.A,
      "MEX",
      "KOR",
    );
    expect(decision?.decidingCriterion).toBe("head_to_head_points");
  });

  it("no genera cambio de liderato en diff cuando México sigue 1.º", () => {
    const before = serializeLiveSnapshotState(
      buildLiveWorldCupSnapshot(buildMexicoKoreaBeforeLiveGoal()),
    );
    const after = serializeLiveSnapshotState(
      buildLiveWorldCupSnapshot(buildMexicoKoreaHeadToHeadFixtures()),
    );

    const changes = detectFifaScenarioChanges(before, after);
    expect(
      changes.some((c) => c.type === "leader_changed" && c.teamId === "MEX"),
    ).toBe(false);
  });
});

describe("FIFA live scenario card", () => {
  it("México líder y rival R32 vía Anexo C (match 79)", () => {
    const card = buildLiveScenarioCardModel(buildMexicoKoreaHeadToHeadFixtures());
    const mexSummary = card.groupSummaries.find((g) => g.groupKey === "A");

    expect(mexSummary?.leader?.teamId).toBe("MEX");
    expect(mexSummary?.second?.teamId).toBe("KOR");

    const snapshot = buildLiveWorldCupSnapshot(buildMexicoKoreaHeadToHeadFixtures());
    const opp = getProvisionalOpponent("MEX", snapshot.r32);
    expect(opp?.matchNumber).toBe(79);
    expect(card.statements.some((s) => s.includes("México"))).toBe(true);
  });

  it("rechaza mensajes heurísticos prohibidos", () => {
    expect(() =>
      assertFifaScenarioMessage("Corea está a un gol de quitarle el liderato"),
    ).toThrow();
    expect(() => assertFifaScenarioMessage("Si cae un gol, México baja")).toThrow();
  });

  it("detecta cambio de rival provisional", () => {
    const before = serializeLiveSnapshotState(
      buildLiveWorldCupSnapshot(buildMexicoKoreaBeforeLiveGoal()),
    );
    const after = serializeLiveSnapshotState(
      buildLiveWorldCupSnapshot(buildMexicoKoreaHeadToHeadFixtures()),
    );

    const withFakeOpponentChange: typeof after = {
      ...after,
      opponents: {
        ...after.opponents,
        MEX: { label: "Escocia", matchNumber: 79, isProvisional: true },
      },
    };

    if (before.opponents.MEX) {
      const changes = detectFifaScenarioChanges(before, withFakeOpponentChange);
      expect(
        changes.some((c) => c.type === "provisional_opponent_changed"),
      ).toBe(true);
    }
  });
});

describe("FIFA escenarios — Chequia y Sudáfrica", () => {
  it("Sudáfrica es 3.º en Grupo A; Chequia 4.º — el partido pendiente vs México no altera posiciones actuales", () => {
    const snapshot = buildLiveWorldCupSnapshot(buildMexicoKoreaHeadToHeadFixtures());
    const groupA = snapshot.groups.find((g) => g.groupKey === "A")!;
    const cze = groupA.teams.find((t) => t.teamId === "CZE")!;
    const rsa = groupA.teams.find((t) => t.teamId === "RSA")!;

    expect(rsa.position).toBe(3);
    expect(cze.position).toBe(4);

    const card = buildLiveScenarioCardModel(buildMexicoKoreaHeadToHeadFixtures());
    expect(
      card.statements.some(
        (s) => s.includes("Anexo C") || s.includes("mejores terceros"),
      ),
    ).toBe(true);
  });

  it("Sudáfrica altera el escenario FIFA cuando pierde en vivo (Grupo F + Anexo C)", () => {
    const before = serializeLiveSnapshotState(
      buildLiveWorldCupSnapshot(buildSouthAfricaThirdDropBefore()),
    );
    const after = serializeLiveSnapshotState(
      buildLiveWorldCupSnapshot(buildSouthAfricaThirdDropAfter()),
    );

    const changes = detectFifaScenarioChanges(before, after);
    expect(changes.some((c) => c.text.includes("Sudáfrica"))).toBe(true);
    expect(changes.some((c) => c.type === "bracket_scenario_changed")).toBe(
      true,
    );
  });
});

describe("R32 — Anexo C y calendario FIFA", () => {
  it("lookupThirdPlaceScenario acepta 8 grupos de terceros", () => {
    const groups = "ABCDEFGHIJKL".split("").map((letter) => ({
      groupKey: letter,
      groupLabel: `Grupo ${letter}`,
      teams: [
        {
          position: 1,
          teamId: `${letter}1`,
          teamName: `${letter}1`,
          played: 3,
          wins: 2,
          draws: 1,
          losses: 0,
          goalsFor: 5,
          goalsAgainst: 1,
          goalDiff: 4,
          points: 7,
        },
        {
          position: 2,
          teamId: `${letter}2`,
          teamName: `${letter}2`,
          played: 3,
          wins: 1,
          draws: 2,
          losses: 0,
          goalsFor: 3,
          goalsAgainst: 2,
          goalDiff: 1,
          points: 5,
        },
        {
          position: 3,
          teamId: `${letter}3`,
          teamName: `${letter}3`,
          played: 3,
          wins: 1,
          draws: 0,
          losses: 2,
          goalsFor: 2 + (letter.charCodeAt(0) % 3),
          goalsAgainst: 3,
          goalDiff: -1,
          points: 3,
        },
        {
          position: 4,
          teamId: `${letter}4`,
          teamName: `${letter}4`,
          played: 3,
          wins: 0,
          draws: 1,
          losses: 2,
          goalsFor: 1,
          goalsAgainst: 5,
          goalDiff: -4,
          points: 1,
        },
      ],
    }));

    const thirds = buildBestThirdPlacesRanking(groups);
    const qualifying = thirds.filter((t) => t.qualifies).map((t) => t.groupKey);
    expect(qualifying).toHaveLength(8);

    const assignments = lookupThirdPlaceScenario(qualifying);
    expect(assignments).not.toBeNull();

    const bracket = buildKnockoutBracket({
      groups,
      bestThirdPlaces: thirds,
      partidos: [],
    });
    expect(bracket.matches).toHaveLength(16);
    expect(bracket.scenarioKey).toBeTruthy();
  });
});
