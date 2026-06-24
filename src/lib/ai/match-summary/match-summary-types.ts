import type { SportsNarratorPersonaId } from "@/lib/ai/sports-narrator-personas";

export type MatchSummaryTimelineType =
  | "gol"
  | "tarjeta_roja"
  | "penalty_goal"
  | "own_goal"
  | "penal_fallado"
  | "var"
  | "gol_anulado";

export interface MatchSummaryInput {
  version: "match-summary-v1";
  partido_id: string;
  fixture_id: number | null;
  persona_id: SportsNarratorPersonaId;
  locale: "es-MX";
  match: {
    home_code: string;
    home_name: string;
    away_code: string;
    away_name: string;
    score_home: number;
    score_away: number;
    status: "finalizado" | "en_vivo";
    phase: string;
    group: string | null;
    jornada: number | null;
    venue: string | null;
    referee: string | null;
    kickoff_iso: string;
  };
  timeline: Array<{
    minute: number | null;
    extra: number | null;
    type: MatchSummaryTimelineType;
    player: string;
    team_code: string;
    detail: string | null;
  }>;
  statistics: {
    possession_home_pct: number | null;
    possession_away_pct: number | null;
    shots_on_home: number | null;
    shots_on_away: number | null;
    corners_home: number | null;
    corners_away: number | null;
    xg_home: number | null;
    xg_away: number | null;
  } | null;
  lineups: {
    home_formation: string | null;
    away_formation: string | null;
  } | null;
  standings_context: {
    home_position_before: number | null;
    home_position_after: number | null;
    away_position_before: number | null;
    away_position_after: number | null;
    group_letter: string | null;
  } | null;
  quiniela_impact: {
    liga_scope: "global" | "grupo";
    picks_total: number;
    most_common_score: string | null;
    most_common_score_pct: number | null;
    exact_hits_estimated: number | null;
    trend_hits_estimated: number | null;
  } | null;
  data_gaps: string[];
}

export type MatchSummaryConfidence = "alta" | "media" | "baja";

export interface MatchSummaryOutput {
  version: "match-summary-v1";
  partido_id: string;
  persona_id: SportsNarratorPersonaId;
  headline: string;
  lede: string;
  body_paragraphs: string[];
  standout_player: {
    name: string;
    reason: string;
  } | null;
  facts: string[];
  table_impact: string | null;
  quiniela_impact: string | null;
  confidence: MatchSummaryConfidence;
  data_gaps_acknowledged: string[];
}

export interface BuildMatchSummaryInputOptions {
  persona_id: SportsNarratorPersonaId;
  liga_id?: string;
}
