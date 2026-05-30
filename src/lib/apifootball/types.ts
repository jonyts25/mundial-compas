/** Evento / partido — action=get_events (apifootball.com) */
export interface ApifootballEvent {
  match_id: string;
  country_id?: string;
  country_name?: string;
  league_id: string;
  league_name?: string;
  match_date: string;
  match_time?: string;
  match_status: string;
  match_hometeam_id?: string;
  match_hometeam_name: string;
  match_awayteam_id?: string;
  match_awayteam_name: string;
  match_hometeam_score?: string;
  match_awayteam_score?: string;
  match_round?: string;
  match_stadium?: string;
  match_live?: string;
  stage_name?: string;
  league_year?: string;
  team_home_badge?: string;
  team_away_badge?: string;
  [key: string]: unknown;
}

export interface ApifootballLeague {
  league_id: string;
  league_name: string;
  league_season?: string;
  league_year?: string;
  country_name?: string;
  country_id?: string;
}

export interface ApifootballCountry {
  country_id: string;
  country_name: string;
}

/** Fila — action=get_standings (apifootball.com) */
export interface ApifootballStandingRow {
  country_name?: string;
  league_id: string;
  league_name?: string;
  team_id: string;
  team_name: string;
  overall_league_position: string;
  overall_league_payed: string;
  overall_league_W: string;
  overall_league_D: string;
  overall_league_L: string;
  overall_league_GF: string;
  overall_league_GA: string;
  overall_league_PTS: string;
  league_round?: string;
  stage_name?: string;
  team_badge?: string;
  fk_stage_key?: string;
  [key: string]: unknown;
}
