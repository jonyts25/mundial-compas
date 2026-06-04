import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { backfillPartidosGrupoFromMetadata } from "@/lib/partidos/backfill-grupo";
import { getAdminEnv } from "@/lib/env";

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

    const result = await backfillPartidosGrupoFromMetadata();

    return NextResponse.json({
      ok: true,
      message:
        "grupo/fase/jornada actualizados desde metadata.apifootball (stage_name, match_round)",
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/backfill-grupos",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    description:
      "Rellena grupo (A–L), fase y jornada en partidos usando metadata ya guardada.",
  });
}
