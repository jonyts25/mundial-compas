import { after, NextResponse } from "next/server";
import { tryClaimSyncLiveRun } from "@/lib/api-football/push/claim-event";
import { warnSyncLiveLockSkipped } from "@/lib/partidos/sync-live-telemetry";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEnv, getFootballDataProvider } from "@/lib/env";
import { drainPendingPushNotifications } from "@/lib/push/drain-pending";
import { syncLiveScoresFromApi } from "@/lib/partidos/sync-live-scores";
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

  const reconcile = await reconcileKnockoutPlaceholderFixtureIds(supabase);
  const { data: knockoutDeduped, error: knockoutDedupeError } = await supabase.rpc(
    "reconcile_knockout_partido_duplicates",
  );
  const knockoutDedupePairs =
    (knockoutDeduped as Array<{ canonical_id: string; legacy_id: string }> | null) ??
    [];
  if (knockoutDedupeError) {
    console.error(
      "[sync-live] reconcile_knockout_partido_duplicates:",
      knockoutDedupeError.message,
    );
  } else if (knockoutDedupePairs.length > 0) {
    console.info(
      `[sync-live] knockout dedupe: ${knockoutDedupePairs.length} legacy partido(s) fusionados`,
    );
  }
  const lineups = await syncPartidosLineupsInWindow(supabase);

  if (!(await tryClaimSyncLiveRun(supabase))) {
    warnSyncLiveLockSkipped();
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "sync-live ya en curso (lock)",
      provider: getFootballDataProvider(),
      reconcile,
      knockoutDedupe: {
        pairs: knockoutDedupePairs.length,
        error: knockoutDedupeError?.message ?? null,
      },
      lineups,
    });
  }

  const result = await syncLiveScoresFromApi(supabase, { pilotOnly, force });

  after(async () => {
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
    reconcile,
    knockoutDedupe: {
      pairs: knockoutDedupePairs.length,
      error: knockoutDedupeError?.message ?? null,
    },
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
