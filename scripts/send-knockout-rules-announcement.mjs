#!/usr/bin/env node
/**
 * Broadcast reglas eliminatoria (push) — dry-run por defecto.
 *
 *   node scripts/send-knockout-rules-announcement.mjs
 *   node scripts/send-knockout-rules-announcement.mjs --send
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = ["tsx", "scripts/knockout-rules-announce-cli.ts", ...process.argv.slice(2)];

const result = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
