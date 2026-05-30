/**
 * Configura Railway (app + livescore-relay) para el pilot Concacaf en vivo.
 * Uso: node scripts/setup-railway-concacaf-live.mjs
 */
import { spawnSync } from "node:child_process";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const APP = process.env.RAILWAY_APP_SERVICE_ID ?? "63107052-f83f-468e-a51b-bb8c25e86c01";
const RELAY = process.env.RAILWAY_RELAY_SERVICE_ID ?? "adb1d1fd-acb2-44da-9af7-c47884c35420";
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/Mexico_City",
});

const apiKey = process.env.API_FOOTBALL_KEY;
const webhookSecret = process.env.API_FOOTBALL_WEBHOOK_SECRET;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://mundial-compas.up.railway.app";
const timezone = process.env.APIFOOTBALL_TIMEZONE ?? "America/Mexico_City";

if (!apiKey || !webhookSecret) {
  console.error("Faltan API_FOOTBALL_KEY o API_FOOTBALL_WEBHOOK_SECRET en .env.local");
  console.error("Sincroniza: powershell -File scripts/sync-env-from-railway.ps1");
  process.exit(1);
}

const pilotVars = {
  PILOT_MODE_ENABLED: "true",
  APIFOOTBALL_PILOT_LEAGUE_ID: "5",
  APIFOOTBALL_PILOT_FROM: process.env.APIFOOTBALL_PILOT_FROM || today,
  APIFOOTBALL_PILOT_TO: process.env.APIFOOTBALL_PILOT_TO || today,
  APIFOOTBALL_PILOT_LABEL: "Concacaf Champions - Final Toluca vs Tigres",
};

const relayVars = {
  ...pilotVars,
  API_FOOTBALL_KEY: apiKey,
  API_FOOTBALL_WEBHOOK_SECRET: webhookSecret,
  NEXT_PUBLIC_APP_URL: appUrl,
  APIFOOTBALL_TIMEZONE: timezone,
};

function runRailway(args) {
  const cmd = ["npx", "railway", ...args].join(" ");
  const result = spawnSync(cmd, {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} → exit ${result.status}`);
  }
}

function setVars(service, vars) {
  console.log(`\n→ Variables en servicio ${service} (${Object.keys(vars).length})…`);
  for (const [key, value] of Object.entries(vars)) {
    console.log(`  ${key}`);
    runRailway([
      "variable",
      "set",
      `"${key}=${value}"`,
      "--service",
      service,
    ]);
  }
}

try {
  console.log("Configurando pilot Concacaf en Railway…");
  console.log(`  league_id=5 | ${pilotVars.APIFOOTBALL_PILOT_FROM} → ${pilotVars.APIFOOTBALL_PILOT_TO}`);

  setVars(APP, pilotVars);
  setVars(RELAY, relayVars);

  console.log("\n→ Redeploy livescore-relay…");
  runRailway(["up", "--detach", "--service", RELAY]);

  console.log("\n✓ Listo. Puedes apagar la PC.");
  console.log("  Logs relay: npx railway logs --service livescore-relay");
  console.log("  Para el relay local: Ctrl+C si lo tienes abierto (solo uno activo).");
} catch (e) {
  console.error("\n✗", e.message);
  process.exit(1);
}
