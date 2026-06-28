import { describe, expect, it } from "vitest";
import { dedupePartidosByMatchKey } from "@/lib/partidos/partido-match-key";

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
