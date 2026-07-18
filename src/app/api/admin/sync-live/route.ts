import { after, NextResponse } from "next/server";
import { tryClaimSyncLiveRun } from "@/lib/api-football/push/claim-event";
import { warnSyncLiveLockSkipped } from "@/lib/partidos/sync-live-telemetry";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv, getFootballDataProvider } from "@/lib/env";
import { broadcastProductAnnouncement } from "@/lib/product/broadcast-announcement";
import {
  WORLD_CUP_CLOSING_ANNOUNCEMENT,
  WORLD_CUP_CLOSING_VERSION,
} from "@/lib/product/whats-new";
import { drainPendingPushNotifications } from "@/lib/push/drain-pending";
import { syncLiveScoresFromApi } from "@/lib/partidos/sync-live-scores";
import { applyOfficialKnockoutKickoffs } from "@/lib/standings/apply-official-knockout-kickoffs";
import { reconcileKnockoutPlaceholderFixtureIds } from "@/lib/world-cup/reconcile-knockout-fixture-ids";
import { syncPartidosLineupsInWindow } from "@/lib/partidos/sync-lineups-batch";

/** Actualiza marcador/estatus vía polling api-sports (sync-live-cron). */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = getAdminEnv().cargarPartidosSecret;
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const pilotOnly = url.searchParams.get("pilot") !== "0";
  const force = url.searchParams.get("force") === "1";
  const supabase = createAdminClient();

  // Antes de la ventana: horarios malos dejan el cron fuera y no llegan notificaciones.
  const kickoffFix = await applyOfficialKnockoutKickoffs(supabase);
  const reconcile = await reconcileKnockoutPlaceholderFixtureIds(supabase);
  const lineups = await syncPartidosLineupsInWindow(supabase);

  if (!(await tryClaimSyncLiveRun(supabase))) {
    warnSyncLiveLockSkipped();
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "sync-live ya en curso (lock)",
      provider: getFootballDataProvider(),
      kickoffFix,
      reconcile,
      lineups,
    });
  }

  const result = await syncLiveScoresFromApi(supabase, { pilotOnly, force });

  after(async () => {
    try {
      const closing = await broadcastProductAnnouncement(supabase, {
        announcementKey: WORLD_CUP_CLOSING_VERSION,
        announcement: WORLD_CUP_CLOSING_ANNOUNCEMENT,
        url: "/",
      });
      if (!closing.skipped || closing.skipReason !== "ya_enviado") {
        console.info(
          `[announce] closing sentUsers=${closing.sentUsers} targets=${closing.targets} skipped=${closing.skipped} reason=${closing.skipReason ?? "—"}`,
        );
      }
    } catch (err) {
      console.error(
        "[announce] closing error:",
        err instanceof Error ? err.message : err,
      );
    }

    try {
      const pushDrain = await drainPendingPushNotifications(supabase);
      if (pushDrain.fetched > 0) {
        console.info(
          `[push] drain after sync-live fetched=${pushDrain.fetched} sent=${pushDrain.sent} failed=${pushDrain.failed}`,
        );
      }
    } catch (err) {
      console.error(
        "[push] drain after sync-live error:",
        err instanceof Error ? err.message : err,
      );
    }
  });

  return NextResponse.json({
    ok: true,
    provider: getFootballDataProvider(),
    kickoffFix,
    reconcile,
    lineups,
    ...result,
  });
}

export async function GET() {
  const provider = getFootballDataProvider();
  return NextResponse.json({
    endpoint: "POST /api/admin/sync-live",
    provider,
    auth: "Authorization: Bearer <ADMIN_CARGAR_PARTIDOS_SECRET>",
    window: {
      enabled: "SYNC_LIVE_WINDOW_ENABLED=true (default)",
      beforeMin: "SYNC_LIVE_WINDOW_BEFORE_MIN=15",
      maxHours: "SYNC_LIVE_WINDOW_MAX_HOURS=3.5",
      skip: "0 API requests fuera de ventana",
    },
    force: "POST ?force=1 para ignorar ventana (debug)",
    hint: "Polling api-sports live=all (pilot) o live=league (Mundial) — 1 req/sync en ventana",
  });
}
