import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv } from "@/lib/env";
import { drainPendingPushNotifications } from "@/lib/push/drain-pending";

/** Reintenta Web Push para notificaciones con enviada = false. */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "80");
  const supabase = createAdminClient();
  const result = await drainPendingPushNotifications(
    supabase,
    Number.isFinite(limit) ? limit : 80,
  );

  return NextResponse.json({ ok: true, ...result });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/drain-notifications",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    limit: "?limit=80 (opcional)",
  });
}
