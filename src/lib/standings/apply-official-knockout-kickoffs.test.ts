import { describe, expect, it, vi } from "vitest";
import { applyOfficialKnockoutKickoffs } from "@/lib/standings/apply-official-knockout-kickoffs";

function mockSupabase(rows: Array<Record<string, unknown>>) {
  const updates: Array<{ id: string; fecha_kickoff: string }> = [];

  const from = vi.fn(() => {
    const state = { rows };
    return {
      select: vi.fn(() => ({
        neq: vi.fn(() => ({
          in: vi.fn(async () => ({ data: state.rows, error: null })),
        })),
      })),
      update: vi.fn((payload: { fecha_kickoff: string }) => ({
        eq: vi.fn(async (col: string, id: string) => {
          if (col === "id") {
            updates.push({ id, fecha_kickoff: payload.fecha_kickoff });
          }
          return { error: null };
        }),
      })),
    };
  });

  return { client: { from } as never, updates };
}

describe("applyOfficialKnockoutKickoffs", () => {
  it("corrige solo partidos con horario desfasado", async () => {
    const { client, updates } = mockSupabase([
      {
        id: "p103",
        fecha_kickoff: "2026-07-18T23:00:00.000Z",
        estatus: "programado",
        metadata: { fifa_match_number: 103 },
        equipo_local_nombre: "France",
        equipo_visitante_nombre: "England",
      },
      {
        id: "p104",
        fecha_kickoff: "2026-07-19T19:00:00.000Z",
        estatus: "programado",
        metadata: { fifa_match_number: 104 },
        equipo_local_nombre: "Spain",
        equipo_visitante_nombre: "Argentina",
      },
    ]);

    const result = await applyOfficialKnockoutKickoffs(client);

    expect(result.updated).toBe(1);
    expect(result.rows[0]?.fifaMatchNumber).toBe(103);
    expect(result.rows[0]?.to).toBe("2026-07-18T21:00:00.000Z");
    expect(updates).toEqual([
      { id: "p103", fecha_kickoff: "2026-07-18T21:00:00.000Z" },
    ]);
  });
});
