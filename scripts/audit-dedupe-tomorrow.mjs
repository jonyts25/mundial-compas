#!/usr/bin/env node
/**
 * Audita partidos duplicados de mañana (CDMX) y opcionalmente consolida pronósticos.
 *
 * Requiere:
 * - ADMIN_CARGAR_PARTIDOS_SECRET
 * - NEXT_PUBLIC_APP_URL (opcional, default producción)
 *
 * Uso:
 *   node scripts/audit-dedupe-tomorrow.mjs
 *   node scripts/audit-dedupe-tomorrow.mjs --consolidate
 *   node scripts/audit-dedupe-tomorrow.mjs --date=2026-07-03
 *   node scripts/audit-dedupe-tomorrow.mjs --consolidate --dry-run
 */
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const args = process.argv.slice(2);
const consolidate = args.includes("--consolidate");
const dryRun = args.includes("--dry-run");
const dateArg = args.find((arg) => arg.startsWith("--date="));
const date = dateArg?.slice("--date=".length);

const secret = process.env.ADMIN_CARGAR_PARTIDOS_SECRET;
const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://mundial-compas.up.railway.app";

if (!secret) {
  console.error("Falta ADMIN_CARGAR_PARTIDOS_SECRET en .env.local");
  process.exit(1);
}

const params = new URLSearchParams();
params.set("mode", consolidate ? "consolidate" : "audit");
if (date) params.set("date", date);
if (dryRun) params.set("dryRun", "1");

const url = `${base}/api/admin/dedupe-partidos?${params.toString()}`;
console.log(`POST ${url}`);

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(`Status: ${res.status}`);

try {
  console.log(JSON.stringify(JSON.parse(body), null, 2));
} catch {
  console.log(body);
}

if (!res.ok) process.exit(1);
