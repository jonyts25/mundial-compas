/**
 * México vs Serbia — modo EN VIVO vía WebSocket (sin replay simulado).
 * Requiere que el plan apifootball incluya el amistoso.
 *
 * Uso: node scripts/setup-railway-mexico-serbia-live.mjs
 */
import { spawnSync } from "node:child_process";

console.log("Redirigiendo a setup en vivo (WebSocket relay)…\n");

const result = spawnSync("node", ["scripts/setup-railway-live-relay.mjs"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
