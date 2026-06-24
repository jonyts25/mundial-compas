import type {
  MatchSummaryInput,
  MatchSummaryTimelineType,
} from "@/lib/ai/match-summary/match-summary-types";

export function formatTimelineMinute(
  minute: number | null,
  extra: number | null,
): string {
  if (minute == null) return "—";
  if (extra != null && extra > 0) return `${minute}+${extra}'`;
  return `${minute}'`;
}

function normalizeDetail(detail: string | null): string {
  return (detail ?? "").trim();
}

function isSecondYellowDetail(detail: string | null): boolean {
  const d = normalizeDetail(detail).toLowerCase();
  return d.includes("second yellow") || d.includes("2nd yellow");
}

/** Texto factual del evento — única fuente para narrar incidentes. */
export function buildTimelineEventText(event: {
  type: MatchSummaryTimelineType;
  player: string;
  team_code: string;
  minute: number | null;
  extra: number | null;
  detail: string | null;
}): string {
  const min = formatTimelineMinute(event.minute, event.extra);
  const player = event.player.trim() || event.team_code;
  const detail = normalizeDetail(event.detail);

  switch (event.type) {
    case "gol":
      return `Gol de ${player} (${event.team_code}) al ${min}.`;
    case "penalty_goal":
      return `Gol de penal de ${player} (${event.team_code}) al ${min}.`;
    case "own_goal":
      return `Autogol de ${player} (${event.team_code}) al ${min}.`;
    case "penal_fallado":
      return `Penal fallado de ${player} (${event.team_code}) al ${min}.`;
    case "tarjeta_roja":
      if (isSecondYellowDetail(detail)) {
        return `Segunda amarilla y expulsión de ${player} (${event.team_code}) al ${min}.`;
      }
      return `Tarjeta roja a ${player} (${event.team_code}) al ${min}.`;
    case "gol_anulado":
      return `Gol anulado a ${player} (${event.team_code}) al ${min}${
        detail ? ` (${detail})` : ""
      }.`;
    case "var": {
      const label = detail || "revisión";
      return `Revisión VAR: ${label} — ${player} (${event.team_code}) al ${min}.`;
    }
    default:
      return `Evento de ${player} (${event.team_code}) al ${min}.`;
  }
}

export function enrichTimelineWithEventText(
  timeline: MatchSummaryInput["timeline"],
): MatchSummaryInput["timeline"] {
  return timeline.map((ev) => ({
    ...ev,
    event_text: buildTimelineEventText(ev),
  }));
}
