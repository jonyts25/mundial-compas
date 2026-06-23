/**
 * Escenarios de grupo en vivo — tabla provisional, mejores terceros, rival R32.
 * Puro: sin UI, sin BD, sin API. Reutiliza standings existentes.
 */

import { buildBestThirdPlacesRanking } from "@/lib/standings/best-third-places";
import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import {
  calculateGroupStandingsFromPartidos,
  type PartidoGrupoRow,
} from "@/lib/standings/calculate-group-standings";
import { isGroupStageComplete } from "@/lib/standings/build-knockout-bracket";
import type { KnockoutBracket } from "@/lib/standings/knockout-bracket-types";
import type { StandingGroup, StandingTeamRow } from "@/lib/standings/types";
import type { WorldCupGroupLetter } from "@/lib/standings/world-cup-groups";
import {
  computeRoundOf32Slots,
  getProvisionalOpponent,
  type ProvisionalOpponentResult,
} from "@/lib/world-cup/knockout-slots";

export type { PartidoGrupoRow };

export interface LiveScenarioMessage {
  kind: "position" | "classification" | "best_third" | "knockout";
  teamId: string;
  teamName: string;
  text: string;
}

export interface LiveWorldCupSnapshot {
  groups: StandingGroup[];
  bestThirds: BestThirdPlaceRow[];
  r32: KnockoutBracket;
  groupStageComplete: boolean;
  scenarioKey: string | null;
  messages: LiveScenarioMessage[];
}

export function computeLiveGroupTable(
  partidos: PartidoGrupoRow[],
): StandingGroup[] {
  return calculateGroupStandingsFromPartidos(partidos).groups;
}

export function computeBestThirdsSnapshot(
  groups: StandingGroup[],
): BestThirdPlaceRow[] {
  return buildBestThirdPlacesRanking(groups);
}

export function buildLiveWorldCupSnapshot(
  partidos: PartidoGrupoRow[],
): LiveWorldCupSnapshot {
  const groups = computeLiveGroupTable(partidos);
  const bestThirds = computeBestThirdsSnapshot(groups);
  const r32 = computeRoundOf32Slots({ groups, bestThirdPlaces: bestThirds, partidos });
  const groupStageComplete = isGroupStageComplete(partidos);

  return {
    groups,
    bestThirds,
    r32,
    groupStageComplete,
    scenarioKey: r32.scenarioKey,
    messages: [],
  };
}

function findTeamRow(
  groups: StandingGroup[],
  teamId: string,
): { group: WorldCupGroupLetter; row: StandingTeamRow } | null {
  for (const g of groups) {
    const row = g.teams.find((t) => t.teamId === teamId);
    if (row) {
      return { group: g.groupKey as WorldCupGroupLetter, row };
    }
  }
  return null;
}

export function describeTeamPosition(
  groups: StandingGroup[],
  teamId: string,
): string | null {
  const found = findTeamRow(groups, teamId);
  if (!found) return null;
  const { group, row } = found;
  const ord = row.position === 1 ? "1.º" : row.position === 2 ? "2.º" : "3.º";
  return `Con este marcador, ${row.teamName} sería ${ord} del Grupo ${group}.`;
}

export function describeProvisionalKnockoutOpponent(
  teamId: string,
  snapshot: Pick<LiveWorldCupSnapshot, "r32">,
): string | null {
  const match = getProvisionalOpponent(teamId, snapshot.r32);
  if (!match) return null;

  const opp = match.opponent;
  if (opp.isProvisional || !opp.teamName) {
    return `Ahora enfrentaría provisionalmente a ${opp.label}.`;
  }
  return `Ahora enfrentaría provisionalmente a ${opp.teamName}.`;
}

export function describeBestThirdDependency(
  snapshot: Pick<LiveWorldCupSnapshot, "bestThirds" | "scenarioKey">,
): string | null {
  if (snapshot.scenarioKey) {
    const pending = snapshot.bestThirds.filter((t) => t.qualifies && !t.played);
    if (pending.length === 0) return null;
    const groups = pending.map((t) => t.groupKey).join("/");
    return `La asignación exacta de algunos terceros puede cambiar según cierren los grupos ${groups}.`;
  }
  return "Esto depende de que se definan los 8 mejores terceros según combinación FIFA (Anexo C).";
}

/** Compara dos snapshots y genera mensajes de movimiento en tabla. */
export function diffLiveSnapshots(
  before: LiveWorldCupSnapshot,
  after: LiveWorldCupSnapshot,
): LiveScenarioMessage[] {
  const messages: LiveScenarioMessage[] = [];

  for (const group of after.groups) {
    const prev = before.groups.find((g) => g.groupKey === group.groupKey);
    if (!prev) continue;

    for (const team of group.teams) {
      const prevTeam = prev.teams.find((t) => t.teamId === team.teamId);
      if (!prevTeam || prevTeam.position === team.position) continue;

      messages.push({
        kind: "position",
        teamId: team.teamId,
        teamName: team.teamName,
        text: `${team.teamName} pasa del ${prevTeam.position}.º al ${team.position}.º en el Grupo ${group.groupKey}.`,
      });
    }
  }

  for (const teamId of new Set(messages.map((m) => m.teamId))) {
    const knockout = describeProvisionalKnockoutOpponent(teamId, after);
    if (knockout) {
      const name =
        after.groups.flatMap((g) => g.teams).find((t) => t.teamId === teamId)
          ?.teamName ?? teamId;
      messages.push({
        kind: "knockout",
        teamId,
        teamName: name,
        text: knockout,
      });
    }
  }

  const dep = describeBestThirdDependency(after);
  if (dep) {
    messages.push({
      kind: "best_third",
      teamId: "",
      teamName: "",
      text: dep,
    });
  }

  return messages;
}

export { getProvisionalOpponent, type ProvisionalOpponentResult };
