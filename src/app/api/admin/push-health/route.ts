import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv } from "@/lib/env";
import { isPushConfigured, getVapidPublicKey } from "@/lib/push/vapid";

/** Diagnóstico rápido del pipeline de notificaciones push. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    pendingRes,
    sentRes,
    recentRes,
    subsRes,
    pushEnabledRes,
    membersRes,
    liveRes,
  ] = await Promise.all([
    supabase
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("enviada", false),
    supabase
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("enviada", true)
      .gte("created_at", since),
    supabase
      .from("notificaciones")
      .select("tipo, titulo, created_at, enviada, partido_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("push_habilitado", true),
    supabase
      .from("liga_miembros")
      .select("usuario_id", { count: "exact", head: true }),
    supabase
      .from("partidos")
      .select("id", { count: "exact", head: true })
      .in("estatus", ["en_vivo", "medio_tiempo"]),
  ]);

  const publicKey = getVapidPublicKey();
  const vapidPreview = publicKey
    ? `${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`
    : null;

  return NextResponse.json({
    ok: true,
    push: {
      configured: isPushConfigured(),
      vapidPublicKeyPreview: vapidPreview,
    },
    counts: {
      pendingNotifications: pendingRes.count ?? 0,
      sentLast24h: sentRes.count ?? 0,
      pushSubscriptions: subsRes.count ?? 0,
      usersPushEnabled: pushEnabledRes.count ?? 0,
      ligaMembers: membersRes.count ?? 0,
      liveMatchesNow: liveRes.count ?? 0,
    },
    recentNotifications: recentRes.data ?? [],
    hints: [
      pendingRes.count && pendingRes.count > 0
        ? "Hay notificaciones pendientes — ejecuta POST /api/admin/drain-notifications"
        : null,
      !isPushConfigured()
        ? "Faltan claves VAPID en el servidor"
        : null,
      (subsRes.count ?? 0) === 0
        ? "Ningún usuario tiene suscripción push activa"
        : null,
    ].filter(Boolean),
  });
}
