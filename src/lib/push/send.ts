import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPushEnv } from "@/lib/push/vapid";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushDispatchStats = {
  sent: number;
  failed: number;
  skipped: number;
};

function configureWebPush() {
  const env = getPushEnv();
  if (!env) return null;
  webpush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
  return env;
}

function isStalePushStatus(status: number | undefined): boolean {
  return status === 404 || status === 410 || status === 401 || status === 403;
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  usuarioId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const env = configureWebPush();
  if (!env) return { sent: 0, failed: 0 };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("usuario_id", usuarioId);

  if (!subs?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  for (const sub of subs as PushSubscriptionRow[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      const status = (err as { statusCode?: number }).statusCode;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[push] send failed usuario=${usuarioId} status=${status ?? "—"} endpoint=${sub.endpoint.slice(0, 48)}… ${message}`,
      );
      if (isStalePushStatus(status)) {
        staleIds.push(sub.id);
      }
    }
  }

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
    console.info(
      `[push] removed ${staleIds.length} stale subscription(s) for usuario=${usuarioId}`,
    );
  }

  return { sent, failed };
}

export type NotificationRow = {
  id: string;
  usuario_id: string;
  titulo: string;
  cuerpo: string;
  partido_id: string | null;
};

export async function dispatchPushForNotifications(
  supabase: SupabaseClient,
  rows: NotificationRow[],
): Promise<PushDispatchStats> {
  const stats: PushDispatchStats = { sent: 0, failed: 0, skipped: 0 };

  if (!configureWebPush()) {
    if (rows.length > 0) {
      console.error(
        `[push] VAPID no configurado — ${rows.length} notificación(es) sin enviar`,
      );
    }
    stats.skipped = rows.length;
    return stats;
  }

  if (rows.length === 0) return stats;

  const now = new Date().toISOString();

  for (const row of rows) {
    const url = row.partido_id ? `/partidos/${row.partido_id}` : "/";
    const { sent, failed } = await sendPushToUser(supabase, row.usuario_id, {
      title: row.titulo,
      body: row.cuerpo,
      url,
      tag: row.partido_id ?? row.id,
    });

    stats.failed += failed;

    if (sent > 0) {
      stats.sent += sent;
      await supabase
        .from("notificaciones")
        .update({ enviada: true, enviada_at: now })
        .eq("id", row.id);
    }
  }

  if (stats.sent > 0 || stats.failed > 0) {
    console.info(
      `[push] dispatch rows=${rows.length} devices_sent=${stats.sent} devices_failed=${stats.failed}`,
    );
  }

  return stats;
}
