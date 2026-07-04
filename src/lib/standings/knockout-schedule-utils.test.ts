import { describe, expect, it } from "vitest";
import { indexKnockoutPartidosByMatchNumber } from "@/lib/standings/knockout-schedule-utils";
import type { PartidoMatchKeyFields } from "@/lib/partidos/partido-match-key";

function koPartido(
  overrides: Partial<PartidoMatchKeyFields> & Pick<PartidoMatchKeyFields, "id">,
): PartidoMatchKeyFields {
  return {
    fecha_kickoff: "2026-07-04T21:00:00.000Z",
    equipo_local_nombre: "Team A",
    equipo_visitante_nombre: "Team B",
    fase: "octavos",
    estatus: "programado",
    metadata: {},
    ...overrides,
  };
}

describe("indexKnockoutPartidosByMatchNumber", () => {
  it("prefiere fila finalizada sobre placeholder del mismo slot FIFA", () => {
    const placeholder = koPartido({
      id: "placeholder",
      api_football_fixture_id: 9_000_089,
      estatus: "programado",
      metadata: { knockout_match_id: "r16_01", fifa_match_number: 89 },
    });
    const live = koPartido({
      id: "real",
      api_football_fixture_id: 1_600_001,
      estatus: "finalizado",
      marcador_local: 2,
      marcador_visitante: 1,
      metadata: { knockout_match_id: "r16_01", fifa_match_number: 89 },
    });

    const indexed = indexKnockoutPartidosByMatchNumber([
      placeholder as never,
      live as never,
    ]);
    expect(indexed.get(89)?.id).toBe("real");
  });

  it("prefiere fila en vivo sobre placeholder programado", () => {
    const placeholder = koPartido({
      id: "placeholder",
      api_football_fixture_id: 9_000_089,
      estatus: "programado",
      metadata: { fifa_match_number: 89 },
    });
    const live = koPartido({
      id: "real",
      api_football_fixture_id: 1_600_001,
      estatus: "en_vivo",
      marcador_local: 1,
      marcador_visitante: 0,
      metadata: { fifa_match_number: 89 },
    });

    const indexed = indexKnockoutPartidosByMatchNumber([
      placeholder as never,
      live as never,
    ]);
    expect(indexed.get(89)?.id).toBe("real");
  });
});
