import { describe, expect, it } from "vitest";
import { kickoffDateInTimezone } from "@/lib/partidos/kickoff-date-key";

describe("kickoffDateInTimezone", () => {
  it("formatea fecha en zona México", () => {
    expect(
      kickoffDateInTimezone("2026-07-01T02:00:00.000Z", "America/Mexico_City"),
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
