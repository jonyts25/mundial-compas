/**
 * Escenarios FIFA en vivo — card UI, diff de snapshots y mensajes del motor.
 * Reutiliza live-group-scenarios + standings sin duplicar reglas.
 */

import type { BestThirdPlaceRow } from "@/lib/standings/best-third-places";
import type { KnockoutTeamSlot } from "@/lib/standings/knockout-bracket-types";
import type { StandingGroup } from "@/lib/standings/types";
import type { WorldCupGroupLetter } from "@/lib/standings/world-cup-groups";
import {
  buildLiveWorldCupSnapshot,
  describeBestThirdDependency,
  getProvisionalOpponent,
  type LiveWorldCupSnapshot,
  type PartidoGrupoRow,
} from "@/lib/world-cup/live-group-scenarios";

export type FifaScenarioChangeType =
  | "leader_changed"
  | "second_changed"
  | "third_qualifier_changed"
  | "provisional_opponent_changed"
  | "bracket_scenario_changed";

export interface FifaScenarioChangeEvent {
  type: FifaScenarioChangeType;
  teamId: string;
  teamName: string;
  text: string;
}

export interface GroupProvisionalSummary {
  groupKey: WorldCupGroupLetter;
  leader: { teamId: string; teamName: string } | null;
  second: { teamId: string; teamName: string } | null;
  third: { teamId: string; teamName: string } | null;
}

export interface LiveScenarioCardModel {
  fingerprint: string;
  isProvisional: boolean;
  scenarioKey: string | null;
  groupStageComplete: boolean;
  groupSummaries: GroupProvisionalSummary[];
  qualifyingThirds: BestThirdPlaceRow[];
  statements: string[];
  changes: FifaScenarioChangeEvent[];
  snapshotState: LiveSnapshotState;
}

export interface LiveSnapshotState {
  fingerprint: string;
  positions: Record<string, { groupKey: string; position: number; teamName: string }>;
  opponents: Record<string, { label: string; matchNumber: number; isProvisional: boolean }>;
  scenarioKey: string | null;
  qualifyingThirdTeamIds: string[];
}

const FORBIDDEN_HEURISTIC_PATTERNS = [
  /a un gol/i,
  /est[aá] a un gol/i,
  /marca un gol/i,
  /cae un gol/i,
  /con un gol/i,
  /le quita el liderato/i,
  /le quitar[ií]a el liderato/i,
  /m[eé]xico baja/i,
];

