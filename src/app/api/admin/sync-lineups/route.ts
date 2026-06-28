import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv } from "@/lib/env";
import { syncPartidosLineupsInWindow } from "@/lib/partidos/sync-lineups-batch";

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
  const result = await syncPartidosLineupsInWindow(supabase);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
