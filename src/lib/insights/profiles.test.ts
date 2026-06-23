import { describe, expect, it } from "vitest";
import {
  computeUserProfile,
  profileThresholds,
  type ProfileMetrics,
} from "@/lib/insights/profiles";

function metrics(partial: Partial<ProfileMetrics>): ProfileMetrics {
  return {
    N: 10,
    P: 10,
    exactos: 2,
    tendencias: 6,
    exactRate: 0.2,
    hitRate: 0.6,
    precision: 0.5,
    drawRate: 0.1,
    minorityRate: 0.2,
    exactStreak: 0,
    ...partial,
  };
}

describe("perfiles de pronosticador", () => {
  it("Novato con muestra insuficiente", () => {
    const p = computeUserProfile(metrics({ N: 2, P: 2 }));
    expect(p.primary.id).toBe("novato");
    expect(p.sampleOk).toBe(false);
  });

  it("Francotirador por exactRate alto", () => {
    const p = computeUserProfile(
      metrics({
        exactRate: profileThresholds.francotiradorExactRate + 0.05,
        hitRate: 0.5,
      }),
    );
    expect(p.primary.id).toBe("francotirador");
  });

  it("Brújula — hit alto, exact bajo", () => {
    const p = computeUserProfile(
      metrics({
        hitRate: profileThresholds.brujulaHitRate + 0.05,
        exactRate: profileThresholds.brujulaMaxExactRate - 0.05,
      }),
    );
    expect(p.primary.id).toBe("brujula");
  });

  it("Apostador Diferencial", () => {
    const p = computeUserProfile(
      metrics({
        minorityRate: profileThresholds.diferencialMinorityRate + 0.1,
        exactRate: 0.05,
        hitRate: 0.4,
      }),
    );
    expect(p.primary.id).toBe("diferencial");
  });

  it("Amante del Empate", () => {
    const p = computeUserProfile(
      metrics({
        drawRate: profileThresholds.amanteEmpateDrawRate + 0.1,
        exactRate: 0.05,
        hitRate: 0.4,
        minorityRate: 0.1,
      }),
    );
    expect(p.primary.id).toBe("amante_empate");
  });

  it("En Racha — prioridad cuando no compite francotirador", () => {
    const p = computeUserProfile(
      metrics({
        exactStreak: profileThresholds.enRachaExactStreak + 1,
        exactRate: profileThresholds.francotiradorExactRate - 0.1,
        hitRate: 0.4,
        minorityRate: 0.1,
        drawRate: 0.1,
      }),
    );
    expect(p.primary.id).toBe("en_racha");
  });

  it("Equilibrado fallback sin reglas fuertes", () => {
    const p = computeUserProfile(
      metrics({
        exactRate: 0.1,
        hitRate: 0.45,
        drawRate: 0.1,
        minorityRate: 0.1,
        exactStreak: 0,
      }),
    );
    expect(p.primary.id).toBe("equilibrado");
  });
});
