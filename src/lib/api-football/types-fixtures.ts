/** Respuesta de GET /fixtures (API-Football v3) */
export interface ApiFootballFixtureItem {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue?: { name?: string | null; city?: string | null };
    status: {
      short: string;
      long: string;
      elapsed: number | null;
      /** Minutos de tiempo añadido (api-sports); con elapsed forma el minuto total. */
      extra?: number | null;
    };
  };
  league: {
    id?: number;
    name?: string;
    country?: string;
    round?: string | null;
    season: number;
  };
  teams: {
    home: ApiFootballTeam;
    away: ApiFootballTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score?: {
    penalty?: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface ApiFootballTeam {
  id: number;
  name: string;
  code?: string | null;
  logo?: string | null;
}

export interface ApiFootballFixturesResponse {
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: ApiFootballFixtureItem[];
}
