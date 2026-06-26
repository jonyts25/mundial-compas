import type { PartidoGrupoRow } from "@/lib/standings/calculate-group-standings";
import { calculateGroupStandingsFromPartidos } from "@/lib/standings/calculate-group-standings";
import type { R32Slot } from "@/lib/standings/knockout-bracket-types";
import {
  WORLD_CUP_GROUP_LETTERS,
  type WorldCupGroupLetter,
} from "@/lib/standings/world-cup-groups";
import type { ThirdPlaceHostGroup } from "@/lib/standings/world-cup-third-place-scenarios";
import type { ThirdPlaceScenarioAssignments } from "@/lib/standings/world-cup-third-place-scenarios";
import type { KnockoutFeedSlot } from "@/lib/standings/world-cup-knockout-schedule";

const MATCHES_PER_GROUP = 6;

/** Resultados representativos por partido (victoria local / empate / victoria visitante). */
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

export function isGroupFinished(
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

function enumerateScoreOutcomes(count: number): [number, number][][] {
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

/**
 * Posiciones cuyo ocupante es el mismo en todos los escenarios restantes del grupo.
 * Se usa solo para 1.º lugar con grupo aún abierto (ver isGroupPositionSlotLocked).
 */
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

    const occupantsByPosition = new Map<GroupPositionKey, Set<string>>();

    for (const outcomes of enumerateScoreOutcomes(remaining.length)) {
      const hypothetical = remaining.map((match, index) => {
        const [homeGoals, awayGoals] = outcomes[index]!;
        return {
          ...match,
          marcador_local: homeGoals,
          marcador_visitante: awayGoals,
          estatus: "finalizado" as const,
        };
      });

      const { groups } = calculateGroupStandingsFromPartidos([
        ...baseRows,
        ...hypothetical,
      ]);
      const standing = groups.find((g) => g.groupKey === group);
      if (!standing) continue;

      for (const team of standing.teams) {
        const key = groupPositionKey(
          group,
          team.position as 1 | 2 | 3,
        );
        const set = occupantsByPosition.get(key) ?? new Set<string>();
        set.add(team.teamId);
        occupantsByPosition.set(key, set);
      }
    }

    for (const [key, occupants] of occupantsByPosition) {
      if (occupants.size === 1) {
        locked.add(key);
      }
    }
  }

  return locked;
}

/**
 * FIFA R32 — criterios conservadores para no marcar verde de más:
 * - 1.º: grupo cerrado, o mismo equipo siempre en 1.º con partidos restantes.
 * - 2.º: solo cuando el grupo cerró (el acomodo 2X vs 2Y es fijo, el ocupante no).
 * - 3.º (Anexo C): solo cuando terminó la fase de grupos completa.
 */
export function isGroupPositionSlotLocked(
  slot: Extract<R32Slot, { kind: "group_position" }>,
  lockedPositions: Set<GroupPositionKey>,
  partidos: PartidoGrupoRow[],
): boolean {
  if (isGroupFinished(partidos, slot.group)) {
    return true;
  }

  if (slot.position === 2) {
    return false;
  }

  return lockedPositions.has(groupPositionKey(slot.group, slot.position));
}

export function isThirdPlaceSlotLocked(input: {
  groupStageComplete: boolean;
  assignments: ThirdPlaceScenarioAssignments | null;
}): boolean {
  return input.groupStageComplete && input.assignments != null;
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
    return isGroupPositionSlotLocked(slot, ctx.lockedPositions, ctx.partidos);
  }

  return isThirdPlaceSlotLocked({
    groupStageComplete: ctx.groupStageComplete,
    assignments: ctx.assignments,
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
