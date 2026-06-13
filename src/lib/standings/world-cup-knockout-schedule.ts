import type { R32Slot } from "@/lib/standings/knockout-bracket-types";

export type KnockoutPhaseId =
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final";

export type KnockoutFeedSlot =
  | R32Slot
  | { kind: "winner"; matchNumber: number }
  | { kind: "loser"; matchNumber: number };

export interface KnockoutScheduleEntry {
  matchNumber: number;
  phase: KnockoutPhaseId;
  /** YYYY-MM-DD (calendario FIFA, hora desde BD si existe). */
  date: string;
  venue: string;
  home: KnockoutFeedSlot;
  away: KnockoutFeedSlot;
}

/** Calendario y emparejamientos FIFA 2026 — partidos 73–104. */
export const WORLD_CUP_KNOCKOUT_SCHEDULE: KnockoutScheduleEntry[] = [
  {
    matchNumber: 73,
    phase: "r32",
    date: "2026-06-28",
    venue: "SoFi Stadium, Inglewood",
    home: { kind: "group_position", group: "A", position: 2 },
    away: { kind: "group_position", group: "B", position: 2 },
  },
  {
    matchNumber: 74,
    phase: "r32",
    date: "2026-06-29",
    venue: "Gillette Stadium, Foxborough",
    home: { kind: "group_position", group: "E", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "E" },
  },
  {
    matchNumber: 75,
    phase: "r32",
    date: "2026-06-29",
    venue: "Estadio BBVA, Guadalupe",
    home: { kind: "group_position", group: "F", position: 1 },
    away: { kind: "group_position", group: "C", position: 2 },
  },
  {
    matchNumber: 76,
    phase: "r32",
    date: "2026-06-29",
    venue: "NRG Stadium, Houston",
    home: { kind: "group_position", group: "C", position: 1 },
    away: { kind: "group_position", group: "F", position: 2 },
  },
  {
    matchNumber: 77,
    phase: "r32",
    date: "2026-06-30",
    venue: "MetLife Stadium, East Rutherford",
    home: { kind: "group_position", group: "I", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "I" },
  },
  {
    matchNumber: 78,
    phase: "r32",
    date: "2026-06-30",
    venue: "AT&T Stadium, Arlington",
    home: { kind: "group_position", group: "E", position: 2 },
    away: { kind: "group_position", group: "I", position: 2 },
  },
  {
    matchNumber: 79,
    phase: "r32",
    date: "2026-06-30",
    venue: "Estadio Azteca, Ciudad de México",
    home: { kind: "group_position", group: "A", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "A" },
  },
  {
    matchNumber: 80,
    phase: "r32",
    date: "2026-07-01",
    venue: "Mercedes-Benz Stadium, Atlanta",
    home: { kind: "group_position", group: "L", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "L" },
  },
  {
    matchNumber: 81,
    phase: "r32",
    date: "2026-07-01",
    venue: "Levi's Stadium, Santa Clara",
    home: { kind: "group_position", group: "D", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "D" },
  },
  {
    matchNumber: 82,
    phase: "r32",
    date: "2026-07-01",
    venue: "Lumen Field, Seattle",
    home: { kind: "group_position", group: "G", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "G" },
  },
  {
    matchNumber: 83,
    phase: "r32",
    date: "2026-07-02",
    venue: "BMO Field, Toronto",
    home: { kind: "group_position", group: "K", position: 2 },
    away: { kind: "group_position", group: "L", position: 2 },
  },
  {
    matchNumber: 84,
    phase: "r32",
    date: "2026-07-02",
    venue: "SoFi Stadium, Inglewood",
    home: { kind: "group_position", group: "H", position: 1 },
    away: { kind: "group_position", group: "J", position: 2 },
  },
  {
    matchNumber: 85,
    phase: "r32",
    date: "2026-07-02",
    venue: "BC Place, Vancouver",
    home: { kind: "group_position", group: "B", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "B" },
  },
  {
    matchNumber: 86,
    phase: "r32",
    date: "2026-07-03",
    venue: "Hard Rock Stadium, Miami Gardens",
    home: { kind: "group_position", group: "J", position: 1 },
    away: { kind: "group_position", group: "H", position: 2 },
  },
  {
    matchNumber: 87,
    phase: "r32",
    date: "2026-07-03",
    venue: "Arrowhead Stadium, Kansas City",
    home: { kind: "group_position", group: "K", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "K" },
  },
  {
    matchNumber: 88,
    phase: "r32",
    date: "2026-07-03",
    venue: "AT&T Stadium, Arlington",
    home: { kind: "group_position", group: "D", position: 2 },
    away: { kind: "group_position", group: "G", position: 2 },
  },
  {
    matchNumber: 89,
    phase: "r16",
    date: "2026-07-04",
    venue: "Lincoln Financial Field, Philadelphia",
    home: { kind: "winner", matchNumber: 74 },
    away: { kind: "winner", matchNumber: 77 },
  },
  {
    matchNumber: 90,
    phase: "r16",
    date: "2026-07-04",
    venue: "NRG Stadium, Houston",
    home: { kind: "winner", matchNumber: 73 },
    away: { kind: "winner", matchNumber: 75 },
  },
  {
    matchNumber: 91,
    phase: "r16",
    date: "2026-07-05",
    venue: "MetLife Stadium, East Rutherford",
    home: { kind: "winner", matchNumber: 76 },
    away: { kind: "winner", matchNumber: 78 },
  },
  {
    matchNumber: 92,
    phase: "r16",
    date: "2026-07-05",
    venue: "Estadio Azteca, Ciudad de México",
    home: { kind: "winner", matchNumber: 79 },
    away: { kind: "winner", matchNumber: 80 },
  },
  {
    matchNumber: 93,
    phase: "r16",
    date: "2026-07-06",
    venue: "AT&T Stadium, Arlington",
    home: { kind: "winner", matchNumber: 83 },
    away: { kind: "winner", matchNumber: 84 },
  },
  {
    matchNumber: 94,
    phase: "r16",
    date: "2026-07-06",
    venue: "Lumen Field, Seattle",
    home: { kind: "winner", matchNumber: 81 },
    away: { kind: "winner", matchNumber: 82 },
  },
  {
    matchNumber: 95,
    phase: "r16",
    date: "2026-07-07",
    venue: "Mercedes-Benz Stadium, Atlanta",
    home: { kind: "winner", matchNumber: 86 },
    away: { kind: "winner", matchNumber: 88 },
  },
  {
    matchNumber: 96,
    phase: "r16",
    date: "2026-07-07",
    venue: "BC Place, Vancouver",
    home: { kind: "winner", matchNumber: 85 },
    away: { kind: "winner", matchNumber: 87 },
  },
  {
    matchNumber: 97,
    phase: "qf",
    date: "2026-07-09",
    venue: "Gillette Stadium, Foxborough",
    home: { kind: "winner", matchNumber: 89 },
    away: { kind: "winner", matchNumber: 90 },
  },
  {
    matchNumber: 98,
    phase: "qf",
    date: "2026-07-10",
    venue: "SoFi Stadium, Inglewood",
    home: { kind: "winner", matchNumber: 93 },
    away: { kind: "winner", matchNumber: 94 },
  },
  {
    matchNumber: 99,
    phase: "qf",
    date: "2026-07-11",
    venue: "Hard Rock Stadium, Miami Gardens",
    home: { kind: "winner", matchNumber: 91 },
    away: { kind: "winner", matchNumber: 92 },
  },
  {
    matchNumber: 100,
    phase: "qf",
    date: "2026-07-11",
    venue: "Arrowhead Stadium, Kansas City",
    home: { kind: "winner", matchNumber: 95 },
    away: { kind: "winner", matchNumber: 96 },
  },
  {
    matchNumber: 101,
    phase: "sf",
    date: "2026-07-14",
    venue: "AT&T Stadium, Arlington",
    home: { kind: "winner", matchNumber: 97 },
    away: { kind: "winner", matchNumber: 98 },
  },
  {
    matchNumber: 102,
    phase: "sf",
    date: "2026-07-15",
    venue: "Mercedes-Benz Stadium, Atlanta",
    home: { kind: "winner", matchNumber: 99 },
    away: { kind: "winner", matchNumber: 100 },
  },
  {
    matchNumber: 103,
    phase: "third",
    date: "2026-07-18",
    venue: "Hard Rock Stadium, Miami Gardens",
    home: { kind: "loser", matchNumber: 101 },
    away: { kind: "loser", matchNumber: 102 },
  },
  {
    matchNumber: 104,
    phase: "final",
    date: "2026-07-19",
    venue: "MetLife Stadium, East Rutherford",
    home: { kind: "winner", matchNumber: 101 },
    away: { kind: "winner", matchNumber: 102 },
  },
];

export const KNOCKOUT_SCHEDULE_BY_MATCH = Object.fromEntries(
  WORLD_CUP_KNOCKOUT_SCHEDULE.map((entry) => [entry.matchNumber, entry]),
) as Record<number, KnockoutScheduleEntry>;

export const KNOCKOUT_PHASE_LABELS: Record<KnockoutPhaseId, string> = {
  r32: "Ronda de 32",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinal",
  third: "3.er lugar",
  final: "Final",
};
