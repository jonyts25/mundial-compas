import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { diagnoseApifootballLeagues } from "@/lib/apifootball/diagnose-leagues";
import { fetchLeagueEvents } from "@/lib/apifootball/fetch-world-cup-events";
import { mapEventToPartidoRow } from "@/lib/apifootball/map-event-to-partido";
import { getPilotConfig } from "@/lib/apifootball/pilot-config";
import { searchLeaguesByKeyword } from "@/lib/apifootball/resolve-league";
import { loadApiSportsFixtures } from "@/lib/api-football/cargar-fixtures";
import { mapFixtureToPartidoRow } from "@/lib/api-football/map-fixture-row";
import { getAdminEnv, getApiFootballEnv, getFootballDataProvider } from "@/lib/env";
import { upsertPartidoRows } from "@/lib/partidos/upsert-partido-rows";
import { withSeasonIdRows } from "@/lib/partidos/with-season-id";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function verifyAdminSecret(headerValue: string | null, secret: string): boolean {
  if (!headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function errorPayload(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error), stack: undefined };
}

export async function GET() {
  const provider = getFootballDataProvider();
  return NextResponse.json({
    endpoint: "POST /api/admin/cargar-partidos",
    provider,
    providers: {
      apifootball: "apifootball.com — POST (default) o FOOTBALL_DATA_PROVIDER=apifootball",
      "api-sports": "api-sports.io — FOOTBALL_DATA_PROVIDER=api-sports + API_SPORTS_KEY",
    },
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    diagnostics: {
      countries: "POST ?diagnostic=countries (solo apifootball)",
      leagues: "POST ?diagnostic=leagues (solo apifootball)",
      champions: "POST ?diagnostic=leagues&search=champions",
    },
    pilot: {
      enabled: "PILOT_MODE_ENABLED=true en Railway",
      load: "POST ?modo=pilot",
      apiSports: "México vs Serbia: API_SPORTS_PILOT_DATE=2026-06-04, team=16",
    },
  });
}

export async function POST(request: Request) {
  try {
    const adminSecret = getAdminEnv().cargarPartidosSecret;

    const bearer = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    const headerSecret = request.headers.get("x-admin-secret");

    if (
      !verifyAdminSecret(bearer ?? null, adminSecret) &&
      !verifyAdminSecret(headerSecret, adminSecret)
    ) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const providerParam = url.searchParams.get("provider");
    const provider =
      providerParam === "api-sports" || providerParam === "apifootball"
        ? providerParam
        : getFootballDataProvider();
    const diagnosticMode = url.searchParams.get("diagnostic");
    const leagueSearch = url.searchParams.get("search");
    const modoPilot = url.searchParams.get("modo") === "pilot";

    if (provider === "api-sports") {
      return await cargarPartidosApiSports(request, url, modoPilot);
    }

    const { apiKey, leagueId, worldCupFrom, worldCupTo, timezone } =
      getApiFootballEnv();

    if (diagnosticMode === "countries") {
      const { fetchApifootballCountries } = await import(
        "@/lib/apifootball/fetch-world-cup-events"
      );
      const countries = await fetchApifootballCountries(apiKey);
      console.log("=== apifootball get_countries ===", countries.length, "países");
      return NextResponse.json({
        ok: true,
        diagnostic: "get_countries",
        count: countries.length,
        sample: countries.slice(0, 5),
      });
    }

    if (diagnosticMode === "leagues") {
      if (leagueSearch) {
        const candidates = await searchLeaguesByKeyword(apiKey, leagueSearch);
        return NextResponse.json({
          ok: true,
          diagnostic: "get_leagues_search",
          search: leagueSearch,
          candidates,
          envHint: candidates[0]
            ? `APIFOOTBALL_PILOT_LEAGUE_ID=${candidates[0].league_id}`
            : "Sin coincidencias; prueba search=uefa o search=champions",
        });
      }
      const result = await diagnoseApifootballLeagues(apiKey);
      console.log("=== apifootball get_leagues (Mundial) ===");
      console.log(JSON.stringify(result, null, 2));
      return NextResponse.json(result);
    }

    const pilot = getPilotConfig();
    const isPilotLoad = modoPilot;

    if (isPilotLoad) {
      console.log("[cargar-partidos] modo PILOT (fin de semana de prueba)…");
    } else {
      console.log("[cargar-partidos] apifootball.com → get_events (Mundial)…");
    }

    const pilotFrom =
      url.searchParams.get("from")?.trim() || pilot.from;
    const pilotTo = url.searchParams.get("to")?.trim() || pilot.to;

    const events = await fetchLeagueEvents(apiKey, {
      from: isPilotLoad ? pilotFrom : worldCupFrom,
      to: isPilotLoad ? pilotTo : worldCupTo,
      leagueId: isPilotLoad ? (pilot.leagueId ?? undefined) : (leagueId ?? undefined),
      timezone,
      validateKey: true,
      resolveChampions: isPilotLoad,
    });

    console.log(`[cargar-partidos] Eventos recibidos: ${events.length}`);

    if (events.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: isPilotLoad
            ? "get_events devolvió 0 partidos de prueba. Revisa fechas o APIFOOTBALL_PILOT_LEAGUE_ID."
            : "get_events devolvió 0 partidos. Revisa APIFOOTBALL_LEAGUE_ID o el rango de fechas.",
          hint: isPilotLoad
            ? "POST ?diagnostic=leagues&search=champions y ajusta APIFOOTBALL_PILOT_FROM / TO"
            : "Prueba ?diagnostic=leagues para obtener el league_id del Mundial 2026",
        },
        { status: 422 },
      );
    }

    const mapOptions = isPilotLoad
      ? { timezone, pilot: { label: pilot.label } }
      : { timezone };

    const rows = events.map((event, index) => {
      try {
        return mapEventToPartidoRow(event, mapOptions);
      } catch (mapErr) {
        const { message } = errorPayload(mapErr);
        throw new Error(
          `Error mapeando evento ${index} (match_id ${event.match_id}): ${message}`,
        );
      }
    });

    const supabase = createAdminClient();
    const { upserted, batchErrors } = await upsertPartidoRows(
      supabase,
      withSeasonIdRows(rows),
    );

    if (batchErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Uno o más lotes fallaron al insertar",
          fetched: events.length,
          upserted,
          batchErrors,
        },
        { status: 500 },
      );
    }

    console.log(`[cargar-partidos] ✅ ${upserted} partidos en Supabase`);

    return NextResponse.json({
      ok: true,
      provider: "apifootball.com",
      modo: isPilotLoad ? "pilot" : "mundial",
      fetched: events.length,
      upserted,
      ...(isPilotLoad
        ? {
            pilotLabel: pilot.label,
            pilotFrom: pilot.from,
            pilotTo: pilot.to,
            hint: "Activa PILOT_MODE_ENABLED=true en Railway para el banner en la app",
          }
        : {}),
    });
  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN CARGA:", error);
    const { message, stack } = errorPayload(error);
    return NextResponse.json({ ok: false, error: message, stack }, { status: 500 });
  }
}

