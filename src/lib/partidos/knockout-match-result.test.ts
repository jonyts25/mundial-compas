import { describe, expect, it } from "vitest";
import { resolveKnockoutSideWinner } from "@/lib/partidos/knockout-match-result";

function partido(
  overrides: Partial<{
    estatus: "finalizado" | "en_vivo";
    marcador_local: number;
    marcador_visitante: number;
    metadata: Record<string, unknown>;
  }> = {},
) {
  return {
    estatus: "finalizado" as const,
    marcador_local: 1,
    marcador_visitante: 0,
    equipo_local_codigo: "MEX",
    equipo_visitante_codigo: "BRA",
    equipo_local_nombre: "México",
    equipo_visitante_nombre: "Brasil",
    metadata: {},
    ...overrides,
  };
}

describe("resolveKnockoutSideWinner", () => {
  it("returns home winner on regulation win", () => {
    const p = partido({ marcador_local: 2, marcador_visitante: 1 });
    expect(resolveKnockoutSideWinner(p, "home")).toEqual({
      teamId: "MEX",
      teamName: "México",
    });
    expect(resolveKnockoutSideWinner(p, "away")).toBeNull();
  });

  it("returns away winner on regulation win", () => {
    const p = partido({ marcador_local: 0, marcador_visitante: 1 });
    expect(resolveKnockoutSideWinner(p, "away")).toEqual({
      teamId: "BRA",
      teamName: "Brasil",
    });
    expect(resolveKnockoutSideWinner(p, "home")).toBeNull();
  });

  it("returns null on regulation draw without penalties", () => {
    const p = partido({ marcador_local: 1, marcador_visitante: 1 });
    expect(resolveKnockoutSideWinner(p, "home")).toBeNull();
    expect(resolveKnockoutSideWinner(p, "away")).toBeNull();
  });

  it("resolves home winner after penalty shootout", () => {
    const p = partido({
      marcador_local: 1,
      marcador_visitante: 1,
      metadata: {
        marcador_penales_local: 4,
        marcador_penales_visitante: 3,
      },
    });
    expect(resolveKnockoutSideWinner(p, "home")).toEqual({
      teamId: "MEX",
      teamName: "México",
    });
    expect(resolveKnockoutSideWinner(p, "away")).toBeNull();
  });

  it("resolves away winner after penalty shootout", () => {
    const p = partido({
      marcador_local: 2,
      marcador_visitante: 2,
      metadata: {
        marcador_penales_local: 3,
        marcador_penales_visitante: 5,
      },
    });
    expect(resolveKnockoutSideWinner(p, "away")).toEqual({
      teamId: "BRA",
      teamName: "Brasil",
    });
    expect(resolveKnockoutSideWinner(p, "home")).toBeNull();
  });

  it("returns null when penalty shootout is tied", () => {
    const p = partido({
      marcador_local: 0,
      marcador_visitante: 0,
      metadata: {
        marcador_penales_local: 2,
        marcador_penales_visitante: 2,
      },
    });
    expect(resolveKnockoutSideWinner(p, "home")).toBeNull();
    expect(resolveKnockoutSideWinner(p, "away")).toBeNull();
  });

  it("falls back to pen_notify_score when marcador_penales is missing", () => {
    const p = partido({
      marcador_local: 1,
      marcador_visitante: 1,
      metadata: {
        pen_notify_score: { local: 5, away: 4 },
      },
    });
    expect(resolveKnockoutSideWinner(p, "home")).toEqual({
      teamId: "MEX",
      teamName: "México",
    });
  });
});
