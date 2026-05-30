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

function configureWebPush() {
  const env = getPushEnv();
  if (!env) return null;
  webpush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
  return env;
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
      if (status === 404 || status === 410) {
        staleIds.push(sub.id);
      }
    }
  }

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
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
): Promise<void> {
  if (!configureWebPush() || rows.length === 0) return;

  const now = new Date().toISOString();

  for (const row of rows) {
    const url = row.partido_id ? `/partidos/${row.partido_id}` : "/";
    const { sent } = await sendPushToUser(supabase, row.usuario_id, {
      title: row.titulo,
      body: row.cuerpo,
      url,
      tag: row.partido_id ?? row.id,
    });

    if (sent > 0) {
      await supabase
        .from("notificaciones")
        .update({ enviada: true, enviada_at: now })
        .eq("id", row.id);
    }
  }
}
