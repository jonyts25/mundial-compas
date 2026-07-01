import { describe, expect, it } from "vitest";
import { shouldSyncKickoffFromApi } from "@/lib/partidos/kickoff-sync";

describe("shouldSyncKickoffFromApi", () => {
  const stored = "2026-06-18T20:00:00.000Z";

  it("sincroniza cuando aplazado y la API trae nueva fecha", () => {
    expect(
      shouldSyncKickoffFromApi(
        "aplazado",
        stored,
        "2026-06-20T20:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("no sincroniza en partido en vivo", () => {
    expect(
      shouldSyncKickoffFromApi(
        "en_vivo",
        stored,
        "2026-06-20T20:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("ignora diferencias menores a 1 minuto", () => {
    expect(
      shouldSyncKickoffFromApi(
        "programado",
        stored,
        "2026-06-18T20:00:30.000Z",
      ),
    ).toBe(false);
  });
});
