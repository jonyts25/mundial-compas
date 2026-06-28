import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import type {
  FullKnockoutTree,
  GroupPosition,
  KnockoutBracket,
  KnockoutMatch,
  KnockoutMatchSchedule,
  KnockoutTeamSlot,
  R32Slot,
} from "@/lib/standings/knockout-bracket-types";
import {
  indexKnockoutPartidosByMatchNumber,
  resolveKnockoutSchedule,
} from "@/lib/standings/knockout-schedule-utils";
import type { StandingGroup } from "@/lib/standings/types";
import {
  BEST_THIRD_PLACES_QUALIFY_COUNT,
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import {
  KNOCKOUT_PHASE_LABELS,
  WORLD_CUP_KNOCKOUT_SCHEDULE,
  type KnockoutFeedSlot,
  type KnockoutScheduleEntry,
} from "@/lib/standings/world-cup-knockout-schedule";
import {
  lookupThirdPlaceScenario,
  type ThirdPlaceHostGroup,
  type ThirdPlaceScenarioAssignments,
} from "@/lib/standings/world-cup-third-place-scenarios";
import {
  applySlotLockState,
  computeLockedGroupPositions,
  isFeedSlotLocked,
  isKnockoutMatchDefined,
  isR32SlotLocked,
  type GroupPositionKey,
} from "@/lib/standings/knockout-match-certainty";
import { formatFeedSlotLabel } from "@/lib/standings/knockout-feed-labels";
import type { Partido } from "@/types/database";

const MATCHES_PER_GROUP = 6;

function positionLabel(group: WorldCupGroupLetter, position: GroupPosition): string {
  const ord = position === 1 ? "1.º" : position === 2 ? "2.º" : "3.º";
  return `${ord} Grupo ${group}`;
}

function getTeamAtPosition(
  groups: StandingGroup[],
  group: WorldCupGroupLetter,
  position: GroupPosition,
): { teamId: string; teamName: string } | null {
  const standing = groups.find((g) => g.groupKey === group);
  const team = standing?.teams.find((t) => t.position === position);
  if (!team) return null;
  return { teamId: team.teamId, teamName: team.teamName };
}

function resolveGroupPositionSlot(
  groups: StandingGroup[],
  group: WorldCupGroupLetter,
  position: 1 | 2,
  isLocked: boolean,
): KnockoutTeamSlot {
  const team = getTeamAtPosition(groups, group, position);
  if (team) {
    return {
      label: team.teamName,
      teamId: team.teamId,
      teamName: team.teamName,
      groupLetter: group,
      position,
      ...applySlotLockState({ isProvisional: !isLocked }, isLocked),
    };
  }

  return {
    label: positionLabel(group, position),
    teamId: null,
    teamName: null,
    groupLetter: group,
    position,
    isProvisional: true,
    isLocked: false,
  };
}

function resolveThirdPlaceSlot(
  groups: StandingGroup[],
  winnerGroup: ThirdPlaceHostGroup,
  assignments: ThirdPlaceScenarioAssignments | null,
  qualifyingThirdGroups: WorldCupGroupLetter[],
  isLocked: boolean,
): KnockoutTeamSlot {
  if (!assignments) {
    return {
      label: `3.º (mejor tercero vs 1${winnerGroup})`,
      teamId: null,
      teamName: null,
      isProvisional: true,
      isLocked: false,
    };
  }

  const thirdGroup = assignments[winnerGroup];
  const team = getTeamAtPosition(groups, thirdGroup, 3);
  const slotLocked =
    isLocked &&
    qualifyingThirdGroups.includes(thirdGroup) &&
    Boolean(team);

  return {
    label: team?.teamName ?? positionLabel(thirdGroup, 3),
    teamId: team?.teamId ?? null,
    teamName: team?.teamName ?? null,
    groupLetter: thirdGroup,
    position: 3,
    ...applySlotLockState(
      {
        isProvisional:
          !slotLocked || !qualifyingThirdGroups.includes(thirdGroup),
      },
      slotLocked,
    ),
  };
}

function resolveR32Slot(
  slot: R32Slot,
  groups: StandingGroup[],
  assignments: ThirdPlaceScenarioAssignments | null,
  qualifyingThirdGroups: WorldCupGroupLetter[],
  isLocked: boolean,
): KnockoutTeamSlot {
  if (slot.kind === "group_position") {
    return resolveGroupPositionSlot(
      groups,
      slot.group,
      slot.position,
      isLocked,
    );
  }

  return resolveThirdPlaceSlot(
    groups,
    slot.winnerGroup,
    assignments,
    qualifyingThirdGroups,
    isLocked,
  );
}

function resolveFeedSlotLabel(
  slot: Extract<KnockoutFeedSlot, { kind: "winner" | "loser" }>,
): KnockoutTeamSlot {
  return {
    label: formatFeedSlotLabel(slot),
    teamId: null,
    teamName: null,
    isProvisional: true,
    isLocked: false,
  };
}

function getMatchSideWinner(
  partido: Partido,
  side: "home" | "away",
): { teamId: string; teamName: string } | null {
  if (partido.estatus !== "finalizado") return null;
  if (partido.marcador_local == null || partido.marcador_visitante == null) {
    return null;
  }

  const homeWins = partido.marcador_local > partido.marcador_visitante;
  const awayWins = partido.marcador_visitante > partido.marcador_local;
  if (!homeWins && !awayWins) return null;

  if (side === "home" && homeWins) {
    return {
      teamId: partido.equipo_local_codigo,
      teamName: partido.equipo_local_nombre,
    };
  }
  if (side === "away" && awayWins) {
    return {
      teamId: partido.equipo_visitante_codigo,
      teamName: partido.equipo_visitante_nombre,
    };
  }

  return null;
}

function teamSlotFromResult(
  team: { teamId: string; teamName: string },
): KnockoutTeamSlot {
  return {
    label: team.teamName,
    teamId: team.teamId,
    teamName: team.teamName,
    isProvisional: false,
    isLocked: true,
  };
}

export function isGroupStageComplete(partidos: PartidoGrupoRow[]): boolean {
  for (const letter of WORLD_CUP_GROUP_LETTERS) {
    const groupMatches = partidos.filter(
      (p) =>
        p.fase === "grupos" &&
        p.grupo?.toUpperCase() === letter &&
        p.estatus === "finalizado" &&
        p.marcador_local != null &&
        p.marcador_visitante != null,
    );
    if (groupMatches.length < MATCHES_PER_GROUP) return false;
  }
  return true;
}

interface BracketBuildContext {
  groups: StandingGroup[];
  assignments: ThirdPlaceScenarioAssignments | null;
  qualifyingThirdGroups: WorldCupGroupLetter[];
  groupStageComplete: boolean;
  isProvisional: boolean;
  lockedPositions: Set<GroupPositionKey>;
  partidosGrupo: PartidoGrupoRow[];
  dbByMatch: Map<number, Partido>;
  winners: Map<number, KnockoutTeamSlot>;
  losers: Map<number, KnockoutTeamSlot>;
}

function resolveSlotForEntry(
  slot: KnockoutFeedSlot,
  ctx: BracketBuildContext,
): KnockoutTeamSlot {
  if (slot.kind === "group_position" || slot.kind === "third_vs_winner") {
    const isLocked = isR32SlotLocked(slot, {
      lockedPositions: ctx.lockedPositions,
      assignments: ctx.assignments,
      partidos: ctx.partidosGrupo,
      groupStageComplete: ctx.groupStageComplete,
    });
    return resolveR32Slot(
      slot,
      ctx.groups,
      ctx.assignments,
      ctx.qualifyingThirdGroups,
      isLocked,
    );
  }

  if (slot.kind === "winner") {
    const resolved = ctx.winners.get(slot.matchNumber);
    if (resolved) return resolved;
    const locked = isFeedSlotLocked(slot, ctx.winners, ctx.losers);
    return {
      ...resolveFeedSlotLabel(slot),
      isProvisional: !locked,
      isLocked: locked,
    };
  }

  const resolved = ctx.losers.get(slot.matchNumber);
  if (resolved) return resolved;
  const locked = isFeedSlotLocked(slot, ctx.winners, ctx.losers);
  return {
    ...resolveFeedSlotLabel(slot),
    isProvisional: !locked,
    isLocked: locked,
  };
}

function buildMatchFromEntry(
  entry: KnockoutScheduleEntry,
  ctx: BracketBuildContext,
): KnockoutMatch {
  const schedule: KnockoutMatchSchedule = resolveKnockoutSchedule(
    entry,
    ctx.dbByMatch,
  );
  const home = resolveSlotForEntry(entry.home, ctx);
  const away = resolveSlotForEntry(entry.away, ctx);

  return {
    matchNumber: entry.matchNumber,
    phase: entry.phase,
    home,
    away,
    schedule,
    isDefined: isKnockoutMatchDefined(home, away),
  };
}

function storeMatchResults(
  entry: KnockoutScheduleEntry,
  ctx: BracketBuildContext,
): void {
  const db = ctx.dbByMatch.get(entry.matchNumber);
  if (!db) return;

  const homeWinner = getMatchSideWinner(db, "home");
  const awayWinner = getMatchSideWinner(db, "away");

  if (homeWinner) {
    ctx.winners.set(entry.matchNumber, teamSlotFromResult(homeWinner));
    ctx.losers.set(
      entry.matchNumber,
      teamSlotFromResult({
        teamId: db.equipo_visitante_codigo,
        teamName: db.equipo_visitante_nombre,
      }),
    );
    return;
  }

  if (awayWinner) {
    ctx.winners.set(entry.matchNumber, teamSlotFromResult(awayWinner));
    ctx.losers.set(
      entry.matchNumber,
      teamSlotFromResult({
        teamId: db.equipo_local_codigo,
        teamName: db.equipo_local_nombre,
      }),
    );
  }
}

function buildContext(input: {
  groups: StandingGroup[];
  bestThirdPlaces: BestThirdPlaceRow[];
  partidosGrupo: PartidoGrupoRow[];
  knockoutPartidos: Partido[];
}): BracketBuildContext {
  const qualifyingThirdGroups = input.bestThirdPlaces
    .filter((row) => row.qualifies)
    .map((row) => row.groupKey);

  const hasEnoughThirds =
    qualifyingThirdGroups.length === BEST_THIRD_PLACES_QUALIFY_COUNT;

  const assignments = hasEnoughThirds
    ? lookupThirdPlaceScenario(qualifyingThirdGroups)
    : null;

  const groupStageComplete = isGroupStageComplete(input.partidosGrupo);

  return {
    groups: input.groups,
    assignments,
    qualifyingThirdGroups,
    groupStageComplete,
    isProvisional: !groupStageComplete,
    lockedPositions: computeLockedGroupPositions(input.partidosGrupo),
    partidosGrupo: input.partidosGrupo,
    dbByMatch: indexKnockoutPartidosByMatchNumber(input.knockoutPartidos),
    winners: new Map(),
    losers: new Map(),
  };
}

export function buildFullKnockoutTree(input: {
  groups: StandingGroup[];
  bestThirdPlaces: BestThirdPlaceRow[];
  partidosGrupo: PartidoGrupoRow[];
  knockoutPartidos: Partido[];
}): FullKnockoutTree {
  const ctx = buildContext(input);
  const allMatches: KnockoutMatch[] = [];

  for (const entry of WORLD_CUP_KNOCKOUT_SCHEDULE) {
    storeMatchResults(entry, ctx);
    allMatches.push(buildMatchFromEntry(entry, ctx));
  }

  const matchesByPhase = new Map<
    KnockoutScheduleEntry["phase"],
    KnockoutMatch[]
  >();
  for (const match of allMatches) {
    const list = matchesByPhase.get(match.phase) ?? [];
    list.push(match);
    matchesByPhase.set(match.phase, list);
  }

  const phaseOrder: KnockoutScheduleEntry["phase"][] = [
    "r32",
    "r16",
    "qf",
    "sf",
    "final",
    "third",
  ];

  const qualifyingThirdGroups = ctx.qualifyingThirdGroups;
  const scenarioKey =
    qualifyingThirdGroups.length === BEST_THIRD_PLACES_QUALIFY_COUNT
      ? [...qualifyingThirdGroups].sort().join("")
      : null;

  return {
    phases: phaseOrder
      .filter((id) => (matchesByPhase.get(id)?.length ?? 0) > 0)
      .map((id) => ({
        id,
        label: KNOCKOUT_PHASE_LABELS[id],
        matches: matchesByPhase.get(id) ?? [],
      })),
    isProvisional: ctx.isProvisional || ctx.winners.size < 16,
    groupStageComplete: ctx.groupStageComplete,
    qualifyingThirdGroups,
    scenarioKey,
  };
}

export function buildKnockoutBracket(input: {
  groups: StandingGroup[];
  bestThirdPlaces: BestThirdPlaceRow[];
  partidos: PartidoGrupoRow[];
  knockoutPartidos?: Partido[];
}): KnockoutBracket {
  const tree = buildFullKnockoutTree({
    groups: input.groups,
    bestThirdPlaces: input.bestThirdPlaces,
    partidosGrupo: input.partidos,
    knockoutPartidos: input.knockoutPartidos ?? [],
  });

  const r32 = tree.phases.find((p) => p.id === "r32");

  return {
    phase: "r32",
    matches: r32?.matches ?? [],
    qualifyingThirdGroups: tree.qualifyingThirdGroups,
    scenarioKey: tree.scenarioKey,
    isProvisional: tree.isProvisional,
    groupStageComplete: tree.groupStageComplete,
  };
}
