import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncPartidoLineups } from "@/lib/partidos/sync-lineups";
import { createClient } from "@/lib/supabase/server";

const PARTIDO_SYNC_SELECT =
  "id, api_football_fixture_id, fecha_kickoff, estatus, equipo_local_nombre, equipo_visitante_nombre, metadata";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: partido, error } = await supabase
    .from("partidos")
    .select(PARTIDO_SYNC_SELECT)
    .eq("id", id)
    .single();

  if (error || !partido) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const admin = createAdminClient();
  const result = await syncPartidoLineups(admin, partido, { force });

  return NextResponse.json({
    available: result.available,
    lineups: result.lineups,
    fromCache: result.fromCache,
    skipped: result.skipped ?? null,
  });
}
