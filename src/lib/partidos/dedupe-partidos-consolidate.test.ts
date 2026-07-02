import { describe, expect, it } from "vitest";
import { findDuplicateGroups } from "@/lib/partidos/dedupe-partidos-consolidate";

describe("findDuplicateGroups", () => {
  it("detecta placeholder y fixture real el mismo día CDMX", () => {
    const placeholder = {
      id: "placeholder-id",
      fecha_kickoff: "2026-07-03T18:00:00.000Z",
      equipo_local_nombre: "Colombia",
      equipo_visitante_nombre: "Portugal",
      api_football_fixture_id: 9_000_086,
      estatus: "programado",
      fase: "dieciseisavos",
    };
    const real = {
      id: "real-id",
      fecha_kickoff: "2026-07-03T18:00:00.000Z",
      equipo_local_nombre: "Colombia",
      equipo_visitante_nombre: "Portugal",
      api_football_fixture_id: 1_561_342,
      estatus: "programado",
      fase: "dieciseisavos",
    };

    const groups = findDuplicateGroups([placeholder, real], {
      "placeholder-id": { id: "p1" },
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.canonical_id).toBe("real-id");
    expect(groups[0]!.legacy_ids).toEqual(["placeholder-id"]);
  });

  it("no agrupa partidos distintos el mismo día", () => {
    const a = {
      id: "a",
      fecha_kickoff: "2026-07-03T18:00:00.000Z",
      equipo_local_nombre: "Colombia",
      equipo_visitante_nombre: "Portugal",
      api_football_fixture_id: 1,
      estatus: "programado",
      fase: "dieciseisavos",
    };
    const b = {
      id: "b",
      fecha_kickoff: "2026-07-03T22:00:00.000Z",
      equipo_local_nombre: "Germany",
      equipo_visitante_nombre: "France",
      api_football_fixture_id: 2,
      estatus: "programado",
      fase: "dieciseisavos",
    };

    expect(findDuplicateGroups([a, b])).toHaveLength(0);
  });
});
