import { describe, expect, it } from "vitest";
import { calculateGroupStandingsFromPartidos } from "@/lib/standings/calculate-group-standings";
import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import { goalDiff, sortTeamsByTiebreakers } from "@/lib/standings/tiebreakers";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";

function partido(
  id: string,
  home: string,
  away: string,
  hl: number,
  av: number,
  grupo = "A",
): PartidoGrupoRow {
  return {
    id,
    fase: "grupos",
    grupo,
    equipo_local_codigo: home,
    equipo_visitante_codigo: away,
    equipo_local_nombre: home,
    equipo_visitante_nombre: away,
    marcador_local: hl,
    marcador_visitante: av,
    estatus: "finalizado",
  };
}

describe("standings / tabla", () => {
  it("calcula puntos y diferencia de goles en grupo", () => {
    const rows = [
      partido("1", "MEX", "POL", 2, 0),
      partido("2", "ARG", "HAI", 1, 1),
      partido("3", "MEX", "ARG", 1, 1),
      partido("4", "POL", "HAI", 0, 2),
    ];
    const { groups } = calculateGroupStandingsFromPartidos(rows);
    const groupA = groups.find((g) => g.groupKey === "A");
    expect(groupA).toBeDefined();
    const mex = groupA!.teams.find((t) => t.teamId === "MEX");
    expect(mex?.points).toBe(4);
    expect(mex?.goalDiff).toBe(2);
    expect(mex?.goalsFor).toBe(3);
    expect(mex?.goalsAgainst).toBe(1);
  });

  it("desempate por puntos y goal diff", () => {
    const a = {
      teamKey: "A",
      teamName: "A",
      played: 3,
      wins: 2,
      draws: 0,
      losses: 1,
      goalsFor: 5,
      goalsAgainst: 3,
      points: 6,
    };
    const b = {
      teamKey: "B",
      teamName: "B",
      played: 3,
      wins: 2,
      draws: 0,
      losses: 1,
      goalsFor: 4,
      goalsAgainst: 2,
      points: 6,
    };
    const sorted = sortTeamsByTiebreakers([a, b], [], undefined);
    expect(goalDiff(a)).toBe(2);
    expect(sorted[0]!.teamKey).toBe("A");
  });

  it("mejores terceros — 8 clasifican de 12 grupos simulados", () => {
    const groups = Array.from({ length: 12 }, (_, i) => {
      const letter = String.fromCharCode(65 + i);
      return {
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
            goalsFor: 2 + (i % 3),
            goalsAgainst: 3,
            goalDiff: -1 + (i % 2),
            points: 3 + (i % 2),
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
      };
    });
    const thirds = buildBestThirdPlacesRanking(groups);
    expect(thirds).toHaveLength(12);
    expect(thirds.filter((t) => t.qualifies)).toHaveLength(8);
    expect(thirds[0]!.rank).toBe(1);
  });
});
