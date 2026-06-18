function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name];
}

function trimEnv(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

/** Variables de servidor (API routes). No importar en componentes cliente. */
export function getServerEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    apiFootballWebhookSecret: optional("API_FOOTBALL_WEBHOOK_SECRET") ?? "",
    apiFootballWebhookSignatureHeader:
      optional("API_FOOTBALL_WEBHOOK_SIGNATURE_HEADER") ??
      "x-api-football-signature",
  };
}

export function getAdminEnv() {
  return {
    cargarPartidosSecret: required("ADMIN_CARGAR_PARTIDOS_SECRET"),
  };
}

/** api-sports.io — header x-apisports-key */
export function getApiSportsEnv() {
  const apiKey = trimEnv(required("API_SPORTS_KEY"));
  if (!apiKey) {
    throw new Error("API_SPORTS_KEY está definida pero vacía tras trim");
  }
  return {
    apiKey,
    timezone: optional("API_SPORTS_TIMEZONE") ?? "America/Mexico_City",
    worldCupLeagueId: Number(optional("API_SPORTS_LEAGUE_ID") ?? "1"),
    worldCupSeason: Number(optional("API_SPORTS_SEASON") ?? "2026"),
    pilotDate: optional("API_SPORTS_PILOT_DATE") ?? "2026-06-04",
    pilotTeamId: Number(optional("API_SPORTS_PILOT_TEAM_ID") ?? "16"),
    pilotFixtureId: optional("API_SPORTS_PILOT_FIXTURE_ID")
      ? Number(optional("API_SPORTS_PILOT_FIXTURE_ID"))
      : undefined,
  };
}

/** @deprecated Siempre api-sports. Mantener firma por compatibilidad. */
export function getFootballDataProvider(): "api-sports" {
  return "api-sports";
}

/** @deprecated Usar getApiSportsEnv */
export function getApiFootballEnv() {
  return getApiSportsEnv();
}
