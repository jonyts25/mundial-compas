import { NextResponse } from "next/server";
import { resetPartidoLiveNotifyState } from "@/lib/api-football/notify-state-reset";
import {
  findPartidoByTeams,
  summarizeNotifyMetadata,
} from "@/lib/partidos/find-partido-by-teams";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv } from "@/lib/env";

async function loadPartido(
  supabase: ReturnType<typeof createAdminClient>,
  partidoId: string | null,
  teams: string | null,
) {
  if (partidoId) {
    const { data, error } = await supabase
      .from("partidos")
      .select(
        "id, metadata, estatus, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, fecha_kickoff, api_football_fixture_id, fase",
      )
      .eq("id", partidoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  if (teams) {
    return findPartidoByTeams(supabase, teams);
  }

  return null;
}

/** Reinicia dedup de notificaciones live de un partido (aplazamiento / reparación manual). */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const partidoId = url.searchParams.get("partidoId")?.trim() ?? null;
  const teams = url.searchParams.get("teams")?.trim() ?? null;

  if (!partidoId && !teams) {
    return NextResponse.json(
      { error: "Indica partidoId o teams (ej. teams=México,Ecuador)" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  let partido;
  try {
    partido = await loadPartido(supabase, partidoId, teams);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  if (!partido) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const before = summarizeNotifyMetadata(partido.metadata);

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  let syncTriggered = false;
  if (url.searchParams.get("sync") === "1" && appUrl) {
    try {
      const syncRes = await fetch(`${appUrl}/api/admin/sync-live?force=1`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      syncTriggered = syncRes.ok;
    } catch {
      syncTriggered = false;
    }
  }

  return NextResponse.json({
    ok: true,
    partidoId: partido.id,
    estatus: partido.estatus,
    marcador: `${partido.marcador_local ?? "-"}-${partido.marcador_visitante ?? "-"}`,
    partido: `${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`,
    notifyStateBefore: before,
    notifyStateAfter: summarizeNotifyMetadata(cleared),
    syncTriggered,
    message:
      "Estado de notificaciones reiniciado. Los próximos eventos live volverán a avisar (no reenvía goles ya jugados).",
  });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  const url = new URL(request.url);
  const teams = url.searchParams.get("teams")?.trim();

  if (auth === `Bearer ${secret}` && teams) {
    const supabase = createAdminClient();
    try {
      const partido = await findPartidoByTeams(supabase, teams);
      if (!partido) {
        return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        partidoId: partido.id,
        estatus: partido.estatus,
        marcador: `${partido.marcador_local ?? "-"}-${partido.marcador_visitante ?? "-"}`,
        partido: `${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`,
        fixtureId: partido.api_football_fixture_id,
        notifyState: summarizeNotifyMetadata(partido.metadata),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    endpoint: "POST /api/admin/reset-partido-notify",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    params: {
      partidoId: "uuid del partido",
      teams: "México,Ecuador (alternativa a partidoId)",
      sync: "1 para forzar sync-live tras el reset",
    },
    inspect: "GET ?teams=México,Ecuador (con auth) — solo diagnóstico",
    description:
      "Limpia announced_phases, gol_notify_score y claims webhook tras aplazamiento o falso inicio.",
  });
}
