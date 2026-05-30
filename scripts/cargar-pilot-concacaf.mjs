/**
 * Carga la Final Concacaf Champions (Toluca vs Tigres) como partido pilot.
 * Uso: node scripts/cargar-pilot-concacaf.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: process.env.APIFOOTBALL_TIMEZONE || "America/Mexico_City",
});

const args = [
  "scripts/cargar-pilot-local.mjs",
  "--league=5",
  `--from=${process.env.APIFOOTBALL_PILOT_FROM || today}`,
  `--to=${process.env.APIFOOTBALL_PILOT_TO || today}`,
  `--label=${process.env.APIFOOTBALL_PILOT_LABEL || "Concacaf Champions — Final Toluca vs Tigres"}`,
];

console.log("Cargando pilot Concacaf Champions (league_id=5)…");

const result = spawnSync("node", args, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
