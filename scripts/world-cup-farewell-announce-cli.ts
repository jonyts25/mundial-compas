/**
 * CLI — push campeón España + despedida Mundial Compas.
 *
 *   npx tsx scripts/world-cup-farewell-announce-cli.ts
 *   npx tsx scripts/world-cup-farewell-announce-cli.ts --send
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";
import { broadcastProductAnnouncement } from "@/lib/product/broadcast-announcement";
import {
  MUNDIAL_COMPAS_FAREWELL_ANNOUNCEMENT,
  MUNDIAL_COMPAS_FAREWELL_VERSION,
  SPAIN_CHAMPION_ANNOUNCEMENT,
  SPAIN_CHAMPION_VERSION,
} from "@/lib/product/whats-new";

const ANNOUNCEMENTS = [
  {
    announcementKey: SPAIN_CHAMPION_VERSION,
    announcement: SPAIN_CHAMPION_ANNOUNCEMENT,
  },
  {
    announcementKey: MUNDIAL_COMPAS_FAREWELL_VERSION,
    announcement: MUNDIAL_COMPAS_FAREWELL_ANNOUNCEMENT,
  },
] as const;

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

    for (const item of ANNOUNCEMENTS) {
      const { data: already } = await supabase
        .from("notificaciones")
        .select("usuario_id")
        .filter("metadata->>announcement_key", "eq", item.announcementKey);
      const sent = new Set((already ?? []).map((r) => r.usuario_id as string));
      console.log(
        JSON.stringify(
          {
            mode: "dry-run",
            announcementKey: item.announcementKey,
            title: item.announcement.title,
            body: item.announcement.description,
            pushUsersTotal: userIds.length,
            alreadyNotified: sent.size,
            targets: userIds.filter((id) => !sent.has(id)).length,
          },
          null,
          2,
        ),
      );
    }
    console.log("\nDry-run. Usa --send para enviar push.");
    return;
  }

  for (const item of ANNOUNCEMENTS) {
    const result = await broadcastProductAnnouncement(supabase, {
      announcementKey: item.announcementKey,
      announcement: item.announcement,
      url: "/",
    });
    console.log(JSON.stringify({ key: item.announcementKey, ...result }, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
