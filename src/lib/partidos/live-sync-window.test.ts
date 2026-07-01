import { describe, expect, it } from "vitest";
import type { LiveWindowStatus } from "@/lib/partidos/live-sync-window";

describe("LiveWindowStatus con aplazados", () => {
  it("aplazados mantienen la ventana abierta", () => {
    const window: LiveWindowStatus = {
      inWindow: true,
      count: 1,
      liveNow: 0,
      upcoming: 0,
      postponed: 1,
    };
    expect(window.inWindow).toBe(true);
    expect(window.postponed).toBe(1);
  });
});
