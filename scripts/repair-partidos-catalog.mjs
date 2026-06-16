import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const secret = process.env.ADMIN_CARGAR_PARTIDOS_SECRET;
const base =
  process.argv[2]?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://mundial-compas.up.railway.app";

if (!secret) {
  console.error("Faltan ADMIN_CARGAR_PARTIDOS_SECRET");
  process.exit(1);
}

const url = `${base}/api/admin/repair-partidos`;
console.log(`POST ${url}`);

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(`Status: ${res.status}`);
console.log(body);

if (!res.ok) process.exit(1);
