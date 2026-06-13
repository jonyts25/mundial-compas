import type { R32FixtureDefinition } from "@/lib/standings/knockout-bracket-types";

/** FIFA 2026 round of 32 — matches 73–88 (fixed structure, 3.º via Annex C). */
export const WORLD_CUP_R32_FIXTURES: R32FixtureDefinition[] = [
  {
    matchNumber: 73,
    home: { kind: "group_position", group: "A", position: 2 },
    away: { kind: "group_position", group: "B", position: 2 },
  },
  {
    matchNumber: 74,
    home: { kind: "group_position", group: "E", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "E" },
  },
  {
    matchNumber: 75,
    home: { kind: "group_position", group: "F", position: 1 },
    away: { kind: "group_position", group: "C", position: 2 },
  },
  {
    matchNumber: 76,
    home: { kind: "group_position", group: "C", position: 1 },
    away: { kind: "group_position", group: "F", position: 2 },
  },
  {
    matchNumber: 77,
    home: { kind: "group_position", group: "I", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "I" },
  },
  {
    matchNumber: 78,
    home: { kind: "group_position", group: "E", position: 2 },
    away: { kind: "group_position", group: "I", position: 2 },
  },
  {
    matchNumber: 79,
    home: { kind: "group_position", group: "A", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "A" },
  },
  {
    matchNumber: 80,
    home: { kind: "group_position", group: "L", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "L" },
  },
  {
    matchNumber: 81,
    home: { kind: "group_position", group: "D", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "D" },
  },
  {
    matchNumber: 82,
    home: { kind: "group_position", group: "G", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "G" },
  },
  {
    matchNumber: 83,
    home: { kind: "group_position", group: "K", position: 2 },
    away: { kind: "group_position", group: "L", position: 2 },
  },
  {
    matchNumber: 84,
    home: { kind: "group_position", group: "H", position: 1 },
    away: { kind: "group_position", group: "J", position: 2 },
  },
  {
    matchNumber: 85,
    home: { kind: "group_position", group: "B", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "B" },
  },
  {
    matchNumber: 86,
    home: { kind: "group_position", group: "J", position: 1 },
    away: { kind: "group_position", group: "H", position: 2 },
  },
  {
    matchNumber: 87,
    home: { kind: "group_position", group: "K", position: 1 },
    away: { kind: "third_vs_winner", winnerGroup: "K" },
  },
  {
    matchNumber: 88,
    home: { kind: "group_position", group: "D", position: 2 },
    away: { kind: "group_position", group: "G", position: 2 },
  },
];
