import { describe, expect, it } from "vitest";
import {
  clearLiveNotifyMetadata,
  shouldResetLiveNotifyState,
} from "@/lib/api-football/notify-state-reset";

describe("shouldResetLiveNotifyState", () => {
  it("resetea al aplazar", () => {
    expect(shouldResetLiveNotifyState("en_vivo", "aplazado")).toBe(true);
    expect(shouldResetLiveNotifyState("programado", "aplazado")).toBe(true);
  });

  it("resetea al volver a programado desde en vivo", () => {
    expect(shouldResetLiveNotifyState("en_vivo", "programado")).toBe(true);
    expect(shouldResetLiveNotifyState("medio_tiempo", "programado")).toBe(true);
  });

  it("no resetea transiciones normales en juego", () => {
    expect(shouldResetLiveNotifyState("en_vivo", "medio_tiempo")).toBe(false);
    expect(shouldResetLiveNotifyState("medio_tiempo", "en_vivo")).toBe(false);
    expect(shouldResetLiveNotifyState("en_vivo", "finalizado")).toBe(false);
  });
});

describe("clearLiveNotifyMetadata", () => {
  it("elimina dedup de fases y goles y reinicia reloj a NS", () => {
    const cleared = clearLiveNotifyMetadata({
      announced_phases: ["kickoff"],
      gol_notify_score: { local: 0, away: 0 },
      reloj: { period: "1H", anchorMinute: 12, ticking: true },
      alineaciones: { notifiedAt: "2026-01-01T00:00:00Z" },
    });

    expect(cleared.announced_phases).toBeUndefined();
    expect(cleared.gol_notify_score).toBeUndefined();
    expect(cleared.alineaciones).toBeDefined();
    expect((cleared.reloj as { period: string }).period).toBe("NS");
  });
});
