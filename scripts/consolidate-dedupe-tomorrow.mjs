#!/usr/bin/env node
/**
 * Audita/consolida duplicados de mañana directo en Supabase (sin deploy del endpoint).
 *
 * Uso:
 *   node scripts/consolidate-dedupe-tomorrow.mjs
 *   node scripts/consolidate-dedupe-tomorrow.mjs --consolidate
 *   node scripts/consolidate-dedupe-tomorrow.mjs --date=2026-07-03 --consolidate
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const args = process.argv.slice(2);
const consolidate = args.includes("--consolidate");
const dryRun = args.includes("--dry-run");
const dateArg = args.find((arg) => arg.startsWith("--date="));
const dateKey = dateArg?.slice("--date=".length);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Dynamic import para reutilizar la lib TypeScript compilada vía tsx
const { auditPartidoDuplicates, consolidatePartidoDuplicates, tomorrowMexicoDateKey } =
  await import("../src/lib/partidos/dedupe-partidos-consolidate.ts");

const targetDate = dateKey ?? tomorrowMexicoDateKey();

if (consolidate) {
  const result = await consolidatePartidoDuplicates(supabase, {
    dateKey: targetDate,
    dryRun,
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length > 0) process.exit(1);
} else {
  const result = await auditPartidoDuplicates(supabase, { dateKey: targetDate });
  console.log(JSON.stringify(result, null, 2));
  if (result.hasDuplicates) process.exit(2);
}
