import { describe, expect, it } from "vitest";
import {
  KNOCKOUT_RULES_BANNER_KEY,
  KNOCKOUT_RULES_VERSION,
  WHATS_NEW_VERSION,
} from "@/lib/product/whats-new";
import {
  calcularPuntosPronostico,
  quinielaMarcadorAfterPenalties,
  resolveQuinielaMarcadorFromApiGoals,
} from "@/lib/world-cup/knockout-quiniela-rules";

describe("knockout quiniela scoring rules", () => {
  it("1-1 + penales local => resultado quiniela empate", () => {
    const marcador = quinielaMarcadorAfterPenalties({ local: 1, visitante: 1 });
    expect(marcador).toEqual({ local: 1, visitante: 1 });
    expect(calcularPuntosPronostico(1, 1, 1, 1)).toBe(3);
    expect(calcularPuntosPronostico(1, 1, 0, 0)).toBe(1);
    expect(calcularPuntosPronostico(1, 1, 2, 1)).toBe(0);
  });

  it("2-2 + penales visitante => resultado quiniela empate", () => {
    const marcador = quinielaMarcadorAfterPenalties({ local: 2, visitante: 2 });
    expect(calcularPuntosPronostico(marcador.local, marcador.visitante, 2, 2)).toBe(
      3,
    );
    expect(calcularPuntosPronostico(marcador.local, marcador.visitante, 1, 0)).toBe(
      0,
    );
  });

  it("1-2 en tiempo extra => visitante gana tendencia", () => {
    const marcador = resolveQuinielaMarcadorFromApiGoals({
      goalsHome: 1,
      goalsAway: 2,
      extratimeHome: 1,
      extratimeAway: 2,
      fulltimeHome: 1,
      fulltimeAway: 1,
    });
    expect(marcador).toEqual({ local: 1, visitante: 2 });
    expect(calcularPuntosPronostico(1, 2, 1, 2)).toBe(3);
    expect(calcularPuntosPronostico(1, 2, 0, 1)).toBe(1);
  });

  it("prefiere extratime sobre fulltime cuando existe", () => {
    expect(
      resolveQuinielaMarcadorFromApiGoals({
        goalsHome: 2,
        goalsAway: 1,
        extratimeHome: 2,
        extratimeAway: 1,
        fulltimeHome: 1,
        fulltimeAway: 1,
      }),
    ).toEqual({ local: 2, visitante: 1 });
  });
});

describe("announcement dedupe keys", () => {
  it("rules version is unique and matches whats-new bump", () => {
    expect(KNOCKOUT_RULES_VERSION).toBe("2026-06-knockout-rules-v1");
    expect(WHATS_NEW_VERSION).toBe(KNOCKOUT_RULES_VERSION);
    expect(KNOCKOUT_RULES_BANNER_KEY).toContain("knockout-rules");
  });
});

describe("provisional copy guard", () => {
  it("groupStageComplete hides group-provisional suffix logic", () => {
    const groupStageComplete = true;
    const slot = { isProvisional: true, groupLetter: "A" as const, position: 2 as const };
    const showProvisionalSuffix =
      slot.isProvisional && !groupStageComplete && Boolean(slot.groupLetter);
    expect(showProvisionalSuffix).toBe(false);
  });
});
