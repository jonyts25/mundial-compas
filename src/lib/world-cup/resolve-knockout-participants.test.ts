import { describe, expect, it } from "vitest";
import {
  buildAllKnockoutFixtureRows,
  buildMissingKnockoutFixtureRows,
  validateKnockoutScheduleCounts,
} from "@/lib/world-cup/build-knockout-fixture-rows";
import {
  knockoutMatchIdFromNumber,
  placeholderFixtureId,
} from "@/lib/world-cup/knockout-match-ids";
import {
  areBothTeamsConfirmed,
  isKnockoutPronosticable,
} from "@/lib/world-cup/knockout-participant-utils";
import {
  buildKnockoutParticipantPatches,
  resolveKnockoutParticipants,
} from "@/lib/world-cup/resolve-knockout-participants";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import type { Partido } from "@/types/database";

function finishedGroupMatch(
  grupo: string,
  local: string,
  visitante: string,
  ml: number,
  mv: number,
  id: string,
): PartidoGrupoRow {
  return {
    id,
    fase: "grupos",
    grupo,
    equipo_local_codigo: local,
    equipo_visitante_codigo: visitante,
    equipo_local_nombre: local,
    equipo_visitante_nombre: visitante,
    marcador_local: ml,
    marcador_visitante: mv,
    estatus: "finalizado",
  };
}

function placeholderKnockout(
  matchNumber: number,
  fase: Partido["fase"] = "dieciseisavos",
): Partido {
  return {
    id: `ko-${matchNumber}`,
    fase,
    grupo: null,
    jornada: null,
    sede: "Test",
    equipo_local_codigo: "TBD",
    equipo_visitante_codigo: "TBD2",
    equipo_local_nombre: "Equipo por definir",
    equipo_visitante_nombre: "Equipo por definir",
    fecha_kickoff: "2026-06-28T18:00:00.000Z",
    estatus: "programado",
    marcador_local: null,
    marcador_visitante: null,
    canal_transmision: "sin_asignar",
    minuto_actual: null,
    metadata: { fifa_match_number: matchNumber },
    api_football_fixture_id: placeholderFixtureId(matchNumber),
  } as Partido;
}

describe("knockout fixture seed", () => {
  it("schedule has 32 elimination matches", () => {
    const v = validateKnockoutScheduleCounts();
    expect(v.ok).toBe(true);
    expect(v.total).toBe(32);
  });

  it("buildMissingKnockoutFixtureRows does not duplicate indexed matches", () => {
    const existing = [placeholderKnockout(73), placeholderKnockout(74)];
    const rows = buildMissingKnockoutFixtureRows(existing);
    const nums = rows.map((r) => r.metadata.fifa_match_number);
    expect(nums).not.toContain(73);
    expect(nums).not.toContain(74);
    expect(rows.length).toBe(30);
  });

  it("assigns stable knockout_match_id slots", () => {
    const row = buildAllKnockoutFixtureRows().find(
      (r) => r.metadata.fifa_match_number === 73,
    );
    expect(row?.metadata.knockout_match_id).toBe("r32_01");
    expect(knockoutMatchIdFromNumber(104)).toBe("final");
  });
});

