import fs from "fs";

const inputPath =
  "C:/Users/needs/.cursor/projects/d-Proyectos-mundial-compas/agent-tools/f555adea-793a-4928-9191-a2ab27aa16c7.txt";
const outputPath = "src/lib/standings/world-cup-third-place-scenarios.ts";

const text = fs.readFileSync(inputPath, "utf8");
const rows = [];

for (const line of text.split("\n")) {
  const parts = line
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length !== 17 || !/^\d+$/.test(parts[0])) continue;

  const qual = parts.slice(1, 9);
  const assignRaw = parts.slice(9, 17);
  if (!qual.every((g) => /^[A-L]$/.test(g))) continue;
  if (!assignRaw.every((g) => /^3[A-L]$/.test(g))) continue;

  const a = assignRaw.map((s) => s.slice(1));
  rows.push({
    key: [...qual].sort().join(""),
    a: a[0],
    b: a[1],
    d: a[2],
    e: a[3],
    g: a[4],
    i: a[5],
    k: a[6],
    l: a[7],
  });
}

const header = `import type { WorldCupGroupLetter } from "./world-cup-groups";

export type ThirdPlaceHostGroup = "A" | "B" | "D" | "E" | "G" | "I" | "K" | "L";

export interface ThirdPlaceScenarioAssignments {
  A: WorldCupGroupLetter;
  B: WorldCupGroupLetter;
  D: WorldCupGroupLetter;
  E: WorldCupGroupLetter;
  G: WorldCupGroupLetter;
  I: WorldCupGroupLetter;
  K: WorldCupGroupLetter;
  L: WorldCupGroupLetter;
}

/** Annex C — 495 combinations keyed by sorted qualifying third-place groups. */
export const THIRD_PLACE_SCENARIOS: Record<string, ThirdPlaceScenarioAssignments> = {
`;

const body = rows
  .map(
    (r) =>
      `  "${r.key}": { A: "${r.a}", B: "${r.b}", D: "${r.d}", E: "${r.e}", G: "${r.g}", I: "${r.i}", K: "${r.k}", L: "${r.l}" }`,
  )
  .join(",\n");

const footer = `
};

export function lookupThirdPlaceScenario(
  qualifyingThirdGroups: WorldCupGroupLetter[],
): ThirdPlaceScenarioAssignments | null {
  const key = [...qualifyingThirdGroups].sort().join("");
  return THIRD_PLACE_SCENARIOS[key] ?? null;
}
`;

fs.writeFileSync(outputPath, header + body + footer);
console.log(`Wrote ${rows.length} scenarios to ${outputPath}`);
