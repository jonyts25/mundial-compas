import { describe, expect, it, vi } from "vitest";
import { notifyPhaseTransitions } from "@/lib/api-football/handlers/phase-sync";

function mockSupabase() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  return {
    from: vi.fn(() => ({
      insert,
    })),
  };
}

vi.mock("@/lib/api-football/push/claim-event", () => ({
  tryClaimLiveEvent: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/api-football/push/notifications", () => ({
  queuePartidoPushNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/datos-mamalones/pick", () => ({
  pickDatoMamalonVariado: vi.fn().mockResolvedValue(null),
  formatVarDatoMamalonMessage: vi.fn(),
}));

describe("notifyPhaseTransitions kickoff on late sync", () => {
  it("notifica inicio cuando el partido pasa de programado a 2H sin baseline previo", async () => {
    const supabase = mockSupabase();
    const result = await notifyPhaseTransitions({
      supabase: supabase as never,
      partidoId: "partido-1",
      local: "Spain",
      visitante: "Austria",
      fase: "octavos",
      estatus: "en_vivo",
      prevEstatus: "programado",
      homeScore: 0,
      awayScore: 0,
      prevMetadata: {},
      newRelojMetadata: { period: "2H", display: "45'" },
      statusShort: "2H",
    });

    expect(result.notified).toContain("kickoff");
  });

  it("no re-notifica kickoff si el partido ya estaba en vivo al recargar metadata", async () => {
    const supabase = mockSupabase();
    const result = await notifyPhaseTransitions({
      supabase: supabase as never,
      partidoId: "partido-1",
      local: "Spain",
      visitante: "Austria",
      fase: "octavos",
      estatus: "en_vivo",
      prevEstatus: "en_vivo",
      homeScore: 1,
      awayScore: 0,
      prevMetadata: {},
      newRelojMetadata: { period: "2H", display: "67'" },
      statusShort: "2H",
    });

    expect(result.notified).not.toContain("kickoff");
  });
});
