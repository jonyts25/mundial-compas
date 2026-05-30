import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { diagnoseApifootballLeagues } from "@/lib/apifootball/diagnose-leagues";
import { fetchLeagueEvents } from "@/lib/apifootball/fetch-world-cup-events";
import { mapEventToPartidoRow } from "@/lib/apifootball/map-event-to-partido";
import { getPilotConfig } from "@/lib/apifootball/pilot-config";
import { searchLeaguesByKeyword } from "@/lib/apifootball/resolve-league";
import { getAdminEnv, getApiFootballEnv } from "@/lib/env";
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
  return NextResponse.json({
    endpoint: "POST /api/admin/cargar-partidos",
    provider: "apifootball.com (apiv3.apifootball.com)",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    diagnostics: {
      countries: "POST ?diagnostic=countries",
      leagues: "POST ?diagnostic=leagues",
      champions: "POST ?diagnostic=leagues&search=champions",
    },
    pilot: {
      enabled: "PILOT_MODE_ENABLED=true en Railway",
      load: "POST ?modo=pilot (Champions / fin de semana de prueba)",
    },
  });
}

export async function POST(request: Request) {
  try {
    const adminSecret = getAdminEnv().cargarPartidosSecret;
    const { apiKey, leagueId, worldCupFrom, worldCupTo, timezone } =
      getApiFootballEnv();

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
    const diagnosticMode = url.searchParams.get("diagnostic");
    const leagueSearch = url.searchParams.get("search");
    const modoPilot = url.searchParams.get("modo") === "pilot";

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
    const BATCH = 50;
    let upserted = 0;
    const batchErrors: string[] = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const batchNum = Math.floor(i / BATCH) + 1;

      const { error } = await supabase.from("partidos").upsert(batch, {
        onConflict: "api_football_fixture_id",
        ignoreDuplicates: false,
      });

      if (error) {
        batchErrors.push(`Lote ${batchNum}: ${error.message}`);
      } else {
        upserted += batch.length;
      }
    }

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
