import { describe, expect, it } from "vitest";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import { buildKnockoutBracket } from "@/lib/standings/build-knockout-bracket";
import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import { calculateGroupStandingsFromPartidos } from "@/lib/standings/calculate-group-standings";
import {
  computeLockedGroupPositions,
  isGroupPositionSlotLocked,
  isThirdPlaceSlotLocked,
} from "@/lib/standings/knockout-match-certainty";

function partido(
  id: string,
  home: string,
  away: string,
  hl: number,
  av: number,
  grupo: string,
  estatus: PartidoGrupoRow["estatus"] = "finalizado",
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
    estatus,
  };
}

function finishGroup(
  prefix: string,
  grupo: string,
  leader: string,
  second: string,
  third: string,
  fourth: string,
) {
  return [
    partido(`${prefix}1`, leader, second, 2, 0, grupo),
    partido(`${prefix}2`, leader, third, 2, 0, grupo),
    partido(`${prefix}3`, leader, fourth, 2, 0, grupo),
    partido(`${prefix}4`, second, third, 2, 1, grupo),
    partido(`${prefix}5`, second, fourth, 1, 0, grupo),
    partido(`${prefix}6`, third, fourth, 1, 0, grupo),
  ];
}

describe("knockout-match-certainty", () => {
  it("marca 1.º bloqueado cuando el líder no puede ser alcanzado", () => {
    const rows = [
      partido("1", "BRA", "SRB", 3, 0, "C"),
      partido("2", "BRA", "SUI", 3, 0, "C"),
      partido("3", "BRA", "CAN", 3, 0, "C"),
      partido("4", "SRB", "SUI", 0, 0, "C", "programado"),
      partido("5", "SRB", "CAN", 0, 0, "C", "programado"),
      partido("6", "SUI", "CAN", 0, 0, "C", "programado"),
    ];

    const locked = computeLockedGroupPositions(rows);
    expect(locked.has("C-1")).toBe(true);
    expect(
      isGroupPositionSlotLocked(
        { kind: "group_position", group: "C", position: 1 },
        locked,
        rows,
      ),
    ).toBe(true);
  });

  it("no marca 2.º bloqueado si el grupo sigue abierto", () => {
    const rows = [
      partido("1", "CAN", "RSA", 1, 0, "D"),
      partido("2", "CAN", "TUN", 2, 0, "D"),
      partido("3", "RSA", "TUN", 1, 1, "D"),
      partido("4", "CAN", "QAT", 0, 0, "D", "programado"),
      partido("5", "RSA", "QAT", 0, 0, "D", "programado"),
      partido("6", "TUN", "QAT", 0, 0, "D", "programado"),
    ];

    const locked = computeLockedGroupPositions(rows);
    expect(
      isGroupPositionSlotLocked(
        { kind: "group_position", group: "D", position: 2 },
        locked,
        rows,
      ),
    ).toBe(false);
  });

  it("marca 2.º bloqueado solo cuando el grupo cerró", () => {
    const rows = finishGroup("d", "D", "CAN", "RSA", "TUN", "QAT");
    const locked = computeLockedGroupPositions(rows);
    expect(
      isGroupPositionSlotLocked(
        { kind: "group_position", group: "D", position: 2 },
        locked,
        rows,
      ),
    ).toBe(true);
  });

  it("no marca tercero de Anexo C hasta cerrar fase de grupos", () => {
    expect(
      isThirdPlaceSlotLocked({
        groupStageComplete: false,
        assignments: {
          A: "E",
          B: "J",
          D: "I",
          E: "F",
          G: "H",
          I: "G",
          K: "L",
          L: "K",
        },
      }),
    ).toBe(false);
  });

  it("1A vs tercero no es verde si solo el 1.º está asegurado (México vs tercero)", () => {
    const rows = [
      ...finishGroup("a", "A", "MEX", "SCO", "POR", "HAI"),
      partido("b1", "BRA", "SRB", 3, 0, "B"),
    ];

    const { groups } = calculateGroupStandingsFromPartidos(rows);
    const bestThirdPlaces = buildBestThirdPlacesRanking(groups);
    const bracket = buildKnockoutBracket({
      groups,
      bestThirdPlaces,
      partidos: rows,
    });

    const match79 = bracket.matches.find((m) => m.matchNumber === 79);
    expect(match79).toBeDefined();
    expect(match79!.home.teamId).toBe("MEX");
    expect(match79!.home.isLocked).toBe(true);
    expect(match79!.away.isLocked).toBe(false);
    expect(match79!.isDefined).toBe(false);
  });

  it("2D vs 2G es verde cuando ambos grupos cerraron (Canadá vs Sudáfrica)", () => {
    const rows = [
      ...finishGroup("d", "D", "FRA", "CAN", "TUN", "QAT"),
      ...finishGroup("g", "G", "BEL", "RSA", "MAR", "IRQ"),
    ];

    const { groups } = calculateGroupStandingsFromPartidos(rows);
    const bestThirdPlaces = buildBestThirdPlacesRanking(groups);
    const bracket = buildKnockoutBracket({
      groups,
      bestThirdPlaces,
      partidos: rows,
    });

    const match88 = bracket.matches.find((m) => m.matchNumber === 88);
    expect(match88).toBeDefined();
    expect(match88!.home.teamId).toBe("CAN");
    expect(match88!.away.teamId).toBe("RSA");
    expect(match88!.isDefined).toBe(true);
  });

  it("2A vs 2B no es verde si un grupo sigue abierto", () => {
    const rows = [
      ...finishGroup("a", "A", "MEX", "SCO", "POR", "HAI"),
      partido("b1", "BRA", "SRB", 1, 0, "B"),
      partido("b2", "BRA", "SUI", 0, 0, "B", "programado"),
    ];

    const { groups } = calculateGroupStandingsFromPartidos(rows);
    const bestThirdPlaces = buildBestThirdPlacesRanking(groups);
    const bracket = buildKnockoutBracket({
      groups,
      bestThirdPlaces,
      partidos: rows,
    });

    const match73 = bracket.matches.find((m) => m.matchNumber === 73);
    expect(match73).toBeDefined();
    expect(match73!.isDefined).toBe(false);
  });
});
