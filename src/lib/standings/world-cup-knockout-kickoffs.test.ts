import { describe, expect, it } from "vitest";
import { isPronosticoLocked } from "@/lib/quiniela/lock";
import { formatMexicoKickoff } from "@/lib/datetime/mexico";
import { KNOCKOUT_KICKOFF_UTC_ISO } from "@/lib/standings/world-cup-knockout-kickoffs";

describe("world-cup-knockout-kickoffs", () => {
  it("P73 hoy: 13:00 CDMX (no mediodía placeholder)", () => {
    const iso = KNOCKOUT_KICKOFF_UTC_ISO[73]!;
    const { hora } = formatMexicoKickoff(iso);
    expect(iso).toBe("2026-06-28T19:00:00.000Z");
    expect(hora).toMatch(/1:00/);
  });

  it("P73 quiniela abierta hasta ~12:55 CDMX", () => {
    const iso = KNOCKOUT_KICKOFF_UTC_ISO[73]!;
    const noonMexico = Date.parse("2026-06-28T18:00:00.000Z"); // 12:00 CDMX
    const onePmMexico = Date.parse("2026-06-28T19:00:00.000Z"); // 13:00 CDMX
    expect(isPronosticoLocked(iso, noonMexico)).toBe(false);
    expect(isPronosticoLocked(iso, onePmMexico)).toBe(true);
  });

  it("define las 32 eliminatorias", () => {
    for (let m = 73; m <= 104; m++) {
      expect(KNOCKOUT_KICKOFF_UTC_ISO[m]).toBeTruthy();
    }
  });

  it("semifinales: 13:00 CDMX (15:00 ET)", () => {
    for (const m of [101, 102] as const) {
      const iso = KNOCKOUT_KICKOFF_UTC_ISO[m]!;
      const { hora } = formatMexicoKickoff(iso);
      expect(hora).toMatch(/1:00/);
      expect(iso.endsWith("T19:00:00.000Z")).toBe(true);
    }
  });

  it("tercer lugar: 15:00 CDMX (17:00 ET)", () => {
    const iso = KNOCKOUT_KICKOFF_UTC_ISO[103]!;
    const { hora } = formatMexicoKickoff(iso);
    expect(iso).toBe("2026-07-18T21:00:00.000Z");
    expect(hora).toMatch(/3:00/);
  });

  it("final: 13:00 CDMX (15:00 ET)", () => {
    const iso = KNOCKOUT_KICKOFF_UTC_ISO[104]!;
    const { hora } = formatMexicoKickoff(iso);
    expect(iso).toBe("2026-07-19T19:00:00.000Z");
    expect(hora).toMatch(/1:00/);
  });
});
