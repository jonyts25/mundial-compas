import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv } from "@/lib/env";
import { syncLiveScoresFromApi } from "@/lib/partidos/sync-live-scores";

/** Actualiza marcador/estatus desde apifootball get_events (usa cada ~60s si no hay webhook). */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pilotOnly = new URL(request.url).searchParams.get("pilot") !== "0";
  const supabase = createAdminClient();
  const result = await syncLiveScoresFromApi(supabase, { pilotOnly });

  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/sync-live",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    hint: "Polling get_events — útil si el webhook de apifootball no está configurado",
  });
}
