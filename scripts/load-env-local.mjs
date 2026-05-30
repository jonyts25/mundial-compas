import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Carga .env.local desde la raiz del repo (sobreescribe vars vacias del shell). */
export function loadEnvLocal() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return envPath;

  const raw = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
  return envPath;
}
