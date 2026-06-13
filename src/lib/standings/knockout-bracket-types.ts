import type { WorldCupGroupLetter } from "@/lib/standings/world-cup-groups";
import type { ThirdPlaceHostGroup } from "@/lib/standings/world-cup-third-place-scenarios";
import type { KnockoutPhaseId } from "@/lib/standings/world-cup-knockout-schedule";

export type GroupPosition = 1 | 2 | 3;

export type R32Slot =
  | { kind: "group_position"; group: WorldCupGroupLetter; position: 1 | 2 }
  | { kind: "third_vs_winner"; winnerGroup: ThirdPlaceHostGroup };

export interface R32FixtureDefinition {
  matchNumber: number;
  home: R32Slot;
  away: R32Slot;
}

export interface KnockoutTeamSlot {
  label: string;
  teamId: string | null;
  teamName: string | null;
  groupLetter?: WorldCupGroupLetter;
  position?: GroupPosition;
  isProvisional: boolean;
}

export interface KnockoutMatchSchedule {
  fechaKickoff: string | null;
  sede: string;
  partidoId: string | null;
  dateLabel: string;
  timeLabel: string | null;
}

export interface KnockoutMatch {
  matchNumber: number;
  phase: KnockoutPhaseId;
  home: KnockoutTeamSlot;
  away: KnockoutTeamSlot;
  schedule: KnockoutMatchSchedule;
}

export interface KnockoutBracket {
  phase: "r32";
  matches: KnockoutMatch[];
  qualifyingThirdGroups: WorldCupGroupLetter[];
  scenarioKey: string | null;
  isProvisional: boolean;
  groupStageComplete: boolean;
}

export interface FullKnockoutTree {
  phases: {
    id: KnockoutPhaseId;
    label: string;
    matches: KnockoutMatch[];
  }[];
  isProvisional: boolean;
  groupStageComplete: boolean;
  qualifyingThirdGroups: WorldCupGroupLetter[];
  scenarioKey: string | null;
}
