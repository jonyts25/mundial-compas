import { describe, expect, it } from "vitest";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import { buildKnockoutBracket } from "@/lib/standings/build-knockout-bracket";
import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import { calculateGroupStandingsFromPartidos } from "@/lib/standings/calculate-group-standings";
import {
  computeLockedGroupPositions,
  isKnockoutMatchDefined,
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

describe("knockout-match-certainty", () => {
  it("marca posición 1 como bloqueada cuando el líder no puede ser alcanzado", () => {
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
  });

  it("marca todas las posiciones cuando el grupo terminó", () => {
    const rows = [
      partido("1", "BRA", "SRB", 3, 0, "C"),
      partido("2", "BRA", "SUI", 2, 0, "C"),
      partido("3", "SRB", "SUI", 1, 1, "C"),
      partido("4", "BRA", "CAN", 1, 0, "C"),
      partido("5", "SRB", "CAN", 0, 2, "C"),
      partido("6", "SUI", "CAN", 1, 1, "C"),
    ];

    const locked = computeLockedGroupPositions(rows);
    expect(locked.has("C-1")).toBe(true);
    expect(locked.has("C-2")).toBe(true);
    expect(locked.has("C-3")).toBe(true);
  });

  it("marca cruce como definido cuando ambos slots están bloqueados", () => {
    const finishGroup = (
      prefix: string,
      grupo: string,
      leader: string,
      second: string,
      third: string,
      fourth: string,
    ) => [
      partido(`${prefix}1`, leader, second, 2, 0, grupo),
      partido(`${prefix}2`, leader, third, 2, 0, grupo),
      partido(`${prefix}3`, leader, fourth, 2, 0, grupo),
      partido(`${prefix}4`, second, third, 2, 1, grupo),
      partido(`${prefix}5`, second, fourth, 1, 0, grupo),
      partido(`${prefix}6`, third, fourth, 1, 0, grupo),
    ];

    const rows = [
      ...finishGroup("c", "C", "BRA", "SUI", "SRB", "CAN"),
      ...finishGroup("f", "F", "FRA", "GER", "ESP", "POR"),
    ];

    const { groups } = calculateGroupStandingsFromPartidos(rows);
    const bestThirdPlaces = buildBestThirdPlacesRanking(groups);
    const bracket = buildKnockoutBracket({
      groups,
      bestThirdPlaces,
      partidos: rows,
    });

    const match76 = bracket.matches.find((m) => m.matchNumber === 76);
    expect(match76).toBeDefined();
    expect(match76!.home.teamId).toBe("BRA");
    expect(match76!.away.teamId).toBe("GER");
    expect(match76!.isDefined).toBe(true);
    expect(isKnockoutMatchDefined(match76!.home, match76!.away)).toBe(true);
  });
});
