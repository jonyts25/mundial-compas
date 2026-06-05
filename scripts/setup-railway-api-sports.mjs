/**
 * México vs Serbia — api-sports.io (polling, sin WebSocket relay).
 * Uso: node scripts/setup-railway-api-sports.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const APP =
  process.env.RAILWAY_APP_SERVICE_ID ?? "63107052-f83f-468e-a51b-bb8c25e86c01";
const CRON =
  process.env.RAILWAY_SYNC_LIVE_CRON_SERVICE_ID ?? "sync-live-cron";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://mundial-compas.up.railway.app";
const adminSecret = process.env.ADMIN_CARGAR_PARTIDOS_SECRET;
const apiSportsKey = process.env.API_SPORTS_KEY;
const fixtureId = process.env.API_SPORTS_PILOT_FIXTURE_ID ?? "1528284";

const appVars = {
  FOOTBALL_DATA_PROVIDER: "api-sports",
  API_SPORTS_KEY: apiSportsKey || "",
  API_SPORTS_PILOT_FIXTURE_ID: fixtureId,
  API_SPORTS_PILOT_DATE: process.env.API_SPORTS_PILOT_DATE ?? "2026-06-04",
  API_SPORTS_PILOT_TEAM_ID: process.env.API_SPORTS_PILOT_TEAM_ID ?? "16",
  PILOT_MODE_ENABLED: "true",
  APIFOOTBALL_PILOT_LABEL:
    process.env.APIFOOTBALL_PILOT_LABEL ?? "Mexico_vs_Serbia_live",
  APIFOOTBALL_PILOT_FROM: process.env.API_SPORTS_PILOT_DATE ?? "2026-06-04",
  APIFOOTBALL_PILOT_TO: process.env.API_SPORTS_PILOT_DATE ?? "2026-06-04",
  NEXT_PUBLIC_APP_URL: appUrl,
  APIFOOTBALL_TIMEZONE: process.env.APIFOOTBALL_TIMEZONE ?? "America/Mexico_City",
  SYNC_LIVE_WINDOW_ENABLED: "true",
  SYNC_LIVE_WINDOW_BEFORE_MIN: "15",
  SYNC_LIVE_WINDOW_MAX_HOURS: "3.5",
  API_SPORTS_LEAGUE_ID: process.env.API_SPORTS_LEAGUE_ID ?? "1",
  API_SPORTS_SEASON: process.env.API_SPORTS_SEASON ?? "2026",
};

const cronVars = {
  ADMIN_CARGAR_PARTIDOS_SECRET: adminSecret || "",
  NEXT_PUBLIC_APP_URL: appUrl,
};

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: opts.inherit === false ? "pipe" : "inherit",
    shell: process.platform === "win32",
    cwd: root,
    encoding: opts.inherit === false ? "utf8" : undefined,
  });
  if (result.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(" ")} → exit ${result.status}`);
  }
  return result;
}

function runRailway(args, opts = {}) {
  return run("npx", ["railway", ...args], opts);
}

function setVars(service, vars) {
  console.log(`\n→ Variables en ${service}…`);
  for (const [key, value] of Object.entries(vars)) {
    if (value === "") {
      console.log(`  (skip ${key} — vacío)`);
      continue;
    }
    console.log(`  ${key}=***`);
    runRailway(["variable", "set", `${key}=${value}`, "--service", service]);
  }
}

async function cargarPartidoProd() {
  if (!adminSecret) return;
  const url = new URL(`${appUrl}/api/admin/cargar-partidos`);
  url.searchParams.set("provider", "api-sports");
  url.searchParams.set("modo", "pilot");
  url.searchParams.set("fixture", fixtureId);

  console.log(`\n→ Cargar fixture ${fixtureId} en producción…`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminSecret}` },
  });
  const body = await res.text();
  console.log(`  ${res.status} ${body}`);
  if (!res.ok) throw new Error("cargar-partidos falló en producción");
}

async function syncLiveProd() {
  if (!adminSecret) return;
  const url = `${appUrl}/api/admin/sync-live?pilot=1`;
  console.log("\n→ Probar sync-live en producción…");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminSecret}` },
  });
  const body = await res.text();
  console.log(`  ${res.status} ${body}`);
}

function ensureCronService() {
  console.log("\n→ Servicio cron sync-live-cron…");
  const list = runRailway(["service", "list"], { inherit: false, allowFail: true });
  const out = list.stdout || "";
  if (out.includes("sync-live-cron")) {
    console.log("  Ya existe sync-live-cron");
    return;
  }
  console.log("  Creando sync-live-cron (Empty Service)…");
  runRailway(["add", "--service", "sync-live-cron"], { allowFail: true });
}

try {
  console.log("=== Railway — api-sports (México vs Serbia) ===");
  console.log(`  app: ${appUrl}`);
  console.log(`  fixture: ${fixtureId}`);

  if (!apiSportsKey) {
    console.error("Falta API_SPORTS_KEY en .env.local");
    process.exit(1);
  }
  if (!adminSecret) {
    console.error("Falta ADMIN_CARGAR_PARTIDOS_SECRET en .env.local");
    process.exit(1);
  }

  setVars(APP, appVars);

  console.log("\n→ Deploy app (código api-sports)…");
  runRailway(["up", "--detach", "--service", APP]);

  console.log("\n  Esperando deploy (~90s)…");
  await new Promise((r) => setTimeout(r, 90_000));

  await cargarPartidoProd();
  await syncLiveProd();

  ensureCronService();
  setVars("sync-live-cron", cronVars);

  console.log("\n→ Deploy cron (si el servicio existe)…");
  runRailway(["up", "--detach", "--service", "sync-live-cron"], {
    allowFail: true,
  });

  console.log(`
✓ App configurada con api-sports.

Cron sync-live-cron: npm run deploy:sync-live-cron
  · Ventana inteligente: 0 API requests fuera de partidos
  · En ventana: 1 req/min (live=all pilot, live=1 Mundial)

Calendario Mundial (plan Pro+): npm run deploy:sync-calendar-cron
  · 1x/día 06:00 CDMX — carga league=1 season=2026

Opcional: pausa livescore-relay (ya no se usa con api-sports).

App: ${appUrl}
Logs: npx railway logs --service "${APP}"
Cron: npx railway logs --service sync-live-cron
`);
} catch (e) {
  console.error("\n✗", e.message);
  process.exit(1);
}
