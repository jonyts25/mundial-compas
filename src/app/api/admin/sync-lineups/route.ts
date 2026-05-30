import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv } from "@/lib/env";
import { syncPartidoLineups } from "@/lib/partidos/sync-lineups";

const SELECT =
  "id, api_football_fixture_id, fecha_kickoff, estatus, equipo_local_nombre, equipo_visitante_nombre, metadata";

/** Sincroniza alineaciones de partidos que empiezan en las próximas 4 h (cron / manual). */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(SELECT)
    .eq("estatus", "programado")
    .gte("fecha_kickoff", now.toISOString())
    .lte("fecha_kickoff", windowEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let synced = 0;
  let available = 0;

  for (const partido of partidos ?? []) {
    const result = await syncPartidoLineups(supabase, partido);
    if (!result.fromCache && result.lineups) synced += 1;
    if (result.available) available += 1;
  }

  return NextResponse.json({
    ok: true,
    checked: partidos?.length ?? 0,
    synced,
    withLineups: available,
  });
}
