/**
 * Backfill metadata.statistics para partidos finalizados (MATCH-STATS-FT-1).
 *
 * Uso:
 *   node scripts/backfill-match-statistics.mjs --partido-id=<uuid>
 *   node scripts/backfill-match-statistics.mjs --fixture-id=1539017
 *   node scripts/backfill-match-statistics.mjs --partido-id=<uuid> --dry-run
 *   node scripts/backfill-match-statistics.mjs --all-finalizados
 *   node scripts/backfill-match-statistics.mjs --all-finalizados --dry-run
 *   node scripts/backfill-match-statistics.mjs --all-finalizados --batch-size=3 --delay-ms=7000
 *
 * Requiere .env.local: API_SPORTS_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const BASE = "https://v3.football.api-sports.io";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "MATCH_STATS_BACKFILL_REPORT.md");

const apiKey = process.env.API_SPORTS_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const allFinalizados = args.includes("--all-finalizados");
const partidoArg = args.find((a) => a.startsWith("--partido-id="));
const fixtureArg = args.find((a) => a.startsWith("--fixture-id="));
const batchSizeArg = args.find((a) => a.startsWith("--batch-size="));
const delayArg = args.find((a) => a.startsWith("--delay-ms="));
const limitArg = args.find((a) => a.startsWith("--limit="));

const partidoId = partidoArg?.split("=")[1]?.trim() ?? null;
const fixtureIdArg = fixtureArg ? Number(fixtureArg.split("=")[1]) : null;
const batchSize = batchSizeArg
  ? Math.max(1, Number(batchSizeArg.split("=")[1]) || 3)
  : 3;
const delayMs = delayArg
  ? Math.max(500, Number(delayArg.split("=")[1]) || 7000)
  : 7000;
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1])) : null;

if (!apiKey || !supabaseUrl || !supabaseKey) {
  console.error(
    "Faltan API_SPORTS_KEY, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

if (!partidoId && !fixtureIdArg && !allFinalizados) {
  console.error(
    "Indica --partido-id=<uuid>, --fixture-id=<número> o --all-finalizados",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseStatValue(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  const pct = s.endsWith("%") ? s.slice(0, -1).trim() : s;
  const n = Number.parseFloat(pct);
  return Number.isFinite(n) ? n : null;
}

function pickStat(stats, types) {
  for (const type of types) {
    const row = stats?.find((s) => s.type === type);
    if (!row) continue;
    const parsed = parseStatValue(row.value);
    if (parsed != null) return parsed;
  }
  return null;
}

function normalizeStatistics(teams, homeTeamId, fetchedAt) {
  if (!teams?.length) return null;
  const home = teams.find((t) => t.team?.id === homeTeamId);
  const away = teams.find((t) => t.team?.id !== homeTeamId);
  if (!home || !away) return null;

  const side = (block, types) => pickStat(block.statistics ?? [], types);

  return {
    provider: "api-sports",
    fetched_at: fetchedAt,
    possession_home_pct: side(home, ["Ball Possession"]),
    possession_away_pct: side(away, ["Ball Possession"]),
    shots_total_home: side(home, ["Total Shots"]),
    shots_total_away: side(away, ["Total Shots"]),
    shots_on_home: side(home, ["Shots on Goal"]),
    shots_on_away: side(away, ["Shots on Goal"]),
    corners_home: side(home, ["Corner Kicks"]),
    corners_away: side(away, ["Corner Kicks"]),
    fouls_home: side(home, ["Fouls"]),
    fouls_away: side(away, ["Fouls"]),
    offsides_home: side(home, ["Offsides"]),
    offsides_away: side(away, ["Offsides"]),
    xg_home: side(home, ["expected_goals", "Expected Goals"]),
    xg_away: side(away, ["expected_goals", "Expected Goals"]),
  };
}

function hasPersistedStatistics(metadata) {
  const s = metadata?.statistics;
  return (
    s &&
    typeof s === "object" &&
    s.provider === "api-sports" &&
    typeof s.fetched_at === "string" &&
    s.fetched_at.length > 0
  );
}

function readHomeTeamId(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  const api = metadata.api_football;
  if (!api || typeof api !== "object") return null;
  const id = api.home_team_id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && id.trim()) {
    const n = Number.parseInt(id, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchStatistics(fixtureId) {
  const url = new URL(`${BASE}/fixtures/statistics`);
  url.searchParams.set("fixture", String(fixtureId));
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey, Accept: "application/json" },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `API HTTP ${res.status}: ${JSON.stringify(body.errors ?? body)}`,
    );
  }
  const errObj = body.errors;
  const hasErr =
    (Array.isArray(errObj) && errObj.length > 0) ||
    (errObj &&
      typeof errObj === "object" &&
      Object.keys(errObj).length > 0);
  if (hasErr) {
    throw new Error(`API errors: ${JSON.stringify(errObj)}`);
  }
  return body.response ?? [];
}

async function fetchFixtureHomeTeamId(fixtureId) {
  const url = new URL(`${BASE}/fixtures`);
  url.searchParams.set("id", String(fixtureId));
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey, Accept: "application/json" },
  });
  const body = await res.json();
  const item = body.response?.[0];
  return item?.teams?.home?.id ?? null;
}

async function listPartidosSinStatistics() {
  const { data, error } = await supabase
    .from("partidos")
    .select(
      "id, api_football_fixture_id, estatus, equipo_local_nombre, equipo_visitante_nombre, metadata, fecha_kickoff",
    )
    .eq("estatus", "finalizado")
    .not("api_football_fixture_id", "is", null)
    .order("fecha_kickoff", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).filter((p) => !hasPersistedStatistics(p.metadata));
}

async function processPartido(partido, options = {}) {
  const { dryRun: dry = false, log = true } = options;
  const label = `${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`;
  const fixtureId = partido.api_football_fixture_id;

  if (partido.estatus !== "finalizado") {
    return {
      partido_id: partido.id,
      label,
      fixture_id: fixtureId,
      status: "skipped",
      reason: `estatus=${partido.estatus}`,
    };
  }

  if (!fixtureId) {
    return {
      partido_id: partido.id,
      label,
      fixture_id: null,
      status: "skipped",
      reason: "sin fixture_id",
    };
  }

  if (hasPersistedStatistics(partido.metadata)) {
    return {
      partido_id: partido.id,
      label,
      fixture_id: fixtureId,
      status: "skipped",
      reason: "statistics ya persistidas",
    };
  }

  try {
    let homeTeamId = readHomeTeamId(partido.metadata);
    let apiCalls = 0;

    if (!homeTeamId) {
      homeTeamId = await fetchFixtureHomeTeamId(fixtureId);
      apiCalls += 1;
      await sleep(delayMs);
    }

    if (!homeTeamId) {
      return {
        partido_id: partido.id,
        label,
        fixture_id: fixtureId,
        status: "failed",
        reason: "home_team_id no resuelto",
        api_calls: apiCalls,
      };
    }

    const teams = await fetchStatistics(fixtureId);
    apiCalls += 1;

    const fetchedAt = new Date().toISOString();
    const statistics = normalizeStatistics(teams, homeTeamId, fetchedAt);

    if (!statistics) {
      return {
        partido_id: partido.id,
        label,
        fixture_id: fixtureId,
        status: "failed",
        reason: "API sin statistics normalizables",
        api_calls: apiCalls,
      };
    }

    if (log) {
      console.log(`✓ ${label} (fixture ${fixtureId})`);
    }

    if (dry) {
      return {
        partido_id: partido.id,
        label,
        fixture_id: fixtureId,
        status: "dry_run",
        statistics,
        api_calls: apiCalls,
      };
    }

    const metadata = {
      ...(typeof partido.metadata === "object" && partido.metadata !== null
        ? partido.metadata
        : {}),
      statistics,
    };

    const { error: updateError } = await supabase
      .from("partidos")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", partido.id)
      .eq("estatus", "finalizado");

    if (updateError) {
      return {
        partido_id: partido.id,
        label,
        fixture_id: fixtureId,
        status: "failed",
        reason: updateError.message,
        api_calls: apiCalls,
      };
    }

    return {
      partido_id: partido.id,
      label,
      fixture_id: fixtureId,
      status: "updated",
      statistics,
      api_calls: apiCalls,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (log) console.error(`✗ ${label}: ${msg}`);
    return {
      partido_id: partido.id,
      label,
      fixture_id: fixtureId,
      status: "failed",
      reason: msg,
    };
  }
}

function writeReport(summary) {
  const lines = [
    "# MATCH-STATS-BACKFILL-1 — Reporte",
    "",
    `**Fecha:** ${summary.finished_at}`,
    `**Modo:** ${summary.dry_run ? "dry-run" : "escritura real"}`,
    `**Entorno:** producción Supabase`,
    "",
    "## Resumen",
    "",
    "| Métrica | Valor |",
    "|---------|------:|",
    `| Partidos finalizados con fixture | ${summary.total_finalizados_con_fixture} |`,
    `| Ya con statistics (antes) | ${summary.already_had_statistics} |`,
    `| Candidatos sin statistics | ${summary.candidates} |`,
    `| Procesados | ${summary.processed} |`,
    `| Actualizados | ${summary.updated} |`,
    `| Omitidos | ${summary.skipped} |`,
    `| Fallidos | ${summary.failed} |`,
    `| Llamadas API (aprox.) | ${summary.api_calls} |`,
    `| batch-size | ${summary.batch_size} |`,
    `| delay-ms | ${summary.delay_ms} |`,
    "",
    "## Ejemplos actualizados",
    "",
  ];

  for (const ex of summary.examples_updated) {
    lines.push(`### ${ex.label}`);
    lines.push("");
    lines.push(`- partido_id: \`${ex.partido_id}\``);
    lines.push(`- fixture: \`${ex.fixture_id}\``);
    lines.push(
      `- posesión: ${ex.statistics.possession_home_pct ?? "—"} / ${ex.statistics.possession_away_pct ?? "—"}`,
    );
    lines.push(
      `- tiros: ${ex.statistics.shots_total_home ?? "—"} / ${ex.statistics.shots_total_away ?? "—"}`,
    );
    lines.push("");
  }

  if (summary.examples_failed.length > 0) {
    lines.push("## Fallidos");
    lines.push("");
    lines.push("| Partido | fixture | Razón |");
    lines.push("|---------|---------|-------|");
    for (const f of summary.examples_failed) {
      lines.push(`| ${f.label} | ${f.fixture_id ?? "—"} | ${f.reason} |`);
    }
    lines.push("");
  }

  lines.push("## Notas");
  lines.push("");
  lines.push("- Solo `estatus=finalizado` con `api_football_fixture_id`.");
  lines.push("- No se tocaron partidos en_vivo ni programados.");
  lines.push("- Rate limit: pausa entre partidos y entre lotes.");

  fs.writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");
  console.log(`\nReporte: ${REPORT_PATH}`);
}

async function runBatch() {
  const startedAt = new Date().toISOString();
  console.log("=== backfill-match-statistics --all-finalizados ===\n");

  const { count: totalFt } = await supabase
    .from("partidos")
    .select("id", { count: "exact", head: true })
    .eq("estatus", "finalizado")
    .not("api_football_fixture_id", "is", null);

  const candidates = await listPartidosSinStatistics();
  const toProcess = limit ? candidates.slice(0, limit) : candidates;
  const alreadyHad = (totalFt ?? 0) - candidates.length;

  console.log(`Finalizados con fixture: ${totalFt ?? "?"}`);
  console.log(`Ya con statistics: ~${alreadyHad}`);
  console.log(`Candidatos sin statistics: ${candidates.length}`);
  console.log(`A procesar: ${toProcess.length}`);
  console.log(`batch-size=${batchSize} delay-ms=${delayMs} dry-run=${dryRun}\n`);

  const results = [];
  let apiCalls = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const partido = toProcess[i];
    console.log(`[${i + 1}/${toProcess.length}] ${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`);

    const result = await processPartido(partido, { dryRun, log: true });
    results.push(result);
    apiCalls += result.api_calls ?? 0;

    const isEndOfBatch = (i + 1) % batchSize === 0;
    const hasMore = i + 1 < toProcess.length;
    if (hasMore) {
      const pause = isEndOfBatch ? delayMs * 2 : delayMs;
      await sleep(pause);
    }
  }

  const updated = results.filter((r) => r.status === "updated");
  const failed = results.filter((r) => r.status === "failed");
  const skipped = results.filter((r) => r.status === "skipped");
  const dryRuns = results.filter((r) => r.status === "dry_run");

  const summary = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    dry_run: dryRun,
    total_finalizados_con_fixture: totalFt ?? 0,
    already_had_statistics: alreadyHad,
    candidates: candidates.length,
    processed: toProcess.length,
    updated: dryRun ? 0 : updated.length,
    dry_run_would_update: dryRun ? dryRuns.length : 0,
    skipped: skipped.length,
    failed: failed.length,
    api_calls: apiCalls,
    batch_size: batchSize,
    delay_ms: delayMs,
    examples_updated: (dryRun ? dryRuns : updated).slice(0, 5).map((r) => ({
      partido_id: r.partido_id,
      label: r.label,
      fixture_id: r.fixture_id,
      statistics: r.statistics,
    })),
    examples_failed: failed,
    results,
  };

  console.log("\n--- resumen ---");
  console.log(`Actualizados: ${summary.updated || summary.dry_run_would_update}`);
  console.log(`Fallidos: ${summary.failed}`);
  console.log(`API calls: ${summary.api_calls}`);

  writeReport(summary);
}

async function runSingle() {
  let query = supabase
    .from("partidos")
    .select(
      "id, api_football_fixture_id, estatus, equipo_local_nombre, equipo_visitante_nombre, metadata, fecha_kickoff",
    );

  if (partidoId) {
    query = query.eq("id", partidoId);
  } else {
    query = query.eq("api_football_fixture_id", fixtureIdArg);
  }

  const { data: partido, error } = await query.maybeSingle();
  if (error) {
    console.error("Supabase:", error.message);
    process.exit(1);
  }
  if (!partido) {
    console.error("Partido no encontrado");
    process.exit(1);
  }

  const result = await processPartido(partido, { dryRun, log: true });
  if (result.status === "failed") {
    console.error(result.reason);
    process.exit(1);
  }
  if (result.statistics) {
    console.log("\n--- statistics ---");
    console.log(JSON.stringify(result.statistics, null, 2));
  }
  if (dryRun) console.log("\n[dry-run] No se escribió en DB");
  else if (result.status === "updated") {
    console.log(`\n✓ Persistido en partido ${partido.id}`);
  }
}

async function main() {
  if (allFinalizados) {
    await runBatch();
  } else {
    await runSingle();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
