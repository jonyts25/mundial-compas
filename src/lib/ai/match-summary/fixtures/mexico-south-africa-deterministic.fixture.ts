import type { MatchSummaryInput } from "@/lib/ai/match-summary/match-summary-types";
import { enrichMatchSummaryInput } from "@/lib/ai/match-summary/match-summary-verified-facts";
import { DEFAULT_NARRATOR_PERSONA_ID } from "@/lib/ai/sports-narrator-personas";

/**
 * México vs Sudáfrica — fixture determinístico (MATCH-SUMMARY-DETERMINISTIC-EVENTS-1).
 * 2-0 con tres expulsiones; nombres API sin expandir.
 */
export const MEXICO_SOUTH_AFRICA_DETERMINISTIC_PARTIDO_ID =
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const BASE_INPUT: MatchSummaryInput = {
  version: "match-summary-v1",
  partido_id: MEXICO_SOUTH_AFRICA_DETERMINISTIC_PARTIDO_ID,
  fixture_id: 1489369,
  persona_id: DEFAULT_NARRATOR_PERSONA_ID,
  locale: "es-MX",
  match: {
    home_code: "MEX",
    home_name: "México",
    away_code: "RSA",
    away_name: "Sudáfrica",
    score_home: 2,
    score_away: 0,
    status: "finalizado",
    phase: "grupos",
    group: "A",
    jornada: 1,
    venue: "Estadio Azteca",
    referee: "Michael Oliver",
    kickoff_iso: "2026-06-11T19:00:00.000Z",
  },
  timeline: [
    {
      minute: 9,
      extra: null,
      type: "gol",
      player: "J. Quinones",
      team_code: "MEX",
      detail: "Normal Goal",
    },
    {
      minute: 49,
      extra: null,
      type: "tarjeta_roja",
      player: "Siphephelo Sithole",
      team_code: "RSA",
      detail: "Red Card",
    },
    {
      minute: 67,
      extra: null,
      type: "gol",
      player: "R. Jimenez",
      team_code: "MEX",
      detail: "Normal Goal",
    },
    {
      minute: 84,
      extra: null,
      type: "tarjeta_roja",
      player: "Themba Zwane",
      team_code: "RSA",
      detail: "Red Card",
    },
    {
      minute: 90,
      extra: 2,
      type: "tarjeta_roja",
      player: "César Montes",
      team_code: "MEX",
      detail: "Red Card",
    },
  ],
  statistics: {
    possession_home_pct: 58,
    possession_away_pct: 42,
    shots_on_home: 12,
    shots_on_away: 4,
    corners_home: 6,
    corners_away: 3,
    xg_home: 1.6,
    xg_away: 0.5,
  },
  lineups: {
    home_formation: "4-3-3",
    away_formation: "4-2-3-1",
  },
  standings_context: {
    home_position_before: null,
    home_position_after: 1,
    away_position_before: null,
    away_position_after: 4,
    group_letter: "A",
  },
  quiniela_impact: {
    liga_scope: "global",
    picks_total: 120,
    most_common_score: "2-0",
    most_common_score_pct: 18.3,
    exact_hits_estimated: 22,
    trend_hits_estimated: 85,
  },
  data_gaps: [],
};

export function buildMexicoSouthAfricaDeterministicInput(): MatchSummaryInput {
  return enrichMatchSummaryInput(BASE_INPUT);
}
