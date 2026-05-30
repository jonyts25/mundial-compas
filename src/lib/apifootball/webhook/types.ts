import type { MatchPeriod } from "@/lib/partidos/match-clock";
import type { EstatusPartido } from "@/types/database";

/** Formato estilo API-Sports / relay con arreglo incidents */
export interface WebhookIncident {
  type?: string;
  detail?: string;
  time?: { elapsed?: number | string; extra?: number | string | null };
  player?: { id?: number | string; name?: string };
  team?: { id?: number | string; name?: string };
  comments?: string | null;
  assist?: { name?: string } | null;
}

/** Push livescore apifootball.com (WebSocket / HTTP relay) */
export interface ApifootballGoalscorerRow {
  time?: string;
  home_scorer?: string;
  home_scorer_id?: string;
  away_scorer?: string;
  away_scorer_id?: string;
  score?: string;
  info?: string;
  home_assist?: string;
  away_assist?: string;
  score_info_time?: string;
}

export interface ApifootballCardRow {
  time?: string;
  home_fault?: string;
  away_fault?: string;
  card?: string;
  info?: string;
}

export interface ApifootballLiveMatchPayload {
  match_id?: string | number;
  match_hometeam_name?: string;
  match_awayteam_name?: string;
  match_hometeam_score?: string | number;
  match_awayteam_score?: string | number;
  match_hometeam_penalty_score?: string | number | null;
  match_awayteam_penalty_score?: string | number | null;
  match_status?: string;
  match_live?: string | number;
  goalscorer?: ApifootballGoalscorerRow[];
  cards?: ApifootballCardRow[];
  incidents?: WebhookIncident[];
  fixture?: {
    id?: number | string;
    status?: { short?: string; elapsed?: number | null };
    goals?: { home?: number | null; away?: number | null };
  };
  [key: string]: unknown;
}

export type MatchPhaseKind =
  | "kickoff"
  | "halftime"
  | "second_half"
  | "extra_time_1st"
  | "extra_time_halftime"
  | "extra_time_2nd"
  | "penalties"
  | "fulltime";

export type NormalizedLiveEvent =
  | {
      kind: "goal";
      eventKey: string;
      player: string;
      teamName: string;
      minute: number | null;
      isPenalty: boolean;
      isOwnGoal: boolean;
      isHome: boolean;
    }
  | {
      kind: "red_card";
      eventKey: string;
      player: string;
      teamName: string;
      minute: number | null;
    }
  | { kind: "match_phase"; eventKey: string; phase: MatchPhaseKind }
  | {
      kind: "penalty_scored";
      eventKey: string;
      player: string;
      teamName: string;
      isHome: boolean;
      penHome: number;
      penAway: number;
    }
  | {
      kind: "penalty_missed";
      eventKey: string;
      player: string | null;
      teamName: string;
      isHome: boolean;
      penHome: number;
      penAway: number;
    };

export interface NormalizedMatchSnapshot {
  fixtureId: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  estatus: EstatusPartido;
  minute: number | null;
  statusRaw: string;
  period: MatchPeriod;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  penaltyKeysToPersist: string[];
  events: NormalizedLiveEvent[];
}
