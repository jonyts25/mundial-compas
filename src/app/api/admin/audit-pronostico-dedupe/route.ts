import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  importPronosticoFusionAuditRows,
  notifyPronosticoFusionConflicts,
  type PronosticoFusionConflictRow,
} from "@/lib/partidos/pronostico-fusion-audit";
import { getAdminEnv } from "@/lib/env";
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

function isAuthorized(request: Request): boolean {
  const adminSecret = getAdminEnv().cargarPartidosSecret;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-admin-secret");
  return (
    verifyAdminSecret(bearer ?? null, adminSecret) ||
    verifyAdminSecret(headerSecret, adminSecret)
  );
}

interface AuditBody {
  rows?: PronosticoFusionConflictRow[];
  notify?: boolean;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as AuditBody;
    const rows = body.rows ?? [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Se requiere body.rows con conflictos exportados desde snapshot PITR (ver scripts/audit-pronostico-dedupe.mjs).",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const importResult = await importPronosticoFusionAuditRows(supabase, rows);

    let notifyResult = null;
    if (body.notify) {
      notifyResult = await notifyPronosticoFusionConflicts(supabase);
    }

    return NextResponse.json({
      ok: importResult.errors.length === 0,
      import: importResult,
      notify: notifyResult,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/audit-pronostico-dedupe",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    body: {
      rows: "PronosticoFusionConflictRow[] desde snapshot PITR",
      notify: "boolean — encola notificaciones para scores distintos",
    },
    script: "node scripts/audit-pronostico-dedupe.mjs",
  });
}
