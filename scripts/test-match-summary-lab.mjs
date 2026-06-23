/**
 * Wrapper para npm run test:match-summary (ejecuta el runner TypeScript).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(dir, "test-match-summary-lab.ts");

const result = spawnSync("npx", ["tsx", runner, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
