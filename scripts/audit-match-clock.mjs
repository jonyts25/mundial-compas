#!/usr/bin/env node
/**
 * Audita el reloj en vivo: escenarios api-sports + partidos recientes en BD.
 *
 * Uso:
 *   npx tsx scripts/audit-match-clock.mjs
 *   npx tsx scripts/audit-match-clock.mjs --fixture-id=1567309
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const BASE = "https://v3.football.api-sports.io";
const apiKey = process.env.API_SPORTS_KEY;

const fixtureArg = process.argv.find((a) => a.startsWith("--fixture-id="));
const singleFixtureId = fixtureArg ? Number(fixtureArg.split("=")[1]) : null;

const {
  normalizeApiSportsElapsed,
  buildRelojFromApiSportsFixture,
} = await import("../src/lib/api-football/match-clock.ts");
const {
  formatMatchClockDisplay,
  parseRelojFromMetadata,
  computeDisplayMinute,
} = await import("../src/lib/partidos/match-clock.ts");

function mockFixture(short, elapsed, extra = null) {
  return {
    fixture: {
      id: 999,
      date: "2026-07-02T23:00:00+00:00",
      timestamp: 0,
      status: { short, long: short, elapsed, extra },
    },
    league: { season: 2026 },
    teams: {
      home: { id: 1, name: "Home" },
      away: { id: 2, name: "Away" },
    },
    goals: { home: 1, away: 1 },
  };
}

/** Escenarios documentados de api-sports (incl. bug Portugal 90+18). */
const SCENARIOS = [
  { label: "1T min 23", short: "1H", elapsed: 23, extra: null, expect: 23, display: "23'" },
  { label: "1T 45+3 (elapsed+extra)", short: "1H", elapsed: 45, extra: 3, expect: 48, display: "48'" },
  { label: "1T 45+3 (contador)", short: "1H", elapsed: 3, extra: null, prev: { period: "1H", anchorMinute: 42, anchoredAt: new Date().toISOString(), ticking: true }, expect: 48, display: "48'" },
  { label: "2T arranque", short: "2H", elapsed: 46, extra: null, expect: 46, display: "46'" },
  { label: "2T min 67", short: "2H", elapsed: 67, extra: null, expect: 67, display: "67'" },
  { label: "2T 90+18 (elapsed+extra)", short: "2H", elapsed: 90, extra: 18, expect: 108, display: "108'" },
  { label: "2T 90+18 (elapsed=46+extra)", short: "2H", elapsed: 46, extra: 18, expect: 108, display: "108'" },
  { label: "2T 90+18 (contador)", short: "2H", elapsed: 18, extra: null, expect: 108, display: "108'" },
  { label: "TE 1T 95", short: "ET", elapsed: 95, extra: null, expect: 95, display: "95' TE" },
  { label: "TE 1T 105+2", short: "ET", elapsed: 105, extra: 2, expect: 107, display: "107' TE" },
  { label: "TE 2T 115", short: "ET", elapsed: 115, extra: null, expect: 115, display: "115' TE" },
];

function runScenario(s) {
  const prevReloj = s.prev ?? null;
  const normalized = normalizeApiSportsElapsed(
    s.short,
    s.elapsed,
    s.extra,
    prevReloj,
  );

  let metadata;
  if (prevReloj) {
    metadata = { reloj: { ...prevReloj } };
  }

  const { reloj, minuto_actual } = buildRelojFromApiSportsFixture(
    mockFixture(s.short, s.elapsed, s.extra),
    metadata,
  );

  const parsed = parseRelojFromMetadata({ reloj });
  const minute =
    computeDisplayMinute(parsed) ?? minuto_actual ?? normalized;
  const display = formatMatchClockDisplay(
    "en_vivo",
    parsed,
    minuto_actual,
  );

  const ok =
    normalized === s.expect &&
    minute === s.expect &&
    display.text === s.display;

  return {
    label: s.label,
    ok,
    normalized,
    minute,
    display: display.text,
    expect: s.expect,
    expectDisplay: s.display,
  };
}

