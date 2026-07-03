import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  auditPartidoDuplicates,
  consolidatePartidoDuplicates,
  tomorrowMexicoDateKey,
} from "@/lib/partidos/dedupe-partidos-consolidate";
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

function formatGroupSummary(
  groups: Awaited<ReturnType<typeof auditPartidoDuplicates>>["duplicateGroups"],
) {
  return groups.map((group) => ({
    key: group.key,
    canonical_id: group.canonical_id,
    legacy_ids: group.legacy_ids,
    partidos: group.partidos.map((partido) => ({
      id: partido.id,
      fixture_id: partido.api_football_fixture_id,
      local: partido.equipo_local_nombre,
      visitante: partido.equipo_visitante_nombre,
      kickoff: partido.fecha_kickoff,
      estatus: partido.estatus,
      fase: partido.fase,
      fifa_match_number:
        (partido.metadata as Record<string, unknown> | null)?.fifa_match_number ??
        null,
    })),
    pronosticos: group.pronosticos.map((pronostico) => ({
      partido_id: pronostico.partido_id,
      liga_id: pronostico.liga_id,
      usuario_id: pronostico.usuario_id,
      marcador: `${pronostico.goles_local}-${pronostico.goles_visitante}`,
    })),
  }));
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/dedupe-partidos",
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    query: {
      mode: "audit (default) | consolidate",
      date: "YYYY-MM-DD en CDMX (default: mañana)",
      dryRun: "1 para simular consolidate sin escribir",
    },
    script: "node scripts/audit-dedupe-tomorrow.mjs [--consolidate] [--date=YYYY-MM-DD]",
    description:
      "Audita y consolida partidos duplicados (placeholder KO vs fixture real). Fusiona pronósticos al canonical.",
  });
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

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") ?? "audit";
    const dateKey = url.searchParams.get("date") ?? tomorrowMexicoDateKey();
    const dryRun = url.searchParams.get("dryRun") === "1";

    const supabase = createAdminClient();

    if (mode === "consolidate") {
      const result = await consolidatePartidoDuplicates(supabase, {
        dateKey,
        dryRun,
      });

      return NextResponse.json({
        ok: result.errors.length === 0,
        mode,
        dateKey,
        dryRun,
        totalPartidos: result.totalPartidos,
        hasDuplicates: result.hasDuplicates,
        consolidated: result.consolidated,
        knockoutReconciled: result.knockoutReconciled,
        duplicateGroups: formatGroupSummary(result.duplicateGroups),
        errors: result.errors,
      });
    }

    const result = await auditPartidoDuplicates(supabase, { dateKey });

    return NextResponse.json({
      ok: true,
      mode: "audit",
      dateKey,
      totalPartidos: result.totalPartidos,
      hasDuplicates: result.hasDuplicates,
      duplicateGroups: formatGroupSummary(result.duplicateGroups),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
