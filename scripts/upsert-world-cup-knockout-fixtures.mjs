#!/usr/bin/env node
/**
 * Insert/update all 32 World Cup 2026 knockout fixtures.
 *
 * Usage:
 *   node scripts/upsert-world-cup-knockout-fixtures.mjs
 *   node scripts/upsert-world-cup-knockout-fixtures.mjs --dry-run
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = ["tsx", "scripts/knockout-upsert-cli.ts", ...process.argv.slice(2)];

const result = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
