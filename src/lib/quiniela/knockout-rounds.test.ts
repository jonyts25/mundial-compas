import { describe, expect, it } from "vitest";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import {
  computeQuinielaRoundProgress,
  computeQuinielaRoundPoints,
  detectActiveQuinielaPhase,
  groupPartidosByQuinielaRound,
  isGroupStageClosedForQuiniela,
  isKnockoutPhaseStarted,
  orderQuinielaPhases,
  QUINIELA_FASE_ORDER,
  quinielaRoundTitle,
} from "@/lib/quiniela/knockout-rounds";
import { isKnockoutPronosticable } from "@/lib/world-cup/knockout-participant-utils";
import type { FaseMundial, Partido } from "@/types/database";

function partido(
  id: string,
  fase: FaseMundial,
  overrides: Partial<Partido> = {},
): Partido {
  return {
    id,
    fase,
    grupo: fase === "grupos" ? "A" : null,
    jornada: fase === "grupos" ? 1 : null,
    sede: null,
    equipo_local_codigo: "MEX",
    equipo_visitante_codigo: "ARG",
    equipo_local_nombre: "México",
    equipo_visitante_nombre: "Argentina",
    fecha_kickoff: "2026-07-01T00:00:00.000Z",
    estatus: "programado",
    marcador_local: null,
    marcador_visitante: null,
    canal_transmision: "vix",
    minuto_actual: null,
    metadata: null,
    ...overrides,
  };
}

describe("quiniela knockout rounds", () => {
  it("ordena todas las rondas eliminatorias en secuencia FIFA", () => {
    expect(QUINIELA_FASE_ORDER).toEqual([
      "grupos",
      "dieciseisavos",
      "octavos",
      "cuartos",
      "semifinal",
      "tercer_lugar",
      "final",
    ]);
  });

  it("usa títulos de ronda legibles", () => {
    expect(quinielaRoundTitle("dieciseisavos")).toBe("Ronda de 32");
    expect(quinielaRoundTitle("octavos")).toBe("Octavos");
    expect(quinielaRoundTitle("tercer_lugar")).toBe("Tercer lugar");
  });

  it("detecta eliminatoria iniciada cuando hay KO en curso o finalizado", () => {
    const nowMs = Date.parse("2026-06-28T12:00:00.000Z");
    const partidos = [
      partido("g1", "grupos", { estatus: "finalizado" }),
      partido("r32", "dieciseisavos", { estatus: "en_vivo" }),
    ];
    expect(isKnockoutPhaseStarted(partidos, nowMs)).toBe(true);
  });

  it("prioriza ronda de 32 cuando la eliminatoria ya arrancó", () => {
    const nowMs = Date.parse("2026-06-28T12:00:00.000Z");
    const partidos = [
      partido("g1", "grupos", {
        estatus: "finalizado",
        fecha_kickoff: "2026-06-20T00:00:00.000Z",
      }),
      partido("r32", "dieciseisavos", {
        estatus: "programado",
        fecha_kickoff: "2026-06-29T00:00:00.000Z",
      }),
      partido("r16", "octavos", {
        estatus: "programado",
        equipo_local_codigo: "TBD",
        equipo_visitante_codigo: "TBD",
        equipo_local_nombre: "Ganador P74",
        equipo_visitante_nombre: "Ganador P77",
        fecha_kickoff: "2026-07-05T00:00:00.000Z",
      }),
    ];

    expect(detectActiveQuinielaPhase(partidos, nowMs)).toBe("dieciseisavos");
    expect(orderQuinielaPhases(["grupos", "dieciseisavos", "octavos"], "dieciseisavos")).toEqual([
      "dieciseisavos",
      "octavos",
      "grupos",
    ]);
  });

  it("calcula progreso solo con partidos pronosticables", () => {
    const partidos = [
      partido("r32-1", "dieciseisavos"),
      partido("r32-2", "dieciseisavos"),
      partido("r16", "octavos", {
        equipo_local_codigo: "TBD",
        equipo_visitante_codigo: "TBD",
        equipo_local_nombre: "Ganador P73",
        equipo_visitante_nombre: "Ganador P75",
      }),
    ];

    expect(computeQuinielaRoundProgress(partidos.slice(0, 2), { "r32-1": true })).toEqual({
      saved: 1,
      total: 2,
    });
    expect(isKnockoutPronosticable(partidos[2]!)).toBe(false);
  });

  it("suma puntos de la ronda desde pronósticos enriquecidos", () => {
    const partidos = [
      partido("r32-1", "dieciseisavos"),
      partido("r32-2", "dieciseisavos"),
    ];

    expect(
      computeQuinielaRoundPoints(partidos, {
        "r32-1": { puntos: 3 },
        "r32-2": { puntos: 1 },
      }),
    ).toBe(4);
  });

  it("agrupa por ronda y muestra awaiting_teams para octavos TBD", () => {
    const nowMs = Date.parse("2026-06-28T12:00:00.000Z");
    const partidos = [
      partido("r32", "dieciseisavos"),
      partido("r16", "octavos", {
        equipo_local_codigo: "TBD",
        equipo_visitante_codigo: "TBD",
        equipo_local_nombre: "Ganador P74",
        equipo_visitante_nombre: "Ganador P77",
      }),
    ];

    const groups = groupPartidosByQuinielaRound({
      partidos,
      filteredPartidos: partidos.filter((p) => isKnockoutPronosticable(p)),
      pronosticosPorPartido: {},
      nowMs,
    });

    const r32 = groups.find((g) => g.fase === "dieciseisavos");
    const r16 = groups.find((g) => g.fase === "octavos");
    expect(r32?.visibility).toBe("open");
    expect(r16?.visibility).toBe("awaiting_teams");
  });

  it("respeta bloqueo por kickoff", () => {
    const kickoff = "2026-06-01T00:00:00.000Z";
    const nowMs = Date.parse("2026-06-02T00:00:00.000Z");
    expect(isPronosticoLocked(kickoff, nowMs)).toBe(true);
  });

  it("cierra fase de grupos cuando todos los partidos terminaron o cerraron", () => {
    const nowMs = Date.parse("2026-06-28T12:00:00.000Z");
    const partidos = [
      partido("g1", "grupos", { estatus: "finalizado" }),
      partido("g2", "grupos", {
        estatus: "programado",
        fecha_kickoff: "2026-06-01T00:00:00.000Z",
      }),
    ];
    expect(isGroupStageClosedForQuiniela(partidos, nowMs)).toBe(true);
  });

  it("cubre todas las rondas eliminatorias en agrupación", () => {
    const nowMs = Date.parse("2026-07-20T00:00:00.000Z");
    const fases: FaseMundial[] = [
      "grupos",
      "dieciseisavos",
      "octavos",
      "cuartos",
      "semifinal",
      "tercer_lugar",
      "final",
    ];
    const partidos = fases.map((fase, i) => partido(`m-${fase}`, fase, { id: `m-${i}` }));

    const groups = groupPartidosByQuinielaRound({
      partidos,
      filteredPartidos: partidos,
      pronosticosPorPartido: {},
      nowMs,
    });

    expect(groups).toHaveLength(fases.length);
    expect(groups.map((g) => g.fase).sort()).toEqual([...fases].sort());
  });
});
