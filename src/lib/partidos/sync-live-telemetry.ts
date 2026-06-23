/** Telemetría server-side para sync-live (Railway logs). Sin PII. */

export const SYNC_LIVE_SLOW_THRESHOLD_MS = 45_000;

export interface SyncLiveFixtureLog {
  fixture_id: number;
  partido_id: string | null;
  status: string | null;
  minuto: number | null;
  duration_ms: number;
  outcome: "updated" | "not_in_db" | "db_error" | "update_error";
}

export function warnSyncLiveLockSkipped(): void {
  console.warn(
    "[sync-live] LOCK_SKIPPED sync-live ya en curso — ciclo omitido (posible lag en partidos simultáneos)",
  );
}

export function logSyncLiveStart(liveFixtureCount: number): void {
  console.info(
    `[sync-live] START live_fixture_count=${liveFixtureCount}`,
  );
}

export function logSyncLiveFixture(entry: SyncLiveFixtureLog): void {
  console.info(
    `[sync-live] FIXTURE fixture_id=${entry.fixture_id} partido_id=${entry.partido_id ?? "—"} status=${entry.status ?? "—"} minuto=${entry.minuto ?? "—"} duration_ms=${entry.duration_ms} outcome=${entry.outcome}`,
  );
}

export interface SyncLiveCompleteLog {
  duration_ms: number;
  live_fixture_count: number;
  fetched: number;
  updated: number;
  live: number;
  api_requests: number;
  errors: number;
}

export function logSyncLiveComplete(entry: SyncLiveCompleteLog): void {
  console.info(
    `[sync-live] END duration_ms=${entry.duration_ms} live_fixture_count=${entry.live_fixture_count} fetched=${entry.fetched} updated=${entry.updated} live=${entry.live} api_requests=${entry.api_requests} errors=${entry.errors}`,
  );
  if (entry.duration_ms > SYNC_LIVE_SLOW_THRESHOLD_MS) {
    console.warn(
      `[sync-live] SLOW duration_ms=${entry.duration_ms} threshold_ms=${SYNC_LIVE_SLOW_THRESHOLD_MS} live_fixture_count=${entry.live_fixture_count}`,
    );
  }
}