describe("resolveKnockoutParticipants", () => {
  it("fills R32 when group stage data exists", () => {
    const partidosGrupo: PartidoGrupoRow[] = [
      finishedGroupMatch("A", "MEX", "CAN", 2, 0, "g1"),
      finishedGroupMatch("A", "MEX", "KOR", 1, 0, "g2"),
      finishedGroupMatch("A", "MEX", "RSA", 1, 0, "g3"),
      finishedGroupMatch("A", "CAN", "KOR", 0, 0, "g4"),
      finishedGroupMatch("A", "CAN", "RSA", 1, 0, "g5"),
      finishedGroupMatch("A", "KOR", "RSA", 2, 1, "g6"),
    ];
    const knockout = [placeholderKnockout(79)];

    const resolved = resolveKnockoutParticipants({
      partidosGrupo,
      knockoutPartidos: knockout,
    });

    const r32Mex = resolved.find((r) => r.matchNumber === 79);
    expect(r32Mex).toBeDefined();
    expect(
      r32Mex?.home.teamId === "MEX" || r32Mex?.away.teamId === "MEX",
    ).toBe(true);
  });

  it("fills R16 from R32 winner", () => {
    const r32Winner = placeholderKnockout(73);
    r32Winner.equipo_local_codigo = "MEX";
    r32Winner.equipo_visitante_codigo = "BRA";
    r32Winner.equipo_local_nombre = "México";
    r32Winner.equipo_visitante_nombre = "Brasil";
    r32Winner.estatus = "finalizado";
    r32Winner.marcador_local = 2;
    r32Winner.marcador_visitante = 1;

    const r16 = placeholderKnockout(90, "octavos");
    const resolved = resolveKnockoutParticipants({
      partidosGrupo: [],
      knockoutPartidos: [r32Winner, r16],
    });

    const r16Match = resolved.find((r) => r.matchNumber === 90);
    expect(r16Match?.home.teamId === "MEX" || r16Match?.away.teamId === "MEX").toBe(
      true,
    );
  });

  it("fills final from SF winners and third from SF losers", () => {
    const sf1 = placeholderKnockout(101, "semifinal");
    sf1.equipo_local_codigo = "MEX";
    sf1.equipo_visitante_codigo = "ARG";
    sf1.equipo_local_nombre = "México";
    sf1.equipo_visitante_nombre = "Argentina";
    sf1.estatus = "finalizado";
    sf1.marcador_local = 1;
    sf1.marcador_visitante = 0;

    const sf2 = placeholderKnockout(102, "semifinal");
    sf2.equipo_local_codigo = "BRA";
    sf2.equipo_visitante_codigo = "FRA";
    sf2.equipo_local_nombre = "Brasil";
    sf2.equipo_visitante_nombre = "Francia";
    sf2.estatus = "finalizado";
    sf2.marcador_local = 0;
    sf2.marcador_visitante = 1;

    const final = placeholderKnockout(104, "final");
    const third = placeholderKnockout(103, "tercer_lugar");

    const resolved = resolveKnockoutParticipants({
      partidosGrupo: [],
      knockoutPartidos: [sf1, sf2, final, third],
    });

    const finalRow = resolved.find((r) => r.matchNumber === 104);
    const thirdRow = resolved.find((r) => r.matchNumber === 103);

    expect(finalRow?.isDefined).toBe(true);
    expect(finalRow?.home.teamId).toBe("MEX");
    expect(finalRow?.away.teamId).toBe("FRA");

    expect(thirdRow?.isDefined).toBe(true);
    expect(thirdRow?.home.teamId).toBe("ARG");
    expect(thirdRow?.away.teamId).toBe("BRA");
  });
});

describe("quiniela TBD rules", () => {
  it("blocks pronostico when any team is TBD", () => {
    expect(
      isKnockoutPronosticable({
        fase: "octavos",
        equipo_local_codigo: "MEX",
        equipo_visitante_codigo: "TBD",
        equipo_local_nombre: "México",
        equipo_visitante_nombre: "Ganador P89",
      }),
    ).toBe(false);
  });

  it("allows pronostico when both teams confirmed", () => {
    expect(
      areBothTeamsConfirmed({
        equipo_local_codigo: "MEX",
        equipo_visitante_codigo: "BRA",
        equipo_local_nombre: "México",
        equipo_visitante_nombre: "Brasil",
      }),
    ).toBe(true);
    expect(
      isKnockoutPronosticable({
        fase: "octavos",
        equipo_local_codigo: "MEX",
        equipo_visitante_codigo: "BRA",
        equipo_local_nombre: "México",
        equipo_visitante_nombre: "Brasil",
      }),
    ).toBe(true);
  });

  it("buildKnockoutParticipantPatches skips live/finished", () => {
    const live = placeholderKnockout(73);
    live.estatus = "en_vivo";
    const patches = buildKnockoutParticipantPatches([], [live]);
    expect(patches.length).toBe(0);
  });
});
