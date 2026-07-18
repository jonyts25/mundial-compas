import { describe, expect, it } from "vitest";
import { buildFullKnockoutTree } from "@/lib/standings/build-knockout-bracket";
import { calculateGroupStandingsFromPartidos } from "@/lib/standings/calculate-group-standings";
import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import type { Partido } from "@/types/database";

function knockoutPartido(
  matchNumber: number,
  home: string,
  away: string,
  homeCode: string,
  awayCode: string,
  hl: number,
  av: number,
  penHome: number,
  penAway: number,
): Partido {
  return {
    id: `p-${matchNumber}`,
    fase: "dieciseisavos",
    grupo: null,
    jornada: null,
    sede: "Test Stadium",
    equipo_local_codigo: homeCode,
    equipo_visitante_codigo: awayCode,
    equipo_local_nombre: home,
    equipo_visitante_nombre: away,
    fecha_kickoff: "2026-06-29T00:00:00.000Z",
    estatus: "finalizado",
    marcador_local: hl,
    marcador_visitante: av,
    canal_transmision: "sin_asignar",
    minuto_actual: null,
    metadata: {
      fifa_match_number: matchNumber,
      marcador_penales_local: penHome,
      marcador_penales_visitante: penAway,
    },
  };
}

describe("buildFullKnockoutTree penalty winners", () => {
  it("advances penalty winners into R16 slots (P74/P75 → P89)", () => {
    const { groups } = calculateGroupStandingsFromPartidos([]);
    const tree = buildFullKnockoutTree({
      groups,
      bestThirdPlaces: buildBestThirdPlacesRanking(groups),
      partidosGrupo: [],
      knockoutPartidos: [
        knockoutPartido(74, "Germany", "Paraguay", "GER", "PAR", 1, 1, 3, 4),
        knockoutPartido(75, "Netherlands", "Morocco", "NED", "MAR", 1, 1, 2, 3),
      ],
    });

    const r16 = tree.phases.find((p) => p.id === "r16");
    const p89 = r16?.matches.find((m) => m.matchNumber === 89);
    const p90 = r16?.matches.find((m) => m.matchNumber === 90);
    expect(p89).toBeDefined();
    expect(p89!.home.teamName).toBe("Paraguay");
    expect(p90).toBeDefined();
    expect(p90!.away.teamName).toBe("Morocco");
    expect(p89!.home.label).not.toContain("Ganador P74");
    expect(p90!.away.label).not.toContain("Ganador P75");
  });
});
