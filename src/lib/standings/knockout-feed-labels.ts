import type { R32Slot } from "@/lib/standings/knockout-bracket-types";
import {
  getFeederMatchNumbers,
  knockoutBracketRow,
} from "@/lib/standings/knockout-bracket-layout";
import {
  KNOCKOUT_SCHEDULE_BY_MATCH,
  type KnockoutFeedSlot,
  type KnockoutScheduleEntry,
} from "@/lib/standings/world-cup-knockout-schedule";

function formatR32SlotShort(slot: R32Slot): string {
  if (slot.kind === "group_position") {
    return `${slot.position}${slot.group}`;
  }
  return `3º vs 1${slot.winnerGroup}`;
}

export function formatR32MatchShortLabel(matchNumber: number): string {
  const entry = KNOCKOUT_SCHEDULE_BY_MATCH[matchNumber];
  if (!entry || entry.phase !== "r32") {
    return `P${matchNumber}`;
  }
  return `${formatR32SlotShort(entry.home as R32Slot)} vs ${formatR32SlotShort(entry.away as R32Slot)}`;
}

export function formatWinnerFeedLabel(sourceMatchNumber: number): string {
  const entry = KNOCKOUT_SCHEDULE_BY_MATCH[sourceMatchNumber];
  if (entry?.phase === "r32") {
    return `Ganador P${sourceMatchNumber} (${formatR32MatchShortLabel(sourceMatchNumber)})`;
  }
  return `Ganador P${sourceMatchNumber}`;
}

export function formatLoserFeedLabel(sourceMatchNumber: number): string {
  return `Perdedor P${sourceMatchNumber}`;
}

export function formatFeedSlotLabel(
  slot: Extract<KnockoutFeedSlot, { kind: "winner" | "loser" }>,
): string {
  if (slot.kind === "winner") {
    return formatWinnerFeedLabel(slot.matchNumber);
  }
  return formatLoserFeedLabel(slot.matchNumber);
}

export function formatFeederHint(matchNumber: number): string | null {
  const entry = KNOCKOUT_SCHEDULE_BY_MATCH[matchNumber];
  if (!entry || entry.phase === "r32") return null;

  const feeders = getFeederMatchNumbers(entry);
  if (feeders.length === 0) return null;

  return `Alimentado por P${feeders.join(" y P")}`;
}

export function describeKnockoutFeedPath(entry: KnockoutScheduleEntry): string {
  const home =
    entry.home.kind === "winner" || entry.home.kind === "loser"
      ? formatFeedSlotLabel(entry.home)
      : null;
  const away =
    entry.away.kind === "winner" || entry.away.kind === "loser"
      ? formatFeedSlotLabel(entry.away)
      : null;

  if (!home || !away) return "";
  return `${home} · ${away}`;
}

/** Whether a knockout match sits between two adjacent R32 rows (common misread). */
export function isBracketAlignedWithAdjacentR32(
  matchNumber: number,
  leftR32: number,
  rightR32: number,
): boolean {
  const row = knockoutBracketRow(matchNumber);
  const left = knockoutBracketRow(leftR32);
  const right = knockoutBracketRow(rightR32);
  return row === (left + right) / 2;
}
