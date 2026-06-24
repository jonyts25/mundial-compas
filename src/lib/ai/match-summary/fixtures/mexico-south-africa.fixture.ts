import type { MatchSummaryInput } from "@/lib/ai/match-summary/match-summary-types";
import { enrichMatchSummaryInput } from "@/lib/ai/match-summary/match-summary-verified-facts";
import { DEFAULT_NARRATOR_PERSONA_ID } from "@/lib/ai/sports-narrator-personas";

/**
 * México vs Sudáfrica — fixture 1489369, 2-0.
 * VAR Card upgrade (Zwane 82') — NO expulsión ni segunda amarilla en datos.
 */
export const MEXICO_SOUTH_AFRICA_PARTIDO_ID =
  "e04a2b98-cc15-42cf-9798-9a64d3317641";

export const MEXICO_SOUTH_AFRICA_FIXTURE_ID = 1489369;

const BASE_INPUT: MatchSummaryInput = {
  version: "match-summary-v1",
  partido_id: MEXICO_SOUTH_AFRICA_PARTIDO_ID,
  fixture_id: MEXICO_SOUTH_AFRICA_FIXTURE_ID,
  persona_id: DEFAULT_NARRATOR_PERSONA_ID,
  locale: "es-MX",
  match: {
    home_code: "MEX",
    home_name: "Mexico",
    away_code: "RSA",
    away_name: "South Africa",
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
      minute: 12,
      extra: null,
      type: "gol",
      player: "H. Martin",
      team_code: "MEX",
      detail: "Normal Goal",
    },
    {
      minute: 55,
      extra: null,
      type: "gol",
      player: "A. Guevara",
      team_code: "MEX",
      detail: "Normal Goal",
    },
    {
      minute: 82,
      extra: null,
      type: "var",
      player: "Themba Zwane",
      team_code: "RSA",
      detail: "Card upgrade",
    },
  ],
  statistics: {
    possession_home_pct: 61,
    possession_away_pct: 39,
    shots_on_home: 16,
    shots_on_away: 3,
    corners_home: 7,
    corners_away: 2,
    xg_home: 1.8,
    xg_away: 0.4,
  },
  lineups: {
    home_formation: "4-3-3",
    away_formation: "4-2-3-1",
  },
  standings_context: {
    home_position_before: null,
    home_position_after: 1,
    away_position_before: null,
    away_position_after: 3,
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

export function buildMexicoSouthAfricaMatchSummaryInput(): MatchSummaryInput {
  return enrichMatchSummaryInput(BASE_INPUT);
}