/** Simula syncs consecutivos (Portugal 90+18). */
function simulatePortugalSequence() {
  const steps = [
    { short: "2H", elapsed: 46, extra: null, min: 46 },
    { short: "2H", elapsed: 72, extra: null, min: 72 },
    { short: "2H", elapsed: 88, extra: null, min: 88 },
    { short: "2H", elapsed: 46, extra: 18, min: 108 },
    { short: "2H", elapsed: 46, extra: null, min: 108, minAtLeast: true },
  ];

  let metadata;
  const results = [];
  let now = new Date("2026-07-02T23:50:00.000Z");

  for (const step of steps) {
    const { reloj, minuto_actual } = buildRelojFromApiSportsFixture(
      mockFixture(step.short, step.elapsed, step.extra),
      metadata,
      now,
    );
    metadata = { reloj };
    const parsed = parseRelojFromMetadata(metadata);
    const minute = computeDisplayMinute(parsed, now.getTime()) ?? minuto_actual;
    results.push({
      step: `${step.short} elapsed=${step.elapsed} extra=${step.extra ?? "—"}`,
      minute,
      expect: step.min,
      ok: step.minAtLeast
        ? minute >= step.min && minute <= step.min + 3
        : minute === step.min,
    });
    now = new Date(now.getTime() + 60_000);
  }

  return results;
}

async function fetchFixture(id) {
  if (!apiKey) return null;
  const url = new URL(`${BASE}/fixtures`);
  url.searchParams.set("id", String(id));
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey, Accept: "application/json" },
  });
  const body = await res.json();
  return body?.response?.[0] ?? null;
}

async function auditRecentDbPartidos() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("partidos")
    .select(
      "equipo_local_nombre, equipo_visitante_nombre, api_football_fixture_id, estatus, minuto_actual, metadata",
    )
    .gte("fecha_kickoff", new Date(Date.now() - 48 * 3600_000).toISOString())
    .in("estatus", ["finalizado", "en_vivo", "medio_tiempo"])
    .order("fecha_kickoff", { ascending: false })
    .limit(8);

  const rows = [];
  for (const p of data ?? []) {
    const reloj = p.metadata?.reloj;
    const period = reloj?.period ?? "—";
    const fixtureId = p.api_football_fixture_id;
    let apiNote = "sin API key";
    if (apiKey && fixtureId && fixtureId < 9_000_000) {
      const fx = await fetchFixture(fixtureId);
      if (fx) {
        const st = fx.fixture.status;
        apiNote = `${st.short} elapsed=${st.elapsed ?? "—"} extra=${st.extra ?? "—"}`;
      }
    }
    rows.push({
      partido: `${p.equipo_local_nombre} vs ${p.equipo_visitante_nombre}`,
      estatus: p.estatus,
      minuto_bd: p.minuto_actual,
      periodo_reloj: period,
      api_final: apiNote,
    });
  }
  return rows;
}

console.log("=== Escenarios api-sports ===\n");
const scenarioResults = SCENARIOS.map(runScenario);
for (const r of scenarioResults) {
  console.log(
    r.ok ? "✓" : "✗",
    r.label,
    "→",
    r.minute,
    `(${r.display})`,
    r.ok ? "" : `[esperado ${r.expect} / ${r.expectDisplay}]`,
  );
}

console.log("\n=== Simulación Portugal 90+18 (syncs consecutivos) ===\n");
const seq = simulatePortugalSequence();
for (const r of seq) {
  console.log(r.ok ? "✓" : "✗", r.step, "→", r.minute, r.ok ? "" : `[esperado ${r.expect}]`);
}

console.log("\n=== Partidos recientes (BD vs API) ===\n");
const dbRows = await auditRecentDbPartidos();
for (const r of dbRows) {
  console.log(
    `- ${r.partido}: ${r.estatus}, min BD=${r.minuto_bd ?? "—"}, periodo=${r.periodo_reloj}, API=${r.api_final}`,
  );
}

if (singleFixtureId && apiKey) {
  console.log(`\n=== Fixture ${singleFixtureId} (API) ===\n`);
  const fx = await fetchFixture(singleFixtureId);
  if (fx) {
    const st = fx.fixture.status;
    console.log(JSON.stringify({ short: st.short, elapsed: st.elapsed, extra: st.extra }, null, 2));
    const { reloj, minuto_actual } = buildRelojFromApiSportsFixture(fx);
    console.log("Reloj calculado:", { reloj, minuto_actual });
  }
}

const failed =
  scenarioResults.filter((r) => !r.ok).length + seq.filter((r) => !r.ok).length;
console.log(`\n${failed === 0 ? "OK" : "FALLOS"}: ${failed} escenario(s) fallido(s)`);
process.exit(failed > 0 ? 1 : 0);
