import type { MatchPhaseKind } from "@/lib/api-football/push/types";
import type { MatchPeriod } from "@/lib/partidos/match-clock";

export function getAnnouncedPhases(metadata: unknown): MatchPhaseKind[] {
  if (!metadata || typeof metadata !== "object") return [];
  const arr = (metadata as Record<string, unknown>).announced_phases;
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is MatchPhaseKind => typeof x === "string");
}

/** Partido ya en curso al cargar — no spamear fases pasadas. */
export function baselineAnnouncedPhases(period: MatchPeriod): MatchPhaseKind[] {
  switch (period) {
    case "HT":
      return ["kickoff"];
    case "2H":
      return ["kickoff", "halftime"];
    case "ET1":
      return ["kickoff", "halftime", "second_half"];
    case "ET_HT":
      return ["kickoff", "halftime", "second_half", "extra_time_1st"];
    case "ET2":
      return ["kickoff", "halftime", "second_half", "extra_time_1st", "extra_time_halftime"];
    case "PEN":
      return [
        "kickoff",
        "halftime",
        "second_half",
        "extra_time_1st",
        "extra_time_halftime",
        "extra_time_2nd",
        "penalties",
      ];
    case "FT":
    case "AET":
    case "AP":
      return [
        "kickoff",
        "halftime",
        "second_half",
        "fulltime",
      ];
    default:
      return period === "1H" ? [] : [];
  }
}
