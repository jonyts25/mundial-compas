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
  isProvisional: boolean,
): KnockoutTeamSlot {
  const team = getTeamAtPosition(groups, group, position);
  if (team) {
    return {
      label: team.teamName,
      teamId: team.teamId,
      teamName: team.teamName,
      groupLetter: group,
      position,
      isProvisional,
    };
  }

  return {
    label: positionLabel(group, position),
    teamId: null,
    teamName: null,
    groupLetter: group,
    position,
    isProvisional: true,
  };
}

function resolveThirdPlaceSlot(
  groups: StandingGroup[],
  winnerGroup: ThirdPlaceHostGroup,
  assignments: ThirdPlaceScenarioAssignments | null,
  qualifyingThirdGroups: WorldCupGroupLetter[],
  isProvisional: boolean,
): KnockoutTeamSlot {
  if (!assignments) {
    return {
      label: `3.º (mejor tercero vs 1${winnerGroup})`,
      teamId: null,
      teamName: null,
      isProvisional: true,
    };
  }

  const thirdGroup = assignments[winnerGroup];
  const team = getTeamAtPosition(groups, thirdGroup, 3);

  return {
    label: team?.teamName ?? positionLabel(thirdGroup, 3),
    teamId: team?.teamId ?? null,
    teamName: team?.teamName ?? null,
    groupLetter: thirdGroup,
    position: 3,
    isProvisional:
      isProvisional || !qualifyingThirdGroups.includes(thirdGroup),
  };
}

function resolveR32Slot(
  slot: R32Slot,
  groups: StandingGroup[],
  assignments: ThirdPlaceScenarioAssignments | null,
  qualifyingThirdGroups: WorldCupGroupLetter[],
  isProvisional: boolean,
): KnockoutTeamSlot {
  if (slot.kind === "group_position") {
    return resolveGroupPositionSlot(
      groups,
      slot.group,
      slot.position,
      isProvisional,
    );
  }

  return resolveThirdPlaceSlot(
    groups,
    slot.winnerGroup,
    assignments,
    qualifyingThirdGroups,
    isProvisional,
  );
}

function resolveFeedSlotLabel(
  slot: Extract<KnockoutFeedSlot, { kind: "winner" | "loser" }>,
): KnockoutTeamSlot {
  if (slot.kind === "winner") {
    return {
      label: `Ganador P${slot.matchNumber}`,
      teamId: null,
      teamName: null,
      isProvisional: true,
    };
  }

  return {
    label: `Perdedor P${slot.matchNumber}`,
    teamId: null,
    teamName: null,
    isProvisional: true,
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
  dbByMatch: Map<number, Partido>;
  winners: Map<number, KnockoutTeamSlot>;
  losers: Map<number, KnockoutTeamSlot>;
}

function resolveSlotForEntry(
  slot: KnockoutFeedSlot,
  ctx: BracketBuildContext,
): KnockoutTeamSlot {
  if (slot.kind === "group_position" || slot.kind === "third_vs_winner") {
    return resolveR32Slot(
      slot,
      ctx.groups,
      ctx.assignments,
      ctx.qualifyingThirdGroups,
      ctx.isProvisional,
    );
  }

  if (slot.kind === "winner") {
    return ctx.winners.get(slot.matchNumber) ?? resolveFeedSlotLabel(slot);
  }

  return ctx.losers.get(slot.matchNumber) ?? resolveFeedSlotLabel(slot);
}

function buildMatchFromEntry(
  entry: KnockoutScheduleEntry,
  ctx: BracketBuildContext,
): KnockoutMatch {
  const schedule: KnockoutMatchSchedule = resolveKnockoutSchedule(
    entry,
    ctx.dbByMatch,
  );

  return {
    matchNumber: entry.matchNumber,
    phase: entry.phase,
    home: resolveSlotForEntry(entry.home, ctx),
    away: resolveSlotForEntry(entry.away, ctx),
    schedule,
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
