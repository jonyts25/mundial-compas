/**
 * SPORTS-DATA-ENRICHMENT-SPIKE-1 — Explora endpoints api-sports por partido.
 * Solo lectura: NO upserts, NO writes a DB.
 *
 * Uso:
 *   node scripts/inspect-api-football-match-data.mjs
 *   node scripts/inspect-api-football-match-data.mjs --fixture-id=1528284
 *
 * Requiere .env.local: API_SPORTS_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const BASE = "https://v3.football.api-sports.io";
const apiKey = process.env.API_SPORTS_KEY;
const tz = process.env.APIFOOTBALL_TIMEZONE || "America/Mexico_City";
const leagueId = Number(process.env.API_SPORTS_LEAGUE_ID ?? "1");
const season = Number(process.env.API_SPORTS_SEASON ?? "2026");

const fixtureArg = process.argv.find((a) => a.startsWith("--fixture-id="));
const singleFixtureId = fixtureArg ? Number(fixtureArg.split("=")[1]) : null;

let apiCalls = 0;

if (!apiKey) {
  console.error("Falta API_SPORTS_KEY en .env.local");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function api(path, params = {}) {
  apiCalls += 1;
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey, Accept: "application/json" },
    });
    const body = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      results: body?.results ?? 0,
      errors: body?.errors ?? null,
      response: body?.response ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      results: 0,
      errors: { fetch: e instanceof Error ? e.message : String(e) },
      response: null,
    };
  }
}

function hasErrors(errors) {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "object") return Object.keys(errors).length > 0;
  return Boolean(errors);
}

function summarizeFixtureDetail(res) {
  const item = res.response?.[0];
  if (!item) return { empty: true, note: "sin fixture" };
  return {
    empty: false,
    fixture_id: item.fixture?.id,
    status: item.fixture?.status?.short,
    venue: item.fixture?.venue?.name ?? null,
    city: item.fixture?.venue?.city ?? null,
    round: item.league?.round ?? null,
    referee: item.fixture?.referee ?? null,
    home: item.teams?.home?.name,
    away: item.teams?.away?.name,
    home_id: item.teams?.home?.id,
    away_id: item.teams?.away?.id,
    score: `${item.goals?.home ?? "-"}-${item.goals?.away ?? "-"}`,
    league: item.league?.name,
    season: item.league?.season,
  };
}

function summarizeEvents(res) {
  const events = res.response ?? [];
  if (!events.length) return { empty: true, count: 0 };
  const types = {};
  for (const e of events) {
    const k = `${e.type}${e.detail ? `:${e.detail}` : ""}`;
    types[k] = (types[k] ?? 0) + 1;
  }
  return {
    empty: false,
    count: events.length,
    types,
    sample: events.slice(0, 3).map((e) => ({
      min: e.time?.elapsed,
      type: e.type,
      detail: e.detail,
      player: e.player?.name ?? null,
      team: e.team?.name,
    })),
  };
}

function summarizeLineups(res) {
  const teams = res.response ?? [];
  if (!teams.length) return { empty: true, teams: 0 };
  return {
    empty: false,
    teams: teams.length,
    formations: teams.map((t) => ({
      team: t.team?.name,
      formation: t.formation ?? null,
      xi: t.startXI?.length ?? 0,
      subs: t.substitutes?.length ?? 0,
      coach: t.coach?.name ?? null,
    })),
  };
}

function summarizeStatistics(res) {
  const teams = res.response ?? [];
  if (!teams.length) return { empty: true };
  const pick = (stats, type) =>
    stats?.find((s) => s.type === type)?.value ?? null;
  return {
    empty: false,
    teams: teams.map((t) => ({
      team: t.team?.name,
      possession: pick(t.statistics, "Ball Possession"),
      shots_on: pick(t.statistics, "Shots on Goal"),
      shots_total: pick(t.statistics, "Total Shots"),
      corners: pick(t.statistics, "Corner Kicks"),
      fouls: pick(t.statistics, "Fouls"),
      stat_types: (t.statistics ?? []).map((s) => s.type),
    })),
  };
}

function summarizeStandings(res) {
  const blocks = res.response?.[0]?.league?.standings ?? [];
  if (!blocks.length) return { empty: true, groups: 0, rows: 0 };
  let rows = 0;
  const groups = [];
  for (const block of blocks) {
    groups.push(block[0]?.group ?? "?");
    rows += block.length;
  }
  return { empty: false, groups: groups.length, group_names: groups, rows };
}

function summarizePlayers(res) {
  const teams = res.response ?? [];
  if (!teams.length) return { empty: true };
  let playerRows = 0;
  for (const t of teams) {
    playerRows += t.players?.length ?? 0;
  }
  const sampleTeam = teams[0];
  const samplePlayer = sampleTeam?.players?.[0];
  const statKeys = samplePlayer?.statistics?.[0]?.games
    ? Object.keys(samplePlayer.statistics[0].games)
    : samplePlayer?.statistics?.[0]
      ? Object.keys(samplePlayer.statistics[0])
      : [];
  return {
    empty: false,
    teams: teams.length,
    player_rows: playerRows,
    sample_stat_keys: statKeys.slice(0, 8),
  };
}

function summarizeInjuries(res) {
  const rows = res.response ?? [];
  if (!rows.length) return { empty: true, count: 0 };
  return {
    empty: false,
    count: rows.length,
    sample: rows.slice(0, 5).map((r) => ({
      team: r.team?.name,
      player: r.player?.name,
      reason: r.player?.reason ?? r.type ?? null,
    })),
  };
}

function summarizeH2H(res) {
  const fixtures = res.response ?? [];
  if (!fixtures.length) return { empty: true, count: 0 };
  return {
    empty: false,
    count: fixtures.length,
    sample: fixtures.slice(0, 3).map((f) => ({
      date: f.fixture?.date,
      home: f.teams?.home?.name,
      away: f.teams?.away?.name,
      score: `${f.goals?.home ?? "-"}-${f.goals?.away ?? "-"}`,
    })),
  };
}

function summarizeOdds(res) {
  const bookmakers = res.response?.[0]?.bookmakers ?? [];
  if (!bookmakers.length) return { empty: true, bookmakers: 0 };
  const first = bookmakers[0];
  return {
    empty: false,
    bookmakers: bookmakers.length,
    sample_bookmaker: first?.name ?? null,
    markets: (first?.bets ?? []).map((b) => b.name).slice(0, 5),
    note: "solo investigación interna — no producto",
  };
}

function summarizeTeamStats(res, teamName) {
  const block = Array.isArray(res.response) ? res.response[0] : res.response;
  if (!block || typeof block !== "object") return { empty: true, team: teamName };
  const played = block.fixtures?.played?.total ?? null;
  const gf = block.goals?.for?.total?.total ?? null;
  const ga = block.goals?.against?.total?.total ?? null;
  if (played == null && gf == null && ga == null) {
    return { empty: true, team: teamName };
  }
  return {
    empty: false,
    team: teamName,
    form: block.form ?? null,
    fixtures_played: played,
    wins: block.fixtures?.wins?.total ?? null,
    draws: block.fixtures?.draws?.total ?? null,
    losses: block.fixtures?.loses?.total ?? null,
    goals_for: gf,
    goals_against: ga,
    gf_avg: block.goals?.for?.average?.total ?? null,
    ga_avg: block.goals?.against?.average?.total ?? null,
  };
}

async function probeEndpoint(name, path, params, summarize) {
  const res = await api(path, params);
  const failed = !res.ok || hasErrors(res.errors);
  const summary = summarize(res);
  return {
    name,
    path,
    params,
    http: res.status,
    results: res.results,
    failed,
    errors: failed ? res.errors : null,
    summary,
  };
}

async function inspectMatch(partido, label) {
  const fixtureId = partido.api_football_fixture_id;
  console.log(`\n${"=".repeat(72)}`);
  console.log(`PARTIDO [${label}]`);
  console.log(
    `  DB id=${partido.id} fixture_id=${fixtureId} estatus=${partido.estatus}`,
  );
  console.log(
    `  ${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`,
  );
  console.log(`  kickoff=${partido.fecha_kickoff} fase=${partido.fase} grupo=${partido.grupo ?? "—"}`);
  console.log(`${"=".repeat(72)}`);

  const callsBefore = apiCalls;
  const endpoints = [];

  const fixtureRes = await probeEndpoint(
    "fixture_detail",
    "/fixtures",
    { id: fixtureId, timezone: tz },
    summarizeFixtureDetail,
  );
  endpoints.push(fixtureRes);

  const detail = fixtureRes.summary;
  const homeId = detail.home_id;
  const awayId = detail.away_id;

  endpoints.push(
    await probeEndpoint(
      "events",
      "/fixtures/events",
      { fixture: fixtureId },
      summarizeEvents,
    ),
  );
  endpoints.push(
    await probeEndpoint(
      "lineups",
      "/fixtures/lineups",
      { fixture: fixtureId },
      summarizeLineups,
    ),
  );
  endpoints.push(
    await probeEndpoint(
      "statistics",
      "/fixtures/statistics",
      { fixture: fixtureId },
      summarizeStatistics,
    ),
  );
  endpoints.push(
    await probeEndpoint(
      "players",
      "/fixtures/players",
      { fixture: fixtureId },
      summarizePlayers,
    ),
  );
  endpoints.push(
    await probeEndpoint(
      "injuries_by_fixture",
      "/injuries",
      { fixture: fixtureId },
      summarizeInjuries,
    ),
  );

  if (homeId && awayId) {
    endpoints.push(
      await probeEndpoint(
        "head_to_head",
        "/fixtures/headtohead",
        { h2h: `${homeId}-${awayId}`, last: 10 },
        summarizeH2H,
      ),
    );
    endpoints.push(
      await probeEndpoint(
        "injuries_by_team_home",
        "/injuries",
        { team: homeId, season },
        summarizeInjuries,
      ),
    );
    endpoints.push(
      await probeEndpoint(
        "injuries_by_team_away",
        "/injuries",
        { team: awayId, season },
        summarizeInjuries,
      ),
    );
    endpoints.push(
      await probeEndpoint(
        "team_statistics_home",
        "/teams/statistics",
        { team: homeId, league: leagueId, season },
        (r) => summarizeTeamStats(r, detail.home),
      ),
    );
    endpoints.push(
      await probeEndpoint(
        "team_statistics_away",
        "/teams/statistics",
        { team: awayId, league: leagueId, season },
        (r) => summarizeTeamStats(r, detail.away),
      ),
    );
  }

  endpoints.push(
    await probeEndpoint(
      "standings",
      "/standings",
      { league: leagueId, season },
      summarizeStandings,
    ),
  );
  endpoints.push(
    await probeEndpoint(
      "odds",
      "/odds",
      { fixture: fixtureId },
      summarizeOdds,
    ),
  );

  for (const ep of endpoints) {
    const status = ep.failed
      ? "FAIL"
      : ep.summary?.empty
        ? "EMPTY"
        : "OK";
    console.log(`\n  [${status}] ${ep.name} (${ep.path})`);
    console.log(`       HTTP ${ep.http} results=${ep.results}`);
    if (ep.errors) console.log(`       errors: ${JSON.stringify(ep.errors)}`);
    console.log(`       summary: ${JSON.stringify(ep.summary, null, 0).slice(0, 500)}`);
  }

  const used = apiCalls - callsBefore;
  console.log(`\n  → API calls este partido: ${used}`);

  return { label, partido, endpoints, apiCallsUsed: used };
}

async function pickSamplePartidos() {
  const select =
    "id, estatus, api_football_fixture_id, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, fase, grupo, jornada, updated_at";

  const { data: programado } = await supabase
    .from("partidos")
    .select(select)
    .eq("estatus", "programado")
    .not("api_football_fixture_id", "is", null)
    .order("fecha_kickoff", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: liveRecent } = await supabase
    .from("partidos")
    .select(select)
    .in("estatus", ["en_vivo", "medio_tiempo"])
    .not("api_football_fixture_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let liveOrRecent = liveRecent;
  if (!liveOrRecent) {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recentFt } = await supabase
      .from("partidos")
      .select(select)
      .eq("estatus", "finalizado")
      .not("api_football_fixture_id", "is", null)
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    liveOrRecent = recentFt;
  }

  const { data: finalizado } = await supabase
    .from("partidos")
    .select(select)
    .eq("estatus", "finalizado")
    .not("api_football_fixture_id", "is", null)
    .order("fecha_kickoff", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { programado, liveOrRecent, finalizado };
}

async function main() {
  console.log("SPORTS-DATA-ENRICHMENT-SPIKE-1");
  console.log(`Provider: api-sports | league=${leagueId} season=${season} tz=${tz}`);
  console.log("Modo: solo lectura — sin writes a DB\n");

  const statusRes = await api("/status");
  console.log(
    "Cuenta API:",
    JSON.stringify(statusRes.response ?? statusRes.errors).slice(0, 200),
  );

  let samples = [];

  if (singleFixtureId) {
    const { data } = await supabase
      .from("partidos")
      .select(
        "id, estatus, api_football_fixture_id, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, fase, grupo, jornada, updated_at",
      )
      .eq("api_football_fixture_id", singleFixtureId)
      .maybeSingle();

    const partido = data ?? {
      id: "(no en DB)",
      estatus: "unknown",
      api_football_fixture_id: singleFixtureId,
      equipo_local_nombre: "?",
      equipo_visitante_nombre: "?",
      fecha_kickoff: null,
      fase: null,
      grupo: null,
    };
    samples.push(await inspectMatch(partido, "manual"));
  } else {
    const { programado, liveOrRecent, finalizado } = await pickSamplePartidos();

    if (!programado && !liveOrRecent && !finalizado) {
      console.error("No hay partidos con api_football_fixture_id en DB.");
      process.exit(1);
    }

    console.log("\nMuestras desde DB:");
    if (programado)
      console.log(
        `  programado: ${programado.equipo_local_nombre} vs ${programado.equipo_visitante_nombre} (${programado.api_football_fixture_id})`,
      );
    if (liveOrRecent)
      console.log(
        `  live/reciente: ${liveOrRecent.equipo_local_nombre} vs ${liveOrRecent.equipo_visitante_nombre} (${liveOrRecent.api_football_fixture_id}) estatus=${liveOrRecent.estatus}`,
      );
    if (finalizado)
      console.log(
        `  finalizado: ${finalizado.equipo_local_nombre} vs ${finalizado.equipo_visitante_nombre} (${finalizado.api_football_fixture_id})`,
      );

    if (programado) samples.push(await inspectMatch(programado, "programado"));
    if (liveOrRecent)
      samples.push(await inspectMatch(liveOrRecent, "live_o_reciente"));
    if (finalizado) samples.push(await inspectMatch(finalizado, "finalizado"));
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log("RESUMEN GLOBAL");
  console.log(`${"=".repeat(72)}`);
  console.log(`Total API calls: ${apiCalls}`);
  console.log(`Partidos inspeccionados: ${samples.length}`);

  const endpointStats = {};
  for (const s of samples) {
    for (const ep of s.endpoints) {
      if (!endpointStats[ep.name]) {
        endpointStats[ep.name] = { ok: 0, empty: 0, fail: 0 };
      }
      if (ep.failed) endpointStats[ep.name].fail += 1;
      else if (ep.summary?.empty) endpointStats[ep.name].empty += 1;
      else endpointStats[ep.name].ok += 1;
    }
  }
  console.log("\nPor endpoint (OK / EMPTY / FAIL):");
  for (const [name, st] of Object.entries(endpointStats)) {
    console.log(`  ${name}: ${st.ok}/${st.empty}/${st.fail}`);
  }

  const avgPerMatch =
    samples.length > 0
      ? Math.round(
          samples.reduce((a, s) => a + s.apiCallsUsed, 0) / samples.length,
        )
      : 0;
  console.log(`\nPromedio calls/partido (este spike): ${avgPerMatch}`);
  console.log(
    "Estimado jornada 4 partidos (on-demand full spike):",
    avgPerMatch * 4,
  );
  console.log(
    "\nNota: standings se repite por partido — en prod cachear 1×/jornada.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
