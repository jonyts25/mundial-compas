import type { KnockoutFeedSlot } from "@/lib/standings/world-cup-knockout-schedule";
import {
  WORLD_CUP_KNOCKOUT_SCHEDULE,
  type KnockoutPhaseId,
  type KnockoutScheduleEntry,
} from "@/lib/standings/world-cup-knockout-schedule";

export const PLACEHOLDER_FIXTURE_BASE = 9_000_000;

const PHASE_PREFIX: Record<KnockoutPhaseId, string> = {
  r32: "r32",
  r16: "r16",
  qf: "qf",
  sf: "sf",
  third: "third_place",
  final: "final",
};

const PHASE_TO_FASE = {
  r32: "dieciseisavos",
  r16: "octavos",
  qf: "cuartos",
  sf: "semifinal",
  third: "tercer_lugar",
  final: "final",
} as const;

export type KnockoutFaseMundial = (typeof PHASE_TO_FASE)[KnockoutPhaseId];

export function faseFromKnockoutPhase(phase: KnockoutPhaseId): KnockoutFaseMundial {
  return PHASE_TO_FASE[phase];
}

export function phaseIndexForMatch(
  matchNumber: number,
  phase: KnockoutPhaseId,
): number {
  const inPhase = WORLD_CUP_KNOCKOUT_SCHEDULE.filter((e) => e.phase === phase);
  const idx = inPhase.findIndex((e) => e.matchNumber === matchNumber);
  return idx >= 0 ? idx + 1 : 0;
}

/** Stable slot id: r32_01…r32_16, r16_01…, qf_01…, sf_01…, third_place, final */
export function knockoutMatchIdForEntry(entry: KnockoutScheduleEntry): string {
  if (entry.phase === "third") return "third_place";
  if (entry.phase === "final") return "final";
  const idx = phaseIndexForMatch(entry.matchNumber, entry.phase);
  return `${PHASE_PREFIX[entry.phase]}_${String(idx).padStart(2, "0")}`;
}

export function knockoutMatchIdFromNumber(matchNumber: number): string | null {
  const entry = WORLD_CUP_KNOCKOUT_SCHEDULE.find((e) => e.matchNumber === matchNumber);
  return entry ? knockoutMatchIdForEntry(entry) : null;
}

export function placeholderFixtureId(matchNumber: number): number {
  return PLACEHOLDER_FIXTURE_BASE + matchNumber;
}

/** Serialize feed slot for metadata.home_slot / away_slot */
export function serializeKnockoutFeedSlot(slot: KnockoutFeedSlot): string {
  if (slot.kind === "group_position") {
    return `${slot.position}${slot.group}`;
  }
  if (slot.kind === "third_vs_winner") {
    return `3rd_vs_1${slot.winnerGroup}`;
  }
  if (slot.kind === "winner") {
    return `winner_m${slot.matchNumber}`;
  }
  return `loser_m${slot.matchNumber}`;
}

export interface KnockoutAdvancementMap {
  winnerNext: Map<number, number>;
  loserNext: Map<number, number>;
}

export function buildKnockoutAdvancementMap(): KnockoutAdvancementMap {
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

export function winnerNextMatchId(matchNumber: number): string | null {
  const { winnerNext } = buildKnockoutAdvancementMap();
  const next = winnerNext.get(matchNumber);
  return next != null ? knockoutMatchIdFromNumber(next) : null;
}

export function loserNextMatchId(matchNumber: number): string | null {
  const { loserNext } = buildKnockoutAdvancementMap();
  const next = loserNext.get(matchNumber);
  return next != null ? knockoutMatchIdFromNumber(next) : null;
}
