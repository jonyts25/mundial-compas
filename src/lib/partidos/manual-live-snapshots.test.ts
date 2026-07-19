import { describe, expect, it } from "vitest";
import {
  applyManualLiveSnapshots,
  MANUAL_LIVE_SNAPSHOTS,
} from "@/lib/partidos/manual-live-snapshots";

describe("MANUAL_LIVE_SNAPSHOTS M103", () => {
  it("tiene resultado final 4-6 (Francia-Inglaterra)", () => {
    const m103 = MANUAL_LIVE_SNAPSHOTS.find((s) => s.fifaMatchNumber === 103);
    expect(m103).toBeDefined();
    expect(m103!.marcadorLocal).toBe(4);
    expect(m103!.marcadorVisitante).toBe(6);
    expect(m103!.estatus).toBe("finalizado");
    expect(m103!.eventosClave.filter((e) => e.tipo === "gol")).toHaveLength(10);
  });
});

describe("MANUAL_LIVE_SNAPSHOTS M104", () => {
  it("tiene resultado final 1-0 (España-Argentina, prórroga)", () => {
    const m104 = MANUAL_LIVE_SNAPSHOTS.find((s) => s.fifaMatchNumber === 104);
    expect(m104).toBeDefined();
    expect(m104!.marcadorLocal).toBe(1);
    expect(m104!.marcadorVisitante).toBe(0);
    expect(m104!.estatus).toBe("finalizado");
    expect(m104!.reloj.period).toBe("AET");
  });
});

describe("applyManualLiveSnapshots", () => {
  it("aplica snapshot y evita duplicados", async () => {
    const rows = new Map([
      [
        "p103",
        {
          id: "p103",
          estatus: "programado",
          marcador_local: null,
          marcador_visitante: null,
          metadata: { fifa_match_number: 103 },
        },
      ],
    ]);

    const supabase = {
      from: () => ({
        select: () => ({
          eq: (_col: string, val: number) => ({
            maybeSingle: async () => ({
              data:
                val === 9_000_103
                  ? rows.get("p103") ?? null
                  : null,
              error: null,
            }),
          }),
          filter: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => {
            const row = rows.get(id);
            if (row) Object.assign(row, patch);
            return Promise.resolve({ error: null });
          },
        }),
      }),
    };

    const first = await applyManualLiveSnapshots(
      supabase as never,
      [MANUAL_LIVE_SNAPSHOTS[0]!],
    );
    expect(first.applied).toBe(1);
    expect(rows.get("p103")!.marcador_visitante).toBe(6);
    expect(rows.get("p103")!.estatus).toBe("finalizado");

    const second = await applyManualLiveSnapshots(
      supabase as never,
      [MANUAL_LIVE_SNAPSHOTS[0]!],
    );
    expect(second.skipped).toBe(1);
    expect(second.applied).toBe(0);
  });
});
