import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import type {
  GroupPosition,
  KnockoutBracket,
  KnockoutMatch,
  KnockoutTeamSlot,
  R32Slot,
} from "@/lib/standings/knockout-bracket-types";
import type { StandingGroup } from "@/lib/standings/types";
import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import {
  BEST_THIRD_PLACES_QUALIFY_COUNT,
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import { WORLD_CUP_R32_FIXTURES } from "@/lib/standings/world-cup-r32-fixtures";
import {
  lookupThirdPlaceScenario,
  type ThirdPlaceHostGroup,
  type ThirdPlaceScenarioAssignments,
} from "@/lib/standings/world-cup-third-place-scenarios";

const MATCHES_PER_GROUP = 6;

function positionLabel(group: WorldCupGroupLetter, position: GroupPosition): string {
  const ord =
    position === 1 ? "1.º" : position === 2 ? "2.º" : "3.º";
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

  const thirdStillQualifies = qualifyingThirdGroups.includes(thirdGroup);

  return {
    label: team?.teamName ?? positionLabel(thirdGroup, 3),
    teamId: team?.teamId ?? null,
    teamName: team?.teamName ?? null,
    groupLetter: thirdGroup,
    position: 3,
    isProvisional: isProvisional || !thirdStillQualifies,
  };
}

function resolveSlot(
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

export function buildKnockoutBracket(input: {
  groups: StandingGroup[];
  bestThirdPlaces: BestThirdPlaceRow[];
  partidos: PartidoGrupoRow[];
}): KnockoutBracket {
  const { groups, bestThirdPlaces, partidos } = input;

  const qualifyingThirdGroups = bestThirdPlaces
    .filter((row) => row.qualifies)
    .map((row) => row.groupKey);

  const hasEnoughThirds =
    qualifyingThirdGroups.length === BEST_THIRD_PLACES_QUALIFY_COUNT;

  const assignments = hasEnoughThirds
    ? lookupThirdPlaceScenario(qualifyingThirdGroups)
    : null;

  const scenarioKey = hasEnoughThirds
    ? [...qualifyingThirdGroups].sort().join("")
    : null;

  const groupStageComplete = isGroupStageComplete(partidos);
  const isProvisional = !groupStageComplete;

  const matches: KnockoutMatch[] = WORLD_CUP_R32_FIXTURES.map((fixture) => ({
    matchNumber: fixture.matchNumber,
    home: resolveSlot(
      fixture.home,
      groups,
      assignments,
      qualifyingThirdGroups,
      isProvisional,
    ),
    away: resolveSlot(
      fixture.away,
      groups,
      assignments,
      qualifyingThirdGroups,
      isProvisional,
    ),
  }));

  return {
    phase: "r32",
    matches,
    qualifyingThirdGroups,
    scenarioKey,
    isProvisional,
    groupStageComplete,
  };
}
