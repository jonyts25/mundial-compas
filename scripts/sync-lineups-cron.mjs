/**
 * Cron: consulta alineaciones de partidos que empiezan en las próximas 4 h.
 * Railway: servicio aparte con Cron Schedule */15 * * * *
 * Start command: node scripts/sync-lineups-cron.mjs
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
  console.error("Faltan ADMIN_CARGAR_PARTIDOS_SECRET y URL pública de la app.");
  process.exit(1);
}

const url = `${base}/api/admin/sync-lineups`;

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(`[sync-lineups-cron] ${res.status} ${body}`);

if (!res.ok) process.exit(1);
