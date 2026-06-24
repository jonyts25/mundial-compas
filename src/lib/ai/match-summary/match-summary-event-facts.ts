import { formatTimelineMinute } from "@/lib/ai/match-summary/match-summary-event-text";
import type {
  EventFactLocked,
  MatchSummaryInput,
  MatchSummaryTimelineType,
} from "@/lib/ai/match-summary/match-summary-types";

const SCORING_TYPES = new Set<MatchSummaryTimelineType>([
  "gol",
  "penalty_goal",
  "own_goal",
]);

function normalizeDetail(detail: string | null): string {
  return (detail ?? "").trim();
}

function isPenaltyDetail(detail: string | null): boolean {
  const d = normalizeDetail(detail).toLowerCase();
  return d.includes("penalty");
}

function isOwnGoalDetail(
  detail: string | null,
  type: MatchSummaryTimelineType,
): boolean {
  if (type === "own_goal") return true;
  const d = normalizeDetail(detail).toLowerCase();
  return d.includes("own goal");
}

function isSecondYellowDetail(detail: string | null): boolean {
  const d = normalizeDetail(detail).toLowerCase();
  return d.includes("second yellow") || d.includes("2nd yellow");
}

function resolveTeamName(
  teamCode: string,
  match: MatchSummaryInput["match"],
): string {
  if (teamCode === match.home_code) return match.home_name;
  if (teamCode === match.away_code) return match.away_name;
  return teamCode;
}

function buildEventFactId(event: MatchSummaryInput["timeline"][number]): string {
  return `${event.type}:${event.team_code}:${event.player}:${event.minute ?? "?"}:${event.extra ?? 0}`;
}

function buildGoalSentence(
  teamName: string,
  playerName: string,
  minuteLabel: string,
  detail: string | null,
  type: MatchSummaryTimelineType,
  isFirstMatchGoal: boolean,
): string {
  if (isOwnGoalDetail(detail, type)) {
    return `${teamName} recibió autogol de ${playerName} al ${minuteLabel}.`;
  }
  if (type === "penalty_goal" || isPenaltyDetail(detail)) {
    if (isFirstMatchGoal) {
      return `${teamName} abrió el marcador al ${minuteLabel} con gol de penal de ${playerName}.`;
    }
    return `${teamName} anotó al ${minuteLabel} con gol de penal de ${playerName}.`;
  }
  if (isFirstMatchGoal) {
    return `${teamName} abrió el marcador al ${minuteLabel} con gol de ${playerName}.`;
  }
  return `${teamName} anotó al ${minuteLabel} con gol de ${playerName}.`;
}

function buildRedCardSentence(
  teamName: string,
  playerName: string,
  minuteLabel: string,
  detail: string | null,
): string {
  if (isSecondYellowDetail(detail)) {
    return `${playerName} fue expulsado por ${teamName} al ${minuteLabel} por segunda tarjeta amarilla.`;
  }
  return `${playerName} fue expulsado por ${teamName} al ${minuteLabel}.`;
}

function buildEventFactSentence(
  event: MatchSummaryInput["timeline"][number],
  match: MatchSummaryInput["match"],
  isFirstMatchGoal: boolean,
): string {
  const minuteLabel = formatTimelineMinute(event.minute, event.extra);
  const teamName = resolveTeamName(event.team_code, match);
  const playerName = event.player.trim() || event.team_code;
  const detail = normalizeDetail(event.detail);

  switch (event.type) {
    case "gol":
    case "penalty_goal":
    case "own_goal":
      return buildGoalSentence(
        teamName,
        playerName,
        minuteLabel,
        detail,
        event.type,
        isFirstMatchGoal,
      );
    case "tarjeta_roja":
      return buildRedCardSentence(teamName, playerName, minuteLabel, detail);
    case "penal_fallado":
      return `${playerName} falló un penal al ${minuteLabel} (${teamName}).`;
    case "gol_anulado":
      return `Gol anulado a ${playerName} (${teamName}) al ${minuteLabel}.`;
    case "var": {
      const label = detail || "revisión";
      return `Revisión VAR al ${minuteLabel}: ${label} (${playerName}, ${teamName}).`;
    }
    default:
      return `Incidente de ${playerName} (${teamName}) al ${minuteLabel}.`;
  }
}

/** Oraciones determinísticas por evento — única fuente para event_paragraphs. */
export function buildEventFactsLocked(
  input: MatchSummaryInput,
): EventFactLocked[] {
  const sorted = [...input.timeline].sort((a, b) => {
    const ka = (a.minute ?? 9999) * 100 + (a.extra ?? 0);
    const kb = (b.minute ?? 9999) * 100 + (b.extra ?? 0);
    return ka - kb;
  });

  let firstGoalSeen = false;

  return sorted.map((event) => {
    const isFirstMatchGoal =
      SCORING_TYPES.has(event.type) && !firstGoalSeen;
    if (isFirstMatchGoal) firstGoalSeen = true;

    const minuteLabel = formatTimelineMinute(event.minute, event.extra);
    const teamName = resolveTeamName(event.team_code, input.match);
    const playerName = event.player.trim() || event.team_code;

    return {
      id: buildEventFactId(event),
      minute_label: minuteLabel,
      team_name: teamName,
      player_name: playerName,
      type: event.type,
      sentence: buildEventFactSentence(event, input.match, isFirstMatchGoal),
    };
  });
}