async function cargarPartidosApiSports(
  request: Request,
  url: URL,
  modoPilot: boolean,
) {
  const pilot = getPilotConfig();
  const isPilotLoad = modoPilot;

  console.log(
    `[cargar-partidos] api-sports.io → fixtures${isPilotLoad ? " (pilot)" : ""}…`,
  );

  const dateParam = url.searchParams.get("date")?.trim();
  const teamParam = url.searchParams.get("team");
  const fixtureParam = url.searchParams.get("fixture");

  const { items, query } = await loadApiSportsFixtures({
    modoPilot: isPilotLoad,
    date: dateParam || undefined,
    team: teamParam ? Number(teamParam) : undefined,
    fixture: fixtureParam ? Number(fixtureParam) : undefined,
    league: url.searchParams.get("league")
      ? Number(url.searchParams.get("league"))
      : undefined,
    season: url.searchParams.get("season")
      ? Number(url.searchParams.get("season"))
      : undefined,
  });

  console.log(`[cargar-partidos] Fixtures recibidos: ${items.length}`, query);

  if (items.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: isPilotLoad
          ? "api-sports devolvió 0 fixtures de prueba. Revisa API_SPORTS_PILOT_DATE o fixture id."
          : "api-sports devolvió 0 fixtures. Revisa league/season o date.",
        query,
        hint: "node scripts/discover-api-sports.mjs — o POST ?modo=pilot&date=2026-06-04&team=16",
      },
      { status: 422 },
    );
  }

  const mapOptions = isPilotLoad
    ? { pilot: { label: pilot.label } }
    : {};

  const rows = items.map((item, index) => {
    try {
      return mapFixtureToPartidoRow(item, mapOptions);
    } catch (mapErr) {
      const { message } = errorPayload(mapErr);
      throw new Error(
        `Error mapeando fixture ${index} (id ${item.fixture.id}): ${message}`,
      );
    }
  });

  const supabase = createAdminClient();
  const { upserted, batchErrors } = await upsertPartidoRows(
    supabase,
    withSeasonIdRows(rows),
  );

  if (batchErrors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Uno o más lotes fallaron al insertar",
        fetched: items.length,
        upserted,
        batchErrors,
        query,
      },
      { status: 500 },
    );
  }

  console.log(`[cargar-partidos] ✅ ${upserted} partidos (api-sports) en Supabase`);

  return NextResponse.json({
    ok: true,
    provider: "api-sports.io",
    modo: isPilotLoad ? "pilot" : "mundial",
    fetched: items.length,
    upserted,
    query,
    fixtures: items.map((f) => ({
      id: f.fixture.id,
      home: f.teams.home.name,
      away: f.teams.away.name,
      date: f.fixture.date,
      status: f.fixture.status.short,
    })),
    ...(isPilotLoad
      ? {
          pilotLabel: pilot.label,
          hint: "Activa sync-live:cron o POST /api/admin/sync-live cada ~60s (plan free: ~100 req/día)",
        }
      : {}),
  });
}
