/**
 * Verifica migraciones aplicadas y objetos clave en Supabase.
 * node scripts/check-db-migrations.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const localMigrations = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function tableExists(name) {
  const { error } = await supabase.from(name).select("*", { count: "exact", head: true });
  return !error;
}

async function main() {
  console.log("=== Migraciones locales (repo) ===");
  console.log(`Total: ${localMigrations.length}\n`);
  for (const f of localMigrations) console.log(`  ${f}`);

  console.log("\n=== Migraciones en Supabase (schema_migrations) ===");
  const { data: applied, error: migErr } = await supabase
    .schema("supabase_migrations")
    .from("schema_migrations")
    .select("version, name")
    .order("version");

  if (migErr) {
    console.log("No se pudo leer supabase_migrations:", migErr.message);
    console.log("(A veces el service role no expone ese schema vía PostgREST)\n");
  } else if (!applied?.length) {
    console.log("Tabla vacía o sin filas — ¿aplicaste migraciones con CLI?\n");
  } else {
    const versions = new Set(applied.map((r) => r.version));
    for (const row of applied) {
      console.log(`  ✓ ${row.version} ${row.name ?? ""}`);
    }
    console.log(`\nAplicadas en remoto: ${applied.length}`);

    const missing = localMigrations.filter((file) => {
      const version = file.replace(".sql", "").split("_")[0];
      // version in supabase is full timestamp prefix like 20260530120000
      const ts = file.match(/^(\d+)/)?.[1];
      return ts && !versions.has(ts) && !applied.some((a) => a.version?.startsWith(ts.slice(0, 8)));
    });

    // Better: match by filename without extension
    const appliedNames = new Set(
      applied.map((r) => (r.name ?? r.version ?? "").toString()),
    );
    const missingByFile = localMigrations.filter((f) => {
      const base = f.replace(".sql", "");
      return !applied.some(
        (a) =>
          String(a.version).includes(base.split("_")[0]) ||
          String(a.name ?? "").includes(base),
      );
    });

    if (missingByFile.length) {
      console.log("\n⚠ Posibles migraciones NO registradas (heurística):");
      for (const f of missingByFile) console.log(`  ? ${f}`);
    } else {
      console.log("\n✅ Todas las migraciones del repo parecen registradas.");
    }
  }

  console.log("\n=== Objetos clave (tablas / datos) ===");
  const checks = [
    ["usuarios", "usuarios"],
    ["partidos", "partidos"],
    ["mensajes_chat", "mensajes_chat"],
    ["datos_mamalones", "datos_mamalones"],
    ["push_subscriptions", "push_subscriptions (20260530120000)"],
    ["push_partidos_silenciados", "push_partidos_silenciados (20260530190000)"],
    ["liquidacion_pagos", "liquidacion_pagos (competencia)"],
    ["webhook_eventos", "webhook_eventos"],
  ];

  for (const [table, label] of checks) {
    const ok = await tableExists(table);
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  }

  const { count: datosCount } = await supabase
    .from("datos_mamalones")
    .select("*", { count: "exact", head: true })
    .eq("activo", true);

  const { count: partidosCount } = await supabase
    .from("partidos")
    .select("*", { count: "exact", head: true });

  console.log(`\n  datos_mamalones activos: ${datosCount ?? "?"}`);
  console.log(`  partidos en BD: ${partidosCount ?? "?"}`);

  // Check enum canal if column accepts azteca
  const { data: sampleCanal } = await supabase
    .from("partidos")
    .select("canal_transmision")
    .eq("canal_transmision", "azteca_7")
    .limit(1);

  console.log(
    `\n  canal azteca_7 en partidos: ${sampleCanal !== null ? "consulta OK (enum existe)" : "?"}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
