import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminEnv } from "@/lib/env";
import { repairPartidoCatalog } from "@/lib/partidos/repair-partido-catalog";
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

    const supabase = createAdminClient();
    const result = await repairPartidoCatalog(supabase);

    return NextResponse.json({
      ok: result.errors.length === 0,
      message:
        "Reparación de catálogo partidos (grupo, jornada, códigos, canal). No modifica ids ni pronósticos.",
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/repair-partidos",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    description:
      "Rellena grupo/jornada desde standings api-sports, corrige códigos de equipo y reaplica reglas de canal TV.",
  });
}
