#!/usr/bin/env node
/**
 * Broadcast quiniela por rondas + partido de hoy (push) — dry-run por defecto.
 *
 *   node scripts/send-knockout-round-quiniela-announcement.mjs
 *   node scripts/send-knockout-round-quiniela-announcement.mjs --send
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = [
  "tsx",
  "scripts/knockout-round-quiniela-announce-cli.ts",
  ...process.argv.slice(2),
];

const result = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
