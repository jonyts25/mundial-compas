import { describe, expect, it } from "vitest";
import {
  dedupePartidosByMatchKey,
  dedupePartidosForDisplay,
  enrichPronosticoPuntosFromPartido,
  filterOrphanKnockoutApiFixtures,
  remapPronosticosToDedupedPartidos,
} from "@/lib/partidos/partido-match-key";

describe("dedupePartidosByMatchKey", () => {
  it("prefiere fixture api-sports real sobre placeholder con pronóstico", () => {
    const placeholder = {
      id: "placeholder-id",
      fecha_kickoff: "2026-06-28T19:00:00.000Z",
      equipo_local_nombre: "South Africa",
      equipo_visitante_nombre: "Canada",
      api_football_fixture_id: 9_000_073,
      estatus: "programado",
    };
    const real = {
      id: "real-id",
      fecha_kickoff: "2026-06-28T19:00:00.000Z",
      equipo_local_nombre: "South Africa",
      equipo_visitante_nombre: "Canada",
      api_football_fixture_id: 1_561_329,
      estatus: "en_vivo",
    };

    const deduped = dedupePartidosByMatchKey([placeholder, real], {
      "placeholder-id": { id: "p1" },
    });

    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.id).toBe("real-id");
  });
});

describe("dedupePartidosForDisplay", () => {
  it("elimina fixture api-sports huérfano en dieciseisavos", () => {
    const canonical = {
      id: "r32-canonical",
      fase: "dieciseisavos",
      fecha_kickoff: "2026-07-04T17:00:00.000Z",
      equipo_local_nombre: "Canada",
      equipo_visitante_nombre: "Morocco",
      api_football_fixture_id: 9_000_083,
      metadata: { knockout_match_id: "r32_09", fifa_match_number: 81 },
    };
    const orphan = {
      id: "r32-orphan",
      fase: "dieciseisavos",
      fecha_kickoff: "2026-07-04T17:00:00.000Z",
      equipo_local_nombre: "Canada",
      equipo_visitante_nombre: "Morocco",
      api_football_fixture_id: 1_567_824,
      metadata: {},
    };

    const filtered = filterOrphanKnockoutApiFixtures([canonical, orphan]);
    expect(filtered.map((p) => p.id)).toEqual(["r32-canonical"]);

    const deduped = dedupePartidosForDisplay([canonical, orphan]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.id).toBe("r32-canonical");
  });

  it("dedupe octavos por knockout_match_id aunque kickoff difiera", () => {
    const placeholder = {
      id: "r16-placeholder",
      fase: "octavos",
      fecha_kickoff: "2026-07-04T21:00:00.000Z",
      equipo_local_nombre: "Ganador P74",
      equipo_visitante_nombre: "Ganador P77",
      api_football_fixture_id: 9_000_089,
      metadata: { knockout_match_id: "r16_01", fifa_match_number: 89 },
    };
    const real = {
      id: "r16-real",
      fase: "octavos",
      fecha_kickoff: "2026-07-04T21:30:00.000Z",
      equipo_local_nombre: "Spain",
      equipo_visitante_nombre: "Austria",
      api_football_fixture_id: 1_600_001,
      metadata: { knockout_match_id: "r16_01", fifa_match_number: 89 },
    };

    const deduped = dedupePartidosForDisplay([placeholder, real]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.id).toBe("r16-real");
  });

  it("prefiere fixture finalizado aunque el pronóstico esté en el placeholder", () => {
    const placeholder = {
      id: "r32-placeholder",
      fase: "dieciseisavos",
      fecha_kickoff: "2026-07-05T21:00:00.000Z",
      equipo_local_nombre: "Argentina",
      equipo_visitante_nombre: "Cape Verde",
      api_football_fixture_id: 9_000_086,
      estatus: "programado",
      marcador_local: null,
      marcador_visitante: null,
      metadata: { knockout_match_id: "r32_10", fifa_match_number: 86 },
    };
    const real = {
      id: "r32-real",
      fase: "dieciseisavos",
      fecha_kickoff: "2026-07-05T22:00:00.000Z",
      equipo_local_nombre: "Argentina",
      equipo_visitante_nombre: "Cape Verde",
      api_football_fixture_id: 1_565_179,
      estatus: "finalizado",
      marcador_local: 4,
      marcador_visitante: 0,
      metadata: { knockout_match_id: "r32_10", fifa_match_number: 86 },
    };

    const deduped = dedupePartidosForDisplay([placeholder, real], {
      "r32-placeholder": { id: "p1" },
    });
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.id).toBe("r32-real");

    const remapped = remapPronosticosToDedupedPartidos(
      deduped,
      [placeholder, real],
      {
        "r32-placeholder": {
          partido_id: "r32-placeholder",
          goles_local: 2,
          goles_visitante: 0,
          puntos: 0,
        },
      },
    );

    expect(remapped["r32-real"]).toMatchObject({
      goles_local: 2,
      goles_visitante: 0,
      puntos: 1,
    });
  });

  it("enriquece puntos al leer pronóstico contra marcador final", () => {
    const partido = {
      id: "p1",
      fecha_kickoff: "2026-07-05T22:00:00.000Z",
      equipo_local_nombre: "Argentina",
      equipo_visitante_nombre: "Cape Verde",
      estatus: "finalizado",
      marcador_local: 4,
      marcador_visitante: 0,
    };

    expect(
      enrichPronosticoPuntosFromPartido(partido, {
        partido_id: "legacy",
        goles_local: 4,
        goles_visitante: 0,
        puntos: 0,
      }).puntos,
    ).toBe(3);
  });
});
