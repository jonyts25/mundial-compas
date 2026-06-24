/**
 * Inspección dry-run de eventos VAR / Missed Penalty / Goal cancelled (VAR-EVENTS-1).
 *
 * Uso:
 *   node scripts/inspect-var-events.mjs
 *   node scripts/inspect-var-events.mjs --fixture-id=1489395
 *   node scripts/inspect-var-events.mjs --limit=10
 *   node scripts/inspect-var-events.mjs --dry-run   (default, no escribe)
 *
 * Requiere .env.local: API_SPORTS_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const BASE = "https://v3.football.api-sports.io";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const apiKey = process.env.API_SPORTS_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

const args = process.argv.slice(2);
const dryRun = !args.includes("--write");
const fixtureArg = args.find((a) => a.startsWith("--fixture-id="));
const limitArg = args.find((a) => a.startsWith("--limit="));
const fixtureFilter = fixtureArg ? Number(fixtureArg.split("=")[1]) : null;
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1])) : null;

if (!apiKey || !supabaseUrl || !supabaseKey) {
  console.error(
    "Faltan API_SPORTS_KEY, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function isRelevantEvent(ev) {
  if (ev.type === "Var") return true;
  if (ev.type === "Goal" && (ev.detail ?? "").toLowerCase().includes("missed penalty")) {
    return true;
  }
  return false;
}

function classify(ev) {
  if (ev.type === "Var") {
    const d = (ev.detail ?? "").toLowerCase();
    if (d.includes("goal cancelled") || d.includes("goal disallowed")) {
      return "var_goal_cancelled";
    }
    if (d.includes("penalty")) return "var_penalty";
    return "var_other";
  }
  if (ev.type === "Goal" && (ev.detail ?? "").toLowerCase().includes("missed penalty")) {
    return "missed_penalty";
  }
  return "other";
}

async function fetchEvents(fixtureId) {
  const res = await fetch(`${BASE}/fixtures/events?fixture=${fixtureId}`, {
    headers: { "x-apisports-key": apiKey },
  });
  if (!res.ok) throw new Error(`API ${res.status} fixture=${fixtureId}`);
  const json = await res.json();
  return json.response ?? [];
}

async function main() {
  console.log(`[inspect-var-events] modo=${dryRun ? "dry-run (solo lectura)" : "write"}`);
  if (!dryRun) {
    console.warn("Este script no implementa escritura — use sync-live o backfill futuro.");
  }

  let query = supabase
    .from("partidos")
    .select(
      "id, api_football_fixture_id, equipo_local_nombre, equipo_visitante_nombre, estatus, metadata",
    )
    .eq("estatus", "finalizado")
    .not("api_football_fixture_id", "is", null)
    .order("fecha_kickoff", { ascending: true });

  if (fixtureFilter) {
    query = query.eq("api_football_fixture_id", fixtureFilter);
  }

  const { data: partidos, error } = await query;
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = (partidos ?? []).filter((p) => p.api_football_fixture_id != null);
  const slice = limit ? rows.slice(0, limit) : rows;

  const summary = {
    fixtures_scanned: 0,
    var_events: 0,
    var_goal_cancelled: 0,
    var_penalty: 0,
    missed_penalty: 0,
    persisted_var_in_db: 0,
    persisted_penal_fallado_in_db: 0,
    examples: [],
  };

  for (const p of slice) {
    const fixtureId = p.api_football_fixture_id;
    summary.fixtures_scanned += 1;

    let events;
    try {
      events = await fetchEvents(fixtureId);
    } catch (e) {
      console.warn(`fixture ${fixtureId}: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    const relevant = events.filter(isRelevantEvent);
    const dbMomentos = Array.isArray(p.metadata?.eventos_clave)
      ? p.metadata.eventos_clave
      : [];
    const dbVar = dbMomentos.filter((m) => m.tipo === "var").length;
    const dbPenal = dbMomentos.filter((m) => m.tipo === "penal_fallado").length;
    summary.persisted_var_in_db += dbVar;
    summary.persisted_penal_fallado_in_db += dbPenal;

    if (relevant.length === 0) continue;

    console.log(
      `\n--- ${p.equipo_local_nombre} vs ${p.equipo_visitante_nombre} (fixture ${fixtureId}) ---`,
    );
    console.log(`  DB: var=${dbVar} penal_fallado=${dbPenal}`);

    for (const ev of relevant) {
      const kind = classify(ev);
      summary.var_events += ev.type === "Var" ? 1 : 0;
      if (kind === "var_goal_cancelled") summary.var_goal_cancelled += 1;
      if (kind === "var_penalty") summary.var_penalty += 1;
      if (kind === "missed_penalty") summary.missed_penalty += 1;

      const line = `  [${kind}] min ${ev.time?.elapsed ?? "?"}' ${ev.player?.name ?? "—"} — ${ev.detail}`;
      console.log(line);

      if (summary.examples.length < 12) {
        summary.examples.push({
          fixture_id: fixtureId,
          partido_id: p.id,
          kind,
          minute: ev.time?.elapsed ?? null,
          player: ev.player?.name ?? null,
          detail: ev.detail ?? null,
          db_has_type:
            kind === "missed_penalty"
              ? dbPenal > 0
              : kind.startsWith("var")
                ? dbVar > 0
                : false,
        });
      }
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nReporte sugerido: ${path.join(ROOT, "VAR_EVENTS_1_REPORT.md")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
