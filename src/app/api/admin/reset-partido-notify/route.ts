import { NextResponse } from "next/server";
import { resetPartidoLiveNotifyState } from "@/lib/api-football/notify-state-reset";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv } from "@/lib/env";

/** Reinicia dedup de notificaciones live de un partido (aplazamiento / reparación manual). */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const partidoId = url.searchParams.get("partidoId")?.trim();
  if (!partidoId) {
    return NextResponse.json({ error: "Falta partidoId" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: partido, error: readError } = await supabase
    .from("partidos")
    .select("id, metadata, estatus, equipo_local_nombre, equipo_visitante_nombre")
    .eq("id", partidoId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!partido) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const baseMetadata =
    typeof partido.metadata === "object" && partido.metadata !== null
      ? { ...(partido.metadata as Record<string, unknown>) }
      : {};

  const cleared = await resetPartidoLiveNotifyState(
    supabase,
    partido.id,
    baseMetadata,
  );

  const { error: updateError } = await supabase
    .from("partidos")
    .update({
      metadata: cleared,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partido.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    partidoId: partido.id,
    estatus: partido.estatus,
    partido: `${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`,
    message:
      "Estado de notificaciones reiniciado. Los próximos eventos live volverán a avisar.",
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/reset-partido-notify?partidoId=<uuid>",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    description:
      "Limpia announced_phases, gol_notify_score y claims webhook tras aplazamiento o falso inicio.",
  });
}
