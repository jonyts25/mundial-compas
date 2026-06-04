/** Mundial 2026: 12 grupos de 4 equipos (FIFA). */
export const WORLD_CUP_GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

export type WorldCupGroupLetter = (typeof WORLD_CUP_GROUP_LETTERS)[number];

export const BEST_THIRD_PLACES_QUALIFY_COUNT = 8;

export function isWorldCupGroupLetter(
  value: string | null | undefined,
): value is WorldCupGroupLetter {
  if (!value) return false;
  const u = value.trim().toUpperCase();
  return (WORLD_CUP_GROUP_LETTERS as readonly string[]).includes(u);
}

export function groupLabel(letter: WorldCupGroupLetter): string {
  return `Grupo ${letter}`;
}
