/**
 * Configura Railway para el pilot México vs Serbia y despliega app + runner.
 * Uso: node scripts/setup-railway-mexico-serbia-live.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const APP = process.env.RAILWAY_APP_SERVICE_ID ?? "63107052-f83f-468e-a51b-bb8c25e86c01";
const RELAY = process.env.RAILWAY_RELAY_SERVICE_ID ?? "adb1d1fd-acb2-44da-9af7-c47884c35420";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/Mexico_City",
});

const apiKey = process.env.API_FOOTBALL_KEY;
const webhookSecret = process.env.API_FOOTBALL_WEBHOOK_SECRET;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://mundial-compas.up.railway.app";
const timezone = process.env.APIFOOTBALL_TIMEZONE ?? "America/Mexico_City";
const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!webhookSecret || !sbUrl || !sbKey) {
  console.error("Faltan API_FOOTBALL_WEBHOOK_SECRET o credenciales Supabase en .env.local");
  console.error("Sincroniza: powershell -File scripts/sync-env-from-railway.ps1");
  process.exit(1);
}

const pilotVars = {
  PILOT_MODE_ENABLED: "true",
  APIFOOTBALL_PILOT_LEAGUE_ID: "776",
  APIFOOTBALL_PILOT_FROM: process.env.APIFOOTBALL_PILOT_FROM || today,
  APIFOOTBALL_PILOT_TO: process.env.APIFOOTBALL_PILOT_TO || today,
  APIFOOTBALL_PILOT_LABEL: "Mexico_vs_Serbia_prueba",
  MEXICO_SERBIA_KICKOFF_HOUR: process.env.MEXICO_SERBIA_KICKOFF_HOUR || "20",
  MEXICO_SERBIA_KICKOFF_MINUTE: process.env.MEXICO_SERBIA_KICKOFF_MINUTE || "0",
  MEXICO_SERBIA_REPLAY_DELAY_MS: process.env.MEXICO_SERBIA_REPLAY_DELAY_MS || "25000",
};

const relayVars = {
  ...pilotVars,
  NEXT_PUBLIC_SUPABASE_URL: sbUrl,
  SUPABASE_SERVICE_ROLE_KEY: sbKey,
  API_FOOTBALL_KEY: apiKey || "",
  API_FOOTBALL_WEBHOOK_SECRET: webhookSecret,
  NEXT_PUBLIC_APP_URL: appUrl,
  APIFOOTBALL_TIMEZONE: timezone,
};

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: root,
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} → exit ${result.status}`);
  }
}

function runRailway(args) {
  run("npx", ["railway", ...args]);
}

function setVars(service, vars) {
  console.log(`\n→ Variables en ${service} (${Object.keys(vars).length})…`);
  for (const [key, value] of Object.entries(vars)) {
    if (value === "") continue;
    console.log(`  ${key}`);
    const quoted =
      value.includes(" ") || value.includes("-")
        ? `"${key}=${value.replace(/"/g, '\\"')}"`
        : `${key}=${value}`;
    runRailway(["variable", "set", quoted, "--service", service]);
  }
}

try {
  console.log("=== Pilot México vs Serbia ===");
  console.log(`  fecha=${pilotVars.APIFOOTBALL_PILOT_FROM} kickoff=${pilotVars.MEXICO_SERBIA_KICKOFF_HOUR}:${pilotVars.MEXICO_SERBIA_KICKOFF_MINUTE} CDMX`);

  setVars(APP, pilotVars);
  setVars(RELAY, relayVars);

  console.log("\n→ Cargar partido en Supabase…");
  run("node", ["scripts/cargar-pilot-mexico-serbia.mjs"]);

  console.log("\n→ Deploy app (Mundial Compas Service)…");
  runRailway(["up", "--detach", "--service", APP]);

  console.log("\n→ Deploy runner en livescore-relay…");
  run("powershell", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "./scripts/deploy-mexico-serbia-runner.ps1",
  ]);

  console.log("\n✓ Todo listo.");
  console.log("  El runner esperará el kickoff y simulará el partido vía webhook.");
  console.log("  Logs: npx railway logs --service livescore-relay");
  console.log("  Forzar ahora: node scripts/replay-mexico-serbia-live.mjs --reset");
} catch (e) {
  console.error("\n✗", e.message);
  process.exit(1);
}
