/**
 * CLI — push cierre del Mundial (dedupe metadata.announcement_key).
 *
 *   npx tsx scripts/world-cup-closing-announce-cli.ts
 *   npx tsx scripts/world-cup-closing-announce-cli.ts --send
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";
import { broadcastProductAnnouncement } from "@/lib/product/broadcast-announcement";
import {
  WORLD_CUP_CLOSING_ANNOUNCEMENT,
  WORLD_CUP_CLOSING_VERSION,
} from "@/lib/product/whats-new";

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

  if (!send) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("usuario_id");
    const userIds = [...new Set((subs ?? []).map((s) => s.usuario_id as string))];
    const { data: already } = await supabase
      .from("notificaciones")
      .select("usuario_id")
      .filter("metadata->>announcement_key", "eq", WORLD_CUP_CLOSING_VERSION);
    const sent = new Set((already ?? []).map((r) => r.usuario_id as string));
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          announcementKey: WORLD_CUP_CLOSING_VERSION,
          title: WORLD_CUP_CLOSING_ANNOUNCEMENT.title,
          body: WORLD_CUP_CLOSING_ANNOUNCEMENT.description,
          pushUsersTotal: userIds.length,
          alreadyNotified: sent.size,
          targets: userIds.filter((id) => !sent.has(id)).length,
        },
        null,
        2,
      ),
    );
    console.log("\nDry-run. Usa --send para enviar push a usuarios objetivo.");
    return;
  }

  const result = await broadcastProductAnnouncement(supabase, {
    announcementKey: WORLD_CUP_CLOSING_VERSION,
    announcement: WORLD_CUP_CLOSING_ANNOUNCEMENT,
    url: "/",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
