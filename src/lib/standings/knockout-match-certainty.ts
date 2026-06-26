import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import {
  calculateGroupStandingsFromPartidos,
} from "@/lib/standings/calculate-group-standings";
import type { R32Slot } from "@/lib/standings/knockout-bracket-types";
import type { StandingGroup } from "@/lib/standings/types";
import {
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import type { ThirdPlaceHostGroup } from "@/lib/standings/world-cup-third-place-scenarios";
import type { ThirdPlaceScenarioAssignments } from "@/lib/standings/world-cup-third-place-scenarios";
import type { KnockoutFeedSlot } from "@/lib/standings/world-cup-knockout-schedule";

const MATCHES_PER_GROUP = 6;
const SCORE_OUTCOMES: [number, number][] = [
  [1, 0],
  [0, 0],
  [0, 1],
];

export type GroupPositionKey = `${WorldCupGroupLetter}-${1 | 2 | 3}`;

function groupPositionKey(
  group: WorldCupGroupLetter,
  position: 1 | 2 | 3,
): GroupPositionKey {
  return `${group}-${position}`;
}

function isFinishedGroupMatch(p: PartidoGrupoRow): boolean {
  return (
    p.estatus === "finalizado" &&
    p.marcador_local != null &&
    p.marcador_visitante != null
  );
}

function isGroupFinished(
  partidos: PartidoGrupoRow[],
  group: WorldCupGroupLetter,
): boolean {
  const finished = partidos.filter(
    (p) =>
      p.fase === "grupos" &&
      p.grupo?.toUpperCase() === group &&
      isFinishedGroupMatch(p),
  );
  return finished.length >= MATCHES_PER_GROUP;
}

function unplayedGroupMatches(
  partidos: PartidoGrupoRow[],
  group: WorldCupGroupLetter,
): PartidoGrupoRow[] {
  return partidos.filter(
    (p) =>
      p.fase === "grupos" &&
      p.grupo?.toUpperCase() === group &&
      !isFinishedGroupMatch(p) &&
      p.estatus !== "cancelado",
  );
}

function enumerateScoreOutcomes(
  count: number,
): [number, number][][] {
  if (count === 0) return [[]];
  const tail = enumerateScoreOutcomes(count - 1);
  const combos: [number, number][][] = [];
  for (const score of SCORE_OUTCOMES) {
    for (const rest of tail) {
      combos.push([score, ...rest]);
    }
  }
  return combos;
}

/** Posiciones de grupo que ya no pueden cambiar con los partidos restantes. */
export function computeLockedGroupPositions(
  partidos: PartidoGrupoRow[],
): Set<GroupPositionKey> {
  const locked = new Set<GroupPositionKey>();

  for (const group of WORLD_CUP_GROUP_LETTERS) {
    if (isGroupFinished(partidos, group)) {
      locked.add(groupPositionKey(group, 1));
      locked.add(groupPositionKey(group, 2));
      locked.add(groupPositionKey(group, 3));
      continue;
    }

    const remaining = unplayedGroupMatches(partidos, group);
    if (remaining.length === 0) continue;

    const baseRows = partidos.filter(
      (p) =>
        p.fase !== "grupos" ||
        p.grupo?.toUpperCase() !== group ||
        isFinishedGroupMatch(p),
    );

    const positionsByTeam = new Map<string, Set<number>>();

    for (const outcomes of enumerateScoreOutcomes(remaining.length)) {
      const hypothetical = remaining.map((match, index) => {
        const [homeGoals, awayGoals] = outcomes[index]!;
        return {
          ...match,
          marcador_local: homeGoals,
          marcador_visitante: awayGoals,
          estatus: "finalizado",
        };
      });

      const { groups } = calculateGroupStandingsFromPartidos([
        ...baseRows,
        ...hypothetical,
      ]);
      const standing = groups.find((g) => g.groupKey === group);
      if (!standing) continue;

      for (const team of standing.teams) {
        const set = positionsByTeam.get(team.teamId) ?? new Set<number>();
        set.add(team.position);
        positionsByTeam.set(team.teamId, set);
      }
    }

    const { groups } = calculateGroupStandingsFromPartidos(partidos);
    const current = groups.find((g) => g.groupKey === group);
    if (!current) continue;

    for (const team of current.teams) {
      const possible = positionsByTeam.get(team.teamId);
      if (possible?.size === 1) {
        const position = [...possible][0] as 1 | 2 | 3;
        locked.add(groupPositionKey(group, position));
      }
    }
  }

  return locked;
}

export function isGroupPositionSlotLocked(
  slot: Extract<R32Slot, { kind: "group_position" }>,
  lockedPositions: Set<GroupPositionKey>,
): boolean {
  return lockedPositions.has(groupPositionKey(slot.group, slot.position));
}

export function isThirdPlaceSlotLocked(input: {
  winnerGroup: ThirdPlaceHostGroup;
  assignments: ThirdPlaceScenarioAssignments | null;
  lockedPositions: Set<GroupPositionKey>;
  partidos: PartidoGrupoRow[];
  groupStageComplete: boolean;
}): boolean {
  if (input.groupStageComplete && input.assignments) return true;
  if (!input.assignments) return false;

  const thirdGroup = input.assignments[input.winnerGroup];
  if (!isGroupFinished(input.partidos, thirdGroup)) return false;

  return input.lockedPositions.has(groupPositionKey(thirdGroup, 3));
}

export function isFeedSlotLocked(
  slot: Extract<KnockoutFeedSlot, { kind: "winner" | "loser" }>,
  resolvedWinners: Map<number, unknown>,
  resolvedLosers: Map<number, unknown>,
): boolean {
  if (slot.kind === "winner") return resolvedWinners.has(slot.matchNumber);
  return resolvedLosers.has(slot.matchNumber);
}

export function isR32SlotLocked(
  slot: R32Slot,
  ctx: {
    lockedPositions: Set<GroupPositionKey>;
    assignments: ThirdPlaceScenarioAssignments | null;
    partidos: PartidoGrupoRow[];
    groupStageComplete: boolean;
  },
): boolean {
  if (slot.kind === "group_position") {
    return isGroupPositionSlotLocked(slot, ctx.lockedPositions);
  }

  return isThirdPlaceSlotLocked({
    winnerGroup: slot.winnerGroup,
    assignments: ctx.assignments,
    lockedPositions: ctx.lockedPositions,
    partidos: ctx.partidos,
    groupStageComplete: ctx.groupStageComplete,
  });
}

export function applySlotLockState(
  slot: { isProvisional: boolean },
  isLocked: boolean,
): { isProvisional: boolean; isLocked: boolean } {
  return {
    isProvisional: !isLocked,
    isLocked,
  };
}

export function isKnockoutMatchDefined(
  home: { isLocked: boolean },
  away: { isLocked: boolean },
): boolean {
  return home.isLocked && away.isLocked;
}

/** Grupos con al menos un partido jugado — útil para leyenda del cuadro. */
export function groupsWithActivity(groups: StandingGroup[]): WorldCupGroupLetter[] {
  return groups
    .filter((g) => g.teams.some((t) => t.played > 0))
    .map((g) => g.groupKey as WorldCupGroupLetter);
}
