/**
 * Worker en loop: POST sync-live cada SYNC_LIVE_INTERVAL_MS (default 60s).
 * Más fiable que Railway cron schedule. Respeta ventana inteligente en el servidor.
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const secret = process.env.ADMIN_CARGAR_PARTIDOS_SECRET;
const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null);
const intervalMs = Number(process.env.SYNC_LIVE_INTERVAL_MS ?? "60000");

if (!secret || !base) {
  console.error("Faltan ADMIN_CARGAR_PARTIDOS_SECRET y URL pública.");
  process.exit(1);
}

const url = `${base}/api/admin/sync-live?pilot=1`;

console.log(`[sync-live-loop] cada ${intervalMs}ms → ${url}`);

async function tick() {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    console.log(`[sync-live-loop] ${new Date().toISOString()} ${res.status} ${body}`);
  } catch (e) {
    console.error("[sync-live-loop] error:", e);
  }
}

await tick();
while (true) {
  await new Promise((r) => setTimeout(r, intervalMs));
  await tick();
}
