/**
 * Backfill metadata.statistics para partidos finalizados (MATCH-STATS-FT-1).
 *
 * Uso:
 *   node scripts/backfill-match-statistics.mjs --partido-id=<uuid>
 *   node scripts/backfill-match-statistics.mjs --fixture-id=1539017
 *   node scripts/backfill-match-statistics.mjs --partido-id=<uuid> --dry-run
 *
 * Requiere .env.local: API_SPORTS_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const BASE = "https://v3.football.api-sports.io";
const apiKey = process.env.API_SPORTS_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const partidoArg = args.find((a) => a.startsWith("--partido-id="));
const fixtureArg = args.find((a) => a.startsWith("--fixture-id="));
const partidoId = partidoArg?.split("=")[1]?.trim() ?? null;
const fixtureIdArg = fixtureArg ? Number(fixtureArg.split("=")[1]) : null;

if (!apiKey || !supabaseUrl || !supabaseKey) {
  console.error(
    "Faltan API_SPORTS_KEY, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

if (!partidoId && !fixtureIdArg) {
  console.error("Indica --partido-id=<uuid> o --fixture-id=<número>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function fetchStatistics(fixtureId) {
  const url = new URL(`${BASE}/fixtures/statistics`);
  url.searchParams.set("fixture", String(fixtureId));
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey, Accept: "application/json" },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
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

async function main() {
  let query = supabase
    .from("partidos")
    .select(
      "id, api_football_fixture_id, estatus, equipo_local_nombre, equipo_visitante_nombre, metadata",
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

  const fixtureId = partido.api_football_fixture_id;
  if (!fixtureId) {
    console.error("Partido sin api_football_fixture_id");
    process.exit(1);
  }

  console.log(
    `${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre} | estatus=${partido.estatus} | fixture=${fixtureId}`,
  );

  if (hasPersistedStatistics(partido.metadata)) {
    console.log("✓ metadata.statistics ya existe — omitido");
    console.log(JSON.stringify(partido.metadata.statistics, null, 2));
    return;
  }

  if (partido.estatus !== "finalizado") {
    console.warn("⚠ Partido no está finalizado — se intentará fetch igualmente");
  }

  const homeTeamId = await fetchFixtureHomeTeamId(fixtureId);
  if (!homeTeamId) {
    console.error("No se pudo resolver home team id del fixture");
    process.exit(1);
  }

  const teams = await fetchStatistics(fixtureId);
  const fetchedAt = new Date().toISOString();
  const statistics = normalizeStatistics(teams, homeTeamId, fetchedAt);

  if (!statistics) {
    console.error("API no devolvió statistics normalizables");
    process.exit(1);
  }

  console.log("\n--- statistics ---");
  console.log(JSON.stringify(statistics, null, 2));

  if (dryRun) {
    console.log("\n[dry-run] No se escribió en DB");
    return;
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
    .eq("id", partido.id);

  if (updateError) {
    console.error("Update falló:", updateError.message);
    process.exit(1);
  }

  console.log(`\n✓ Persistido en partido ${partido.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
