import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsNewItem } from "@/lib/product/whats-new";
import { sendPushToUser } from "@/lib/push/send";
import { getPushEnv } from "@/lib/push/vapid";

export type BroadcastAnnouncementResult = {
  announcementKey: string;
  pushUsersTotal: number;
  alreadyNotified: number;
  targets: number;
  sentUsers: number;
  failedDeliveries: number;
  skipped: boolean;
  skipReason?: string;
};

/**
 * Envía un anuncio de producto por Web Push (dedupe por metadata.announcement_key).
 */
export async function broadcastProductAnnouncement(
  supabase: SupabaseClient,
  options: {
    announcementKey: string;
    announcement: WhatsNewItem;
    url?: string;
  },
): Promise<BroadcastAnnouncementResult> {
  const { announcementKey, announcement, url = "/" } = options;

  const empty = (
    extra: Partial<BroadcastAnnouncementResult> = {},
  ): BroadcastAnnouncementResult => ({
    announcementKey,
    pushUsersTotal: 0,
    alreadyNotified: 0,
    targets: 0,
    sentUsers: 0,
    failedDeliveries: 0,
    skipped: false,
    ...extra,
  });

  if (!getPushEnv()) {
    return empty({
      skipped: true,
      skipReason: "vapid_no_configurado",
    });
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("usuario_id");

  if (subsError) {
    return empty({
      skipped: true,
      skipReason: subsError.message,
    });
  }

  const userIds = [...new Set((subs ?? []).map((s) => s.usuario_id as string))];

  const { data: alreadySent, error: sentError } = await supabase
    .from("notificaciones")
    .select("usuario_id")
    .filter("metadata->>announcement_key", "eq", announcementKey);

  if (sentError) {
    return empty({
      pushUsersTotal: userIds.length,
      skipped: true,
      skipReason: sentError.message,
    });
  }

  const sentSet = new Set(
    (alreadySent ?? []).map((r) => r.usuario_id as string),
  );
  const targets = userIds.filter((id) => !sentSet.has(id));

  if (targets.length === 0) {
    return empty({
      pushUsersTotal: userIds.length,
      alreadyNotified: sentSet.size,
      targets: 0,
      skipped: true,
      skipReason: "ya_enviado",
    });
  }

  const payload = {
    title: announcement.title,
    body: announcement.description,
    url,
    tag: announcementKey,
  };

  let sentUsers = 0;
  let failedDeliveries = 0;

  for (const usuarioId of targets) {
    const { sent, failed } = await sendPushToUser(supabase, usuarioId, payload);
    failedDeliveries += failed;

    if (sent > 0) {
      sentUsers += 1;
      await supabase.from("notificaciones").insert({
        usuario_id: usuarioId,
        tipo: "liga",
        titulo: payload.title,
        cuerpo: payload.body,
        enviada: true,
        enviada_at: new Date().toISOString(),
        metadata: {
          announcement_key: announcementKey,
          kind: "product_announcement",
          channel: "web_push",
        },
      });
    }
  }

  console.info(
    `[announce] key=${announcementKey} targets=${targets.length} sentUsers=${sentUsers} failed=${failedDeliveries}`,
  );

  return {
    announcementKey,
    pushUsersTotal: userIds.length,
    alreadyNotified: sentSet.size,
    targets: targets.length,
    sentUsers,
    failedDeliveries,
    skipped: false,
  };
}
