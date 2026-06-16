#!/usr/bin/env node
/**
 * Audita conflictos de fusión de pronósticos usando un snapshot PITR de Supabase.
 *
 * Requisitos:
 * - PITR_SUPABASE_URL + PITR_SERVICE_ROLE_KEY (proyecto restaurado antes de dedupe)
 * - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (producción)
 * - ADMIN_CARGAR_PARTIDOS_SECRET
 * - APP_URL (opcional, default http://localhost:3000)
 *
 * Uso:
 *   node scripts/audit-pronostico-dedupe.mjs
 *   node scripts/audit-pronostico-dedupe.mjs --notify
 */

import { createClient } from "@supabase/supabase-js";

const PRONOSTICO_DEDUPE_CONFLICT_AUDIT_SQL = `
WITH archived_pairs AS (
  SELECT
    migration_name,
    canonical_partido_id AS canonical_id,
    legacy_partido_id AS legacy_id
  FROM public.partido_dedupe_pair_archive
),
provider_pairs AS (
  SELECT
    'dedupe_partidos_provider_fixture_ids'::text AS migration_name,
    ids[1] AS canonical_id,
    ids[2] AS legacy_id
  FROM (
    SELECT array_agg(id ORDER BY api_football_fixture_id DESC, created_at DESC) AS ids
    FROM public.partidos
    GROUP BY
      public.norm_partido_team_name(equipo_local_nombre),
      public.norm_partido_team_name(equipo_visitante_nombre),
      fecha_kickoff
    HAVING count(*) > 1
  ) grouped
  WHERE array_length(ids, 1) >= 2
),
all_pairs AS (
  SELECT * FROM archived_pairs
  UNION ALL
  SELECT * FROM provider_pairs
)
SELECT
  p.migration_name,
  pr_l.usuario_id,
  pr_l.liga_id,
  p.canonical_id AS partido_id,
  p.legacy_id AS legacy_partido_id,
  pr_l.goles_local AS kept_goles_local,
  pr_l.goles_visitante AS kept_goles_visitante,
  pr_c.goles_local AS discarded_goles_local,
  pr_c.goles_visitante AS discarded_goles_visitante,
  (pr_l.goles_local = pr_c.goles_local
    AND pr_l.goles_visitante = pr_c.goles_visitante) AS scores_equal
FROM all_pairs p
JOIN public.pronosticos pr_l ON pr_l.partido_id = p.legacy_id
JOIN public.pronosticos pr_c ON pr_c.partido_id = p.canonical_id
  AND pr_c.usuario_id = pr_l.usuario_id
  AND pr_c.liga_id = pr_l.liga_id;
`.trim();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

async function runSql(client, sql) {
  const { data, error } = await client.rpc("exec_sql", { query: sql });
  if (error?.message?.includes("Could not find the function")) {
    throw new Error(
      "El snapshot PITR no expone exec_sql. Ejecuta el SQL en el SQL Editor y pásalo con --file=rows.json",
    );
  }
  if (error) throw error;
  return data;
}

async function fetchConflictsFromPitr() {
  const pitrUrl = process.env.PITR_SUPABASE_URL ?? process.env.BACKUP_SUPABASE_URL;
  const pitrKey =
    process.env.PITR_SERVICE_ROLE_KEY ?? process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;

  if (!pitrUrl || !pitrKey) {
    return null;
  }

  const client = createClient(pitrUrl, pitrKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Supabase JS no ejecuta SQL arbitrario; usar REST /rest/v1/rpc no aplica.
  // Intentamos vía fetch al endpoint SQL de Management API si está disponible.
  const projectRef = new URL(pitrUrl).hostname.split(".")[0];
  console.log(`Snapshot PITR detectado (${projectRef}).`);
  console.log(
    "Ejecuta este SQL en el SQL Editor del snapshot y guarda el JSON resultante:",
  );
  console.log("\n--- SQL ---\n");
  console.log(PRONOSTICO_DEDUPE_CONFLICT_AUDIT_SQL);
  console.log("\n--- fin SQL ---\n");
  console.log(
    "Luego importa con: node scripts/audit-pronostico-dedupe.mjs --file=conflicts.json [--notify]",
  );
  return null;
}

async function loadRowsFromFile(filePath) {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("--file debe contener un array JSON de conflictos");
  }
  return parsed;
}

async function importToProd(rows, notify) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const secret = required("ADMIN_CARGAR_PARTIDOS_SECRET");

  const res = await fetch(`${appUrl}/api/admin/audit-pronostico-dedupe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rows, notify }),
  });

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
  if (!res.ok) process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const notify = args.includes("--notify");
  const fileArg = args.find((a) => a.startsWith("--file="));
  const filePath = fileArg?.slice("--file=".length);

  if (filePath) {
    const rows = await loadRowsFromFile(filePath);
    console.log(`Importando ${rows.length} conflictos…`);
    await importToProd(rows, notify);
    return;
  }

  await fetchConflictsFromPitr();
  console.error(
    "Sin --file= ni credenciales PITR completas. Restaura un snapshot PITR en Supabase Dashboard " +
      "(antes del 15-jun-2026 dedupe) y exporta el SQL anterior.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
