import type { MatchSummaryInput, MatchSummaryOutput } from "@/lib/ai/match-summary/match-summary-types";

/** Forma abreviada API: "J. Quinones" */
const INITIAL_SURNAME_PATTERN = /^([A-ZÁÉÍÓÚÑ])\.\s+(.+)$/i;

/**
 * Nombres completos prohibidos al expandir una inicial.
 * Solo aplica cuando facts_locked usa forma "X. Apellido".
 */
export const INITIAL_EXPANSION_BLOCKLIST: Readonly<Record<string, readonly string[]>> = {
  J: ["Joaquín", "Joaquin", "Julián", "Julian", "Javier", "Jesús", "Jesus", "Jorge"],
  R: ["Ricardo", "Raúl", "Raul", "Roberto", "Rodrigo", "Ramiro"],
  H: ["Hirving", "Henry", "Hugo"],
  A: ["Alexis", "Andrés", "Andres", "Antonio"],
  C: ["Carlos", "César", "Cesar"],
  L: ["Luis", "Lionel"],
  M: ["Miguel", "Memo", "Martín", "Martin"],
};

export interface NameGuardViolation {
  rule_id: "missing_exact_name" | "expanded_initial" | "completed_name";
  locked_name: string;
  matched: string;
  field: string;
}

export function buildFactsLocked(input: MatchSummaryInput): string[] {
  const names = new Set<string>();
  for (const ev of input.timeline) {
    const player = ev.player?.trim();
    if (player) names.add(player);
  }
  return [...names];
}

export function parseInitialSurname(
  name: string,
): { initial: string; surname: string } | null {
  const m = name.trim().match(INITIAL_SURNAME_PATTERN);
  if (!m?.[1] || !m[2]) return null;
  return { initial: m[1].toUpperCase(), surname: m[2].trim() };
}

function collectOutputStrings(
  output: MatchSummaryOutput,
): Array<{ field: string; text: string }> {
  const parts: Array<{ field: string; text: string }> = [
    { field: "headline", text: output.headline },
    { field: "lede", text: output.lede },
    ...output.body_paragraphs.map((p, i) => ({
      field: `body_paragraphs[${i}]`,
      text: p,
    })),
    ...output.facts.map((f, i) => ({ field: `facts[${i}]`, text: f })),
  ];
  if (output.table_impact) {
    parts.push({ field: "table_impact", text: output.table_impact });
  }
  if (output.quiniela_impact) {
    parts.push({ field: "quiniela_impact", text: output.quiniela_impact });
  }
  if (output.standout_player) {
    parts.push({ field: "standout_player.name", text: output.standout_player.name });
    parts.push({
      field: "standout_player.reason",
      text: output.standout_player.reason,
    });
  }
  return parts;
}

function outputBlob(output: MatchSummaryOutput): string {
  return collectOutputStrings(output)
    .map((p) => p.text)
    .join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Detecta "Nombre Apellido" completo cuando solo hay "J. Apellido" en facts_locked. */
function findCompletedNameViolation(
  text: string,
  lockedName: string,
  surname: string,
  field: string,
): NameGuardViolation | null {
  const pattern = new RegExp(
    `\\b(?!${escapeRegExp(lockedName)})[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\\s+${escapeRegExp(surname)}\\b`,
    "i",
  );
  const match = text.match(pattern);
  if (!match) return null;
  return {
    rule_id: "completed_name",
    locked_name: lockedName,
    matched: match[0],
    field,
  };
}

export function scanMatchSummaryNameViolations(
  output: MatchSummaryOutput,
  lockedNames: string[],
): NameGuardViolation[] {
  if (lockedNames.length === 0) return [];

  const blob = outputBlob(output);
  const violations: NameGuardViolation[] = [];
  const seen = new Set<string>();

  function push(v: NameGuardViolation) {
    const key = `${v.rule_id}:${v.locked_name}:${v.matched}:${v.field}`;
    if (seen.has(key)) return;
    seen.add(key);
    violations.push(v);
  }

  for (const lockedName of lockedNames) {
    if (!blob.includes(lockedName)) {
      push({
        rule_id: "missing_exact_name",
        locked_name: lockedName,
        matched: lockedName,
        field: "output",
      });
    }

    const parsed = parseInitialSurname(lockedName);
    if (!parsed) continue;

    const blocklist = INITIAL_EXPANSION_BLOCKLIST[parsed.initial] ?? [];
    for (const { field, text } of collectOutputStrings(output)) {
      for (const forbidden of blocklist) {
        if (text.includes(forbidden)) {
          push({
            rule_id: "expanded_initial",
            locked_name: lockedName,
            matched: forbidden,
            field,
          });
        }
      }

      const completed = findCompletedNameViolation(
        text,
        lockedName,
        parsed.surname,
        field,
      );
      if (completed) push(completed);
    }
  }

  return violations;
}

export function isMatchSummaryNameGuardClean(
  output: MatchSummaryOutput,
  lockedNames: string[],
): boolean {
  return scanMatchSummaryNameViolations(output, lockedNames).length === 0;
}

export function formatNameGuardError(violations: NameGuardViolation[]): string {
  if (violations.length === 0) return "NAME_GUARD";
  const first = violations[0]!;
  return `NAME_GUARD:${first.rule_id}`;
}

export function getLockedPlayerNames(input: MatchSummaryInput): string[] {
  return input.facts_locked ?? buildFactsLocked(input);
}
