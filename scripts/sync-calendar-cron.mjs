/**
 * Carga calendario Mundial (api-sports) 1x al día.
 * Railway cron: 0 12 * * * (06:00 CDMX ≈ 12:00 UTC)
 * Start: node scripts/sync-calendar-cron.mjs
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

if (!secret || !base) {
  console.error("Faltan ADMIN_CARGAR_PARTIDOS_SECRET y URL pública.");
  process.exit(1);
}

const league = process.env.API_SPORTS_LEAGUE_ID ?? "1";
const season = process.env.API_SPORTS_SEASON ?? "2026";

const url = new URL(`${base}/api/admin/cargar-partidos`);
url.searchParams.set("provider", "api-sports");
url.searchParams.set("league", league);
url.searchParams.set("season", season);

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(`[sync-calendar-cron] ${res.status} ${body}`);
if (!res.ok) process.exit(1);
