import { describe, expect, it } from "vitest";
import {
  resolveAnnexCAssignments,
  thirdPlaceSlotPlaceholder,
  getProvisionalOpponent,
  computeRoundOf32Slots,
} from "@/lib/world-cup/knockout-slots";
import {
  buildLiveWorldCupSnapshot,
  computeLiveGroupTable,
  describeTeamPosition,
  diffLiveSnapshots,
  type PartidoGrupoRow,
} from "@/lib/world-cup/live-group-scenarios";
import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";

function partido(
  id: string,
  home: string,
  homeName: string,
  away: string,
  awayName: string,
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
    equipo_local_nombre: homeName,
    equipo_visitante_nombre: awayName,
    marcador_local: hl,
    marcador_visitante: av,
    estatus,
  };
}

describe("live-group-scenarios", () => {
  it("gol en vivo cambia 1º/2º del grupo", () => {
    const before = [
      partido("1", "CCC", "Gamma", "DDD", "Delta", 1, 0, "A"),
      partido("2", "AAA", "Alpha", "BBB", "Beta", 2, 1, "A", "en_vivo"),
    ];
    const after = [
      partido("1", "CCC", "Gamma", "DDD", "Delta", 1, 0, "A"),
      partido("2", "AAA", "Alpha", "BBB", "Beta", 2, 2, "A", "en_vivo"),
    ];

    const snapBefore = buildLiveWorldCupSnapshot(before);
    const snapAfter = buildLiveWorldCupSnapshot(after);
    const msgs = diffLiveSnapshots(snapBefore, snapAfter);

    const alphaBefore = snapBefore.groups
      .find((g) => g.groupKey === "A")!
      .teams.find((t) => t.teamId === "AAA")!;
    const alphaAfter = snapAfter.groups
      .find((g) => g.groupKey === "A")!
      .teams.find((t) => t.teamId === "AAA")!;

    expect(alphaBefore.position).toBe(1);
    expect(alphaAfter.position).toBe(2);
    expect(msgs.some((m) => m.text.includes("Alpha") && m.text.includes("1.º al 2.º"))).toBe(
      true,
    );
  });

  it("empate en vivo suma puntos al tercero del grupo", () => {
    const base = [
      partido("1", "E1", "E1", "E2", "E2", 2, 0, "E"),
      partido("2", "E3", "E3", "E4", "E4", 2, 0, "E"),
      partido("3", "E1", "E1", "E3", "E3", 1, 0, "E"),
    ];
    const before = computeLiveGroupTable([
      ...base,
      partido("4", "E2", "E2", "E4", "E4", 1, 0, "E"),
    ]);
    const withDraw = computeLiveGroupTable([
      ...base,
      partido("4", "E2", "E2", "E4", "E4", 1, 1, "E", "en_vivo"),
    ]);

    const e4Before = before
      .find((g) => g.groupKey === "E")!
      .teams.find((t) => t.teamId === "E4")!;
    const e4After = withDraw
      .find((g) => g.groupKey === "E")!
      .teams.find((t) => t.teamId === "E4")!;

    expect(e4Before.points).toBe(0);
    expect(e4After.points).toBe(1);
    expect(e4After.points).toBeGreaterThan(e4Before.points);
  });

  it("México pasa de 1º a 2º con resultado en vivo", () => {
    const before = [
      partido("m1", "MEX", "México", "POL", "Polonia", 2, 0, "A", "en_vivo"),
      partido("m2", "ARG", "Argentina", "KSA", "Arabia Saudita", 1, 1, "A"),
    ];
    const after = [
      partido("m1", "MEX", "México", "POL", "Polonia", 2, 2, "A", "en_vivo"),
      partido("m2", "ARG", "Argentina", "KSA", "Arabia Saudita", 2, 1, "A", "en_vivo"),
    ];

    const snapBefore = buildLiveWorldCupSnapshot(before);
    const snapAfter = buildLiveWorldCupSnapshot(after);

    const mexBefore = snapBefore.groups
      .find((g) => g.groupKey === "A")!
      .teams.find((t) => t.teamId === "MEX")!;
    const mexAfter = snapAfter.groups
      .find((g) => g.groupKey === "A")!
      .teams.find((t) => t.teamId === "MEX")!;

    expect(mexBefore.position).toBe(1);
    expect(mexAfter.position).toBe(2);
    expect(describeTeamPosition(snapAfter.groups, "MEX")).toContain("2.º del Grupo A");
  });

  it("tercero provisional aparece en snapshot de mejores terceros", () => {
    const snap = buildLiveWorldCupSnapshot([
      partido("1", "A1", "A1", "A2", "A2", 2, 0, "A"),
      partido("2", "A3", "A3", "A4", "A4", 1, 0, "A", "en_vivo"),
    ]);

    const third = snap.bestThirds.find((t) => t.groupKey === "A");
    expect(third).toBeDefined();
    expect(third!.teamId).toBe("A4");
    expect(snap.r32.isProvisional).toBe(true);
  });

  it("placeholder de rival si Annex C no aplica (<8 terceros)", () => {
    expect(thirdPlaceSlotPlaceholder("A")).toContain("combinación FIFA");
    expect(resolveAnnexCAssignments(["A", "B", "C"])).toBeNull();

    const groups = computeLiveGroupTable([
      partido("1", "A1", "A1", "A2", "A2", 1, 0, "A"),
    ]);
    const bestThirds = buildBestThirdPlacesRanking(groups).map((row, i) => ({
      ...row,
      qualifies: i < 3,
    }));

    const bracket = computeRoundOf32Slots({
      groups,
      bestThirdPlaces: bestThirds,
      partidos: [],
    });

    expect(bracket.scenarioKey).toBeNull();
    const mexSlot = bracket.matches.find((m) => m.matchNumber === 79);
    expect(mexSlot?.away.label).toContain("3.");
    expect(getProvisionalOpponent("A1", bracket)?.opponent.isProvisional).toBe(true);
  });
});
