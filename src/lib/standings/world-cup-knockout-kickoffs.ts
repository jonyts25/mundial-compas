/**
 * Horarios oficiales FIFA 2026 (UTC) — knockout partidos 73–104.
 * Fuente: calendario publicado (kickoff UTC / sede local).
 * Evita el default 12:00 CDMX de placeholders.
 */
export const KNOCKOUT_KICKOFF_UTC_ISO: Record<number, string> = {
  // Ronda de 32
  73: "2026-06-28T19:00:00.000Z", // 12:00 PT / 13:00 CDMX — SoFi
  74: "2026-06-29T20:30:00.000Z", // Foxborough
  75: "2026-06-30T01:00:00.000Z", // Monterrey (noche 29 jun)
  76: "2026-06-29T17:00:00.000Z", // Houston
  77: "2026-06-30T21:00:00.000Z", // MetLife
  78: "2026-06-30T17:00:00.000Z", // Arlington
  79: "2026-07-01T01:00:00.000Z", // Azteca (noche 30 jun)
  80: "2026-07-01T16:00:00.000Z", // Atlanta
  81: "2026-07-02T00:00:00.000Z", // Santa Clara (noche 1 jul)
  82: "2026-07-01T20:00:00.000Z", // Seattle
  83: "2026-07-02T23:00:00.000Z", // Toronto
  84: "2026-07-02T19:00:00.000Z", // SoFi
  85: "2026-07-03T03:00:00.000Z", // Vancouver (noche 2 jul)
  86: "2026-07-03T18:00:00.000Z", // Miami
  87: "2026-07-04T01:30:00.000Z", // Kansas City (noche 3 jul)
  88: "2026-07-03T22:00:00.000Z", // Arlington
  // Octavos
  89: "2026-07-04T21:00:00.000Z", // Philadelphia
  90: "2026-07-04T17:00:00.000Z", // Houston
  91: "2026-07-05T20:00:00.000Z", // MetLife
  92: "2026-07-06T00:00:00.000Z", // Azteca
  93: "2026-07-06T19:00:00.000Z", // Arlington
  94: "2026-07-07T00:00:00.000Z", // Seattle
  95: "2026-07-07T16:00:00.000Z", // Atlanta
  96: "2026-07-07T20:00:00.000Z", // Vancouver
  // Cuartos
  97: "2026-07-09T22:00:00.000Z", // Foxborough
  98: "2026-07-10T19:00:00.000Z", // SoFi
  99: "2026-07-11T20:00:00.000Z", // Miami
  100: "2026-07-11T23:00:00.000Z", // Kansas City
  // Semifinales — 15:00 ET = 13:00 CDMX
  101: "2026-07-14T19:00:00.000Z", // Arlington
  102: "2026-07-15T19:00:00.000Z", // Atlanta
  // Tercer lugar + Final
  103: "2026-07-18T23:00:00.000Z", // Miami
  104: "2026-07-19T22:00:00.000Z", // MetLife
};

export function knockoutKickoffIso(matchNumber: number, fallbackDate: string): string {
  return (
    KNOCKOUT_KICKOFF_UTC_ISO[matchNumber] ??
    `${fallbackDate}T18:00:00.000Z`
  );
}
