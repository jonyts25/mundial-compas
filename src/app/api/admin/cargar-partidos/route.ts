import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { loadApiSportsFixtures } from "@/lib/api-football/cargar-fixtures";
import { mapFixtureToPartidoRow } from "@/lib/api-football/map-fixture-row";
import { getPilotConfig } from "@/lib/api-football/pilot-config";
import { getAdminEnv } from "@/lib/env";
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
  return NextResponse.json({
    endpoint: "POST /api/admin/cargar-partidos",
    provider: "api-sports.io",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
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
    const modoPilot = url.searchParams.get("modo") === "pilot";

    return await cargarPartidosApiSports(url, modoPilot);
  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN CARGA:", error);
    const { message, stack } = errorPayload(error);
    return NextResponse.json({ ok: false, error: message, stack }, { status: 500 });
  }
}

async function cargarPartidosApiSports(url: URL, modoPilot: boolean) {
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

  const mapOptions = isPilotLoad ? { pilot: { label: pilot.label } } : {};

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
          hint: "Activa sync-live:cron o POST /api/admin/sync-live cada ~60s",
        }
      : {}),
  });
}
