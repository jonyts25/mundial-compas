import type { KnockoutMatch } from "@/lib/standings/knockout-bracket-types";
import type {
  KnockoutFeedSlot,
  KnockoutPhaseId,
} from "@/lib/standings/world-cup-knockout-schedule";
import {
  KNOCKOUT_SCHEDULE_BY_MATCH,
  WORLD_CUP_KNOCKOUT_SCHEDULE,
  type KnockoutScheduleEntry,
} from "@/lib/standings/world-cup-knockout-schedule";

/** First FIFA match number in the round of 32. */
export const KNOCKOUT_R32_FIRST_MATCH = 73;

/** Vertical slots in the bracket tree (one per R32 match). */
export const KNOCKOUT_BRACKET_R32_SLOTS = 16;

function feedSlotRow(slot: KnockoutFeedSlot): number {
  if (slot.kind === "winner" || slot.kind === "loser") {
    return knockoutBracketRow(slot.matchNumber);
  }
  return 0;
}

/** 0-based row index aligned to R32 leaves (73→0 … 88→15). */
export function knockoutBracketRow(matchNumber: number): number {
  const entry = KNOCKOUT_SCHEDULE_BY_MATCH[matchNumber];
  if (!entry) return 0;

  if (entry.phase === "r32") {
    return matchNumber - KNOCKOUT_R32_FIRST_MATCH;
  }

  const homeRow = feedSlotRow(entry.home);
  const awayRow = feedSlotRow(entry.away);
  return (homeRow + awayRow) / 2;
}

export function sortMatchesByBracketRow(
  matches: KnockoutMatch[],
): KnockoutMatch[] {
  return [...matches].sort(
    (a, b) =>
      knockoutBracketRow(a.matchNumber) - knockoutBracketRow(b.matchNumber) ||
      a.matchNumber - b.matchNumber,
  );
}

/** Expand semifinals → QF → octavos → R32 so feeder pairs stay adjacent in the tree. */
function buildKnockoutBracketDisplayOrders(): Record<
  KnockoutPhaseId,
  number[]
> {
  const orders: Partial<Record<KnockoutPhaseId, number[]>> = {
    sf: [101, 102],
    final: [104],
    third: [103],
  };

  let current: number[] = orders.sf!;
  for (const phase of ["qf", "r16", "r32"] as const) {
    const next: number[] = [];
    for (const matchNumber of current) {
      next.push(...getFeederMatchNumbers(KNOCKOUT_SCHEDULE_BY_MATCH[matchNumber]));
    }
    orders[phase] = next;
    current = next;
  }

  return orders as Record<KnockoutPhaseId, number[]>;
}

export const KNOCKOUT_BRACKET_DISPLAY_ORDER =
  buildKnockoutBracketDisplayOrders();

export function sortMatchesForBracketDisplay(
  phaseId: KnockoutPhaseId,
  matches: KnockoutMatch[],
): KnockoutMatch[] {
  const order = KNOCKOUT_BRACKET_DISPLAY_ORDER[phaseId];
  if (!order?.length) {
    return [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
  }

  const rank = new Map(order.map((matchNumber, index) => [matchNumber, index]));
  return [...matches].sort(
    (a, b) =>
      (rank.get(a.matchNumber) ?? 999) - (rank.get(b.matchNumber) ?? 999) ||
      a.matchNumber - b.matchNumber,
  );
}

export function getFeederMatchNumbers(
  entry: KnockoutScheduleEntry,
): number[] {
  const nums: number[] = [];
  for (const slot of [entry.home, entry.away]) {
    if (slot.kind === "winner" || slot.kind === "loser") {
      nums.push(slot.matchNumber);
    }
  }
  return nums;
}

export function getKnockoutAdvancementMap(): {
  winnerNext: Map<number, number>;
  loserNext: Map<number, number>;
} {
  const winnerNext = new Map<number, number>();
  const loserNext = new Map<number, number>();

  for (const entry of WORLD_CUP_KNOCKOUT_SCHEDULE) {
    for (const slot of [entry.home, entry.away]) {
      if (slot.kind === "winner") {
        winnerNext.set(slot.matchNumber, entry.matchNumber);
      }
      if (slot.kind === "loser") {
        loserNext.set(slot.matchNumber, entry.matchNumber);
      }
    }
  }

  return { winnerNext, loserNext };
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