export function assertFifaScenarioMessage(text: string): void {
  for (const pattern of FORBIDDEN_HEURISTIC_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Mensaje heurístico prohibido: "${text}"`);
    }
  }
}

function teamAtPosition(
  group: StandingGroup,
  position: 1 | 2 | 3,
): { teamId: string; teamName: string } | null {
  const row = group.teams.find((t) => t.position === position);
  if (!row) return null;
  return { teamId: row.teamId, teamName: row.teamName };
}

function opponentLabel(slot: KnockoutTeamSlot): string {
  return slot.teamName?.trim() || slot.label;
}

export function buildGroupProvisionalSummaries(
  groups: StandingGroup[],
): GroupProvisionalSummary[] {
  return groups
    .filter((g) => g.teams.some((t) => t.played > 0))
    .map((g) => ({
      groupKey: g.groupKey as WorldCupGroupLetter,
      leader: teamAtPosition(g, 1),
      second: teamAtPosition(g, 2),
      third: teamAtPosition(g, 3),
    }));
}

export function serializeLiveSnapshotState(
  snapshot: LiveWorldCupSnapshot,
): LiveSnapshotState {
  const positions: LiveSnapshotState["positions"] = {};
  for (const group of snapshot.groups) {
    for (const team of group.teams) {
      positions[team.teamId] = {
        groupKey: group.groupKey,
        position: team.position,
        teamName: team.teamName,
      };
    }
  }

  const opponents: LiveSnapshotState["opponents"] = {};
  for (const group of snapshot.groups) {
    for (const team of group.teams) {
      if (team.position > 2) continue;
      const opp = getProvisionalOpponent(team.teamId, snapshot.r32);
      if (!opp) continue;
      opponents[team.teamId] = {
        label: opponentLabel(opp.opponent),
        matchNumber: opp.matchNumber,
        isProvisional: opp.isProvisional,
      };
    }
  }

  const qualifyingThirdTeamIds = snapshot.bestThirds
    .filter((t) => t.qualifies)
    .map((t) => t.teamId);

  const fingerprint = JSON.stringify({
    positions,
    opponents,
    scenarioKey: snapshot.scenarioKey,
    qualifyingThirdTeamIds,
  });

  return {
    fingerprint,
    positions,
    opponents,
    scenarioKey: snapshot.scenarioKey,
    qualifyingThirdTeamIds,
  };
}

function ordinal(position: number): string {
  if (position === 1) return "1.º";
  if (position === 2) return "2.º";
  return "3.º";
}

export function detectFifaScenarioChanges(
  before: LiveSnapshotState,
  after: LiveSnapshotState,
): FifaScenarioChangeEvent[] {
  const events: FifaScenarioChangeEvent[] = [];

  for (const [teamId, afterPos] of Object.entries(after.positions)) {
    const beforePos = before.positions[teamId];
    if (!beforePos || beforePos.position === afterPos.position) continue;

    if (afterPos.position === 1 || beforePos.position === 1) {
      events.push({
        type: "leader_changed",
        teamId,
        teamName: afterPos.teamName,
        text: `⚠️ ${afterPos.teamName} pasa del ${ordinal(beforePos.position)} al ${ordinal(afterPos.position)} en el Grupo ${afterPos.groupKey}.`,
      });
    } else if (afterPos.position === 2 || beforePos.position === 2) {
      events.push({
        type: "second_changed",
        teamId,
        teamName: afterPos.teamName,
        text: `⚠️ ${afterPos.teamName} pasa del ${ordinal(beforePos.position)} al ${ordinal(afterPos.position)} en el Grupo ${afterPos.groupKey}.`,
      });
    } else {
      events.push({
        type: "third_qualifier_changed",
        teamId,
        teamName: afterPos.teamName,
        text: `⚠️ ${afterPos.teamName} pasa del ${ordinal(beforePos.position)} al ${ordinal(afterPos.position)} en el Grupo ${afterPos.groupKey}.`,
      });
    }
  }

  const beforeThirds = new Set(before.qualifyingThirdTeamIds);
  const afterThirds = new Set(after.qualifyingThirdTeamIds);
  for (const teamId of afterThirds) {
    if (beforeThirds.has(teamId)) continue;
    const pos = after.positions[teamId];
    if (!pos) continue;
    events.push({
      type: "third_qualifier_changed",
      teamId,
      teamName: pos.teamName,
      text: `⚠️ ${pos.teamName} entra provisionalmente como mejor tercero.`,
    });
  }
  for (const teamId of beforeThirds) {
    if (afterThirds.has(teamId)) continue;
    const pos = before.positions[teamId];
    if (!pos) continue;
    events.push({
      type: "third_qualifier_changed",
      teamId,
      teamName: pos.teamName,
      text: `⚠️ ${pos.teamName} sale de puestos de clasificación como mejor tercero.`,
    });
  }

  for (const [teamId, afterOpp] of Object.entries(after.opponents)) {
    const beforeOpp = before.opponents[teamId];
    if (!beforeOpp) continue;
    if (
      beforeOpp.label === afterOpp.label &&
      beforeOpp.matchNumber === afterOpp.matchNumber
    ) {
      continue;
    }
    const pos = after.positions[teamId];
    if (!pos) continue;
    events.push({
      type: "provisional_opponent_changed",
      teamId,
      teamName: pos.teamName,
      text: `⚠️ ${pos.teamName} cambia de rival provisional: pasa de ${beforeOpp.label} a ${afterOpp.label}.`,
    });
  }

  if (before.scenarioKey !== after.scenarioKey) {
    events.push({
      type: "bracket_scenario_changed",
      teamId: "",
      teamName: "",
      text: `⚠️ Cambió la combinación FIFA de mejores terceros (Anexo C).`,
    });
  }

  for (const event of events) {
    assertFifaScenarioMessage(event.text);
  }

  return events;
}

export function buildFifaScenarioStatements(
  snapshot: LiveWorldCupSnapshot,
  focusTeamIds: string[] = ["MEX"],
): string[] {
  const statements: string[] = [];
  const summaries = buildGroupProvisionalSummaries(snapshot.groups);

  for (const summary of summaries) {
    if (summary.leader) {
      statements.push(
        `${summary.leader.teamName} terminaría como líder del Grupo ${summary.groupKey}.`,
      );
    }
    if (summary.second) {
      statements.push(
        `${summary.second.teamName} sería ${ordinal(2)} del Grupo ${summary.groupKey}.`,
      );
    }
  }

  for (const teamId of focusTeamIds) {
    const pos = snapshot.groups
      .flatMap((g) => g.teams.map((t) => ({ ...t, groupKey: g.groupKey })))
      .find((t) => t.teamId === teamId);
    if (!pos || pos.position > 2) continue;

    const opp = getProvisionalOpponent(teamId, snapshot.r32);
    if (!opp) continue;

    const label = opponentLabel(opp.opponent);
    if (opp.opponent.isProvisional || opp.isProvisional) {
      statements.push(
        `El rival provisional de ${pos.teamName} sería ${label} (Anexo C).`,
      );
    } else {
      statements.push(
        `El rival provisional de ${pos.teamName} sería ${label}.`,
      );
    }
  }

  const dep = describeBestThirdDependency(snapshot);
  if (dep) statements.push(dep);

  if (snapshot.groupStageComplete) {
    statements.push("Fase de grupos cerrada — cruces confirmados por el motor FIFA.");
  } else if (snapshot.r32.isProvisional) {
    statements.push(
      "Los cruces siguen siendo provisionales hasta que terminen todos los grupos.",
    );
  }

  for (const statement of statements) {
    assertFifaScenarioMessage(statement);
  }

  return statements;
}

export function buildLiveScenarioCardModel(
  partidos: PartidoGrupoRow[],
  previousState: LiveSnapshotState | null = null,
  focusTeamIds: string[] = ["MEX"],
): LiveScenarioCardModel {
  const snapshot = buildLiveWorldCupSnapshot(partidos);
  const current = serializeLiveSnapshotState(snapshot);
  const changes = previousState
    ? detectFifaScenarioChanges(previousState, current)
    : [];

  const statements = buildFifaScenarioStatements(snapshot, focusTeamIds);

  if (changes.length === 0 && previousState) {
    const focus = focusTeamIds
      .map((id) => current.positions[id])
      .find(Boolean);
    if (focus?.position === 1) {
      statements.unshift(
        `${focus.teamName} mantiene el liderato del Grupo ${focus.groupKey}.`,
      );
    }
    const opp = focusTeamIds.map((id) => current.opponents[id]).find(Boolean);
    if (opp) {
      statements.push(
        `Su rival provisional sigue siendo ${opp.label}.`,
      );
    }
    statements.push("No hubo cambios de clasificación desde la última actualización.");
  }

  for (const statement of statements) {
    assertFifaScenarioMessage(statement);
  }

  return {
    fingerprint: current.fingerprint,
    isProvisional: snapshot.r32.isProvisional,
    scenarioKey: snapshot.scenarioKey,
    groupStageComplete: snapshot.groupStageComplete,
    groupSummaries: buildGroupProvisionalSummaries(snapshot.groups),
    qualifyingThirds: snapshot.bestThirds.filter((t) => t.qualifies),
    statements: [...changes.map((c) => c.text), ...statements],
    changes,
    snapshotState: current,
  };
}

/** @deprecated Usar detectFifaScenarioChanges */
export function diffLiveSnapshotsFifa(
  before: LiveWorldCupSnapshot,
  after: LiveWorldCupSnapshot,
): FifaScenarioChangeEvent[] {
  return detectFifaScenarioChanges(
    serializeLiveSnapshotState(before),
    serializeLiveSnapshotState(after),
  );
}
