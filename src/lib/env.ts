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

/** Variables de servidor (API routes, webhooks). No importar en componentes cliente. */
export function getServerEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    apiFootballWebhookSecret: required("API_FOOTBALL_WEBHOOK_SECRET"),
    apiFootballWebhookSignatureHeader:
      optional("API_FOOTBALL_WEBHOOK_SIGNATURE_HEADER") ??
      "x-api-football-signature",
  };
}

/** apifootball.com (Codefeels) — APIkey en query string */
export function getApiFootballEnv() {
  const apiKey = trimEnv(required("API_FOOTBALL_KEY"));

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY está definida pero vacía tras trim");
  }

  return {
    apiKey,
    baseUrl: trimEnv(optional("API_FOOTBALL_BASE_URL") ?? "https://apiv3.apifootball.com/"),
    leagueId: optional("APIFOOTBALL_LEAGUE_ID")?.trim(),
    worldCupFrom: optional("APIFOOTBALL_WORLD_CUP_FROM") ?? "2026-06-01",
    worldCupTo: optional("APIFOOTBALL_WORLD_CUP_TO") ?? "2026-07-31",
    timezone: optional("APIFOOTBALL_TIMEZONE") ?? "America/Mexico_City",
  };
}

export function getAdminEnv() {
  return {
    cargarPartidosSecret: required("ADMIN_CARGAR_PARTIDOS_SECRET"),
  };
}

export type FootballDataProvider = "apifootball" | "api-sports";

/** Proveedor activo: apifootball.com (legacy) o api-sports.io (api-football). */
export function getFootballDataProvider(): FootballDataProvider {
  const raw = optional("FOOTBALL_DATA_PROVIDER")?.toLowerCase().trim();
  if (raw === "api-sports" || raw === "apisports" || raw === "api-football") {
    return "api-sports";
  }
  return "apifootball";
}

/** api-sports.io — header x-apisports-key */
export function getApiSportsEnv() {
  const apiKey = trimEnv(required("API_SPORTS_KEY"));
  if (!apiKey) {
    throw new Error("API_SPORTS_KEY está definida pero vacía tras trim");
  }
  return {
    apiKey,
    timezone: optional("APIFOOTBALL_TIMEZONE") ?? "America/Mexico_City",
    worldCupLeagueId: Number(optional("API_SPORTS_LEAGUE_ID") ?? "1"),
    worldCupSeason: Number(optional("API_SPORTS_SEASON") ?? "2026"),
    pilotDate: optional("API_SPORTS_PILOT_DATE") ?? "2026-06-04",
    pilotTeamId: Number(optional("API_SPORTS_PILOT_TEAM_ID") ?? "16"),
    pilotFixtureId: optional("API_SPORTS_PILOT_FIXTURE_ID")
      ? Number(optional("API_SPORTS_PILOT_FIXTURE_ID"))
      : undefined,
  };
}
