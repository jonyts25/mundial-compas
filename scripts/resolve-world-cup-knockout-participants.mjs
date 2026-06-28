#!/usr/bin/env node
/**
 * Resolve knockout participants from group standings + bracket tree.
 *
 * Usage:
 *   node scripts/resolve-world-cup-knockout-participants.mjs
 *   node scripts/resolve-world-cup-knockout-participants.mjs --dry-run
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = ["tsx", "scripts/knockout-resolve-cli.ts", ...process.argv.slice(2)];

const result = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
