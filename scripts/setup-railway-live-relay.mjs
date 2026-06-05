/**
 * Restaura modo EN VIVO: WebSocket relay (sin replay simulado).
 * Uso: node scripts/setup-railway-live-relay.mjs
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
const leagueId = process.env.APIFOOTBALL_PILOT_LEAGUE_ID?.trim() || "";

const pilotVars = {
  PILOT_MODE_ENABLED: "true",
  APIFOOTBALL_PILOT_FROM: process.env.APIFOOTBALL_PILOT_FROM || today,
  APIFOOTBALL_PILOT_TO: process.env.APIFOOTBALL_PILOT_TO || today,
  APIFOOTBALL_PILOT_LABEL: "Mexico_vs_Serbia_live",
};

if (leagueId) {
  pilotVars.APIFOOTBALL_PILOT_LEAGUE_ID = leagueId;
}

const relayVars = {
  ...pilotVars,
  API_FOOTBALL_KEY: apiKey || "",
  API_FOOTBALL_WEBHOOK_SECRET: webhookSecret || "",
  NEXT_PUBLIC_APP_URL: appUrl,
  APIFOOTBALL_TIMEZONE: timezone,
};

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: root,
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} → exit ${result.status}`);
  }
}

function runRailway(args) {
  run("npx", ["railway", ...args]);
}

function setVars(service, vars) {
  console.log(`\n→ Variables en ${service}…`);
  for (const [key, value] of Object.entries(vars)) {
    if (value === "") continue;
    console.log(`  ${key}=${value}`);
    runRailway(["variable", "set", `${key}=${value}`, "--service", service]);
  }
}

function unsetVar(service, key) {
  try {
    runRailway(["variable", "delete", key, "--service", service]);
  } catch {
    console.log(`  (skip delete ${key})`);
  }
}

try {
  console.log("=== Modo EN VIVO (WebSocket relay) ===");
  console.log(`  fecha=${pilotVars.APIFOOTBALL_PILOT_FROM}`);
  console.log(
    leagueId
      ? `  league_id=${leagueId} (filtra WebSocket)`
      : "  sin league_id (todos los partidos del plan)",
  );

  if (!apiKey || !webhookSecret) {
    console.error("Faltan API_FOOTBALL_KEY o API_FOOTBALL_WEBHOOK_SECRET");
    process.exit(1);
  }

  setVars(APP, pilotVars);
  setVars(RELAY, relayVars);

  // Quitar vars del runner simulado
  for (const key of [
    "MEXICO_SERBIA_REPLAY_DELAY_MS",
    "MEXICO_SERBIA_KICKOFF_HOUR",
    "RAILWAY_DOCKERFILE_PATH",
  ]) {
    unsetVar(RELAY, key);
  }

  console.log("\n→ Diagnóstico plan API…");
  run("node", ["scripts/discover-api-plan.mjs"]);

  console.log("\n→ Deploy relay WebSocket…");
  run("powershell", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "./scripts/deploy-livescore-relay.ps1",
  ]);

  console.log("\n✓ Relay en vivo desplegado.");
  console.log("  Logs: npx railway logs --service livescore-relay");
} catch (e) {
  console.error("\n✗", e.message);
  process.exit(1);
}
