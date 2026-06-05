import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv, getFootballDataProvider } from "@/lib/env";
import { syncLiveScoresFromApi } from "@/lib/partidos/sync-live-scores";

/** Actualiza marcador/estatus vía polling (apifootball get_events o api-sports live=all). */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const pilotOnly = url.searchParams.get("pilot") !== "0";
  const force = url.searchParams.get("force") === "1";
  const supabase = createAdminClient();
  const result = await syncLiveScoresFromApi(supabase, { pilotOnly, force });

  return NextResponse.json({
    ok: true,
    provider: getFootballDataProvider(),
    ...result,
  });
}

export async function GET() {
  const provider = getFootballDataProvider();
  return NextResponse.json({
    endpoint: "POST /api/admin/sync-live",
    provider,
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    window: {
      enabled: "SYNC_LIVE_WINDOW_ENABLED=true (default)",
      beforeMin: "SYNC_LIVE_WINDOW_BEFORE_MIN=15",
      maxHours: "SYNC_LIVE_WINDOW_MAX_HOURS=3.5",
      skip: "0 API requests fuera de ventana",
    },
    force: "POST ?force=1 para ignorar ventana (debug)",
    hint:
      provider === "api-sports"
        ? "Polling live=all (pilot) o live=league (Mundial) — 1 req/sync en ventana"
        : "Polling get_events — útil si el webhook de apifootball no está configurado",
  });
}
