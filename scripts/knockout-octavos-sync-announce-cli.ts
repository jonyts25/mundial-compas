/**
 * CLI — push octavos sincronizados en quiniela (dedupe metadata.announcement_key).
 */
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { loadEnvLocal } from "./load-env-local.mjs";
import {
  KNOCKOUT_OCTAVOS_SYNC_ANNOUNCEMENT,
  KNOCKOUT_OCTAVOS_SYNC_VERSION,
} from "@/lib/product/whats-new";
import { getPushEnv } from "@/lib/push/vapid";

async function main() {
  loadEnvLocal();

  const send = process.argv.includes("--send");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const announcementKey = KNOCKOUT_OCTAVOS_SYNC_VERSION;

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("usuario_id");

  if (subsError) {
    console.error(subsError.message);
    process.exit(1);
  }

  const userIds = [...new Set((subs ?? []).map((s) => s.usuario_id as string))];

  const { data: alreadySent, error: sentError } = await supabase
    .from("notificaciones")
    .select("usuario_id")
    .filter("metadata->>announcement_key", "eq", announcementKey);

  if (sentError) {
    console.error(sentError.message);
    process.exit(1);
  }

  const sentSet = new Set((alreadySent ?? []).map((r) => r.usuario_id as string));
  const targets = userIds.filter((id) => !sentSet.has(id));

  const payload = {
    title: KNOCKOUT_OCTAVOS_SYNC_ANNOUNCEMENT.title,
    body: KNOCKOUT_OCTAVOS_SYNC_ANNOUNCEMENT.description,
    url: "/quiniela",
    tag: announcementKey,
  };

  console.log(
    JSON.stringify(
      {
        mode: send ? "send" : "dry-run",
        announcementKey,
        pushUsersTotal: userIds.length,
        alreadyNotified: sentSet.size,
        targets: targets.length,
        sampleUserIds: targets.slice(0, 5),
      },
      null,
      2,
    ),
  );

  if (!send) {
    console.log("\nDry-run. Usa --send para enviar push a usuarios objetivo.");
    return;
  }

  const pushEnv = getPushEnv();
  if (!pushEnv) {
    console.error("Push no configurado (VAPID). Abortando envío.");
    process.exit(1);
  }

  webpush.setVapidDetails(
    pushEnv.subject,
    pushEnv.publicKey,
    pushEnv.privateKey,
  );

  let sent = 0;
  let failed = 0;

  for (const usuarioId of targets) {
    const { data: userSubs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("usuario_id", usuarioId);

    let userSent = 0;

    for (const sub of userSubs ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: {
              p256dh: sub.p256dh as string,
              auth: sub.auth as string,
            },
          },
          JSON.stringify(payload),
        );
        userSent += 1;
      } catch {
        failed += 1;
      }
    }

    if (userSent > 0) {
      sent += 1;
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

  console.log(JSON.stringify({ sentUsers: sent, failedDeliveries: failed }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
