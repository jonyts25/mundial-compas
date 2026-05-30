/**
 * Prueba el webhook en producción (sin exponer el secret en consola).
 * Uso: node scripts/test-webhook.mjs
 */
import fs from "node:fs";

function loadEnv() {
  const raw = fs.readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const secret = process.env.API_FOOTBALL_WEBHOOK_SECRET;
const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://mundial-compas.up.railway.app";

if (!secret) {
  console.error("Falta API_FOOTBALL_WEBHOOK_SECRET en .env.local");
  process.exit(1);
}

if (secret.includes("generate-a-long") || secret.length < 16) {
  console.warn("⚠️  El secret parece placeholder — cámbialo en Railway y apifootball.");
}

const url = `${base}/api/webhooks/football`;

console.log(`GET ${url}`);
const getRes = await fetch(url);
console.log(`  → ${getRes.status}`, await getRes.text());

console.log("\nPOST sin auth (esperado 401):");
const noAuth = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
console.log(`  → ${noAuth.status}`, await noAuth.text());

console.log("\nPOST con auth, payload vacío (esperado 422):");
const badBody = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  },
  body: "{}",
});
console.log(`  → ${badBody.status}`, await badBody.text());

console.log("\nPOST con auth, match_id ficticio (esperado 404 partido no registrado):");
const fakeMatch = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  },
  body: JSON.stringify({ match_id: "999999999", match_status: "1st Half" }),
});
console.log(`  → ${fakeMatch.status}`, await fakeMatch.text());

console.log(
  "\nSi auth devuelve 401: el secret en .env.local ≠ Railway ≠ lo que envía apifootball.",
);
console.log(
  "Nota: apifootball usa WebSocket (wss://wss.apifootball.com/livescore), no HTTP POST directo.",
);
