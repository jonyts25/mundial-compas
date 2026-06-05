/**
 * Spike api-sports.io (plan free) — busca México vs Serbia y partidos en vivo.
 * Uso: node scripts/discover-api-sports.mjs
 *
 * Requiere API_SPORTS_KEY en .env.local (dashboard api-football.com → My Access)
 */
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const apiKey = process.env.API_SPORTS_KEY;
const tz = process.env.APIFOOTBALL_TIMEZONE || "America/Mexico_City";
const pilotDate = process.env.API_SPORTS_PILOT_DATE || "2026-06-04";
const mexicoTeamId = process.env.API_SPORTS_PILOT_TEAM_ID || "16";
const base = "https://v3.football.api-sports.io";

if (!apiKey) {
  console.error("Falta API_SPORTS_KEY en .env.local");
  console.error("Obtén la key en https://dashboard.api-football.com/ (misma cuenta, plan free)");
  process.exit(1);
}

async function api(path, params = {}) {
  const url = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey, Accept: "application/json" },
  });
  const body = await res.json();
  return { status: res.status, body };
}

function printFixtures(label, response) {
  const items = response?.response ?? [];
  console.log(`\n${label}: ${items.length} fixture(s)`);
  for (const f of items) {
    const mx = /mexico|méxico|serbia/i.test(
      `${f.teams?.home?.name} ${f.teams?.away?.name}`,
    );
    const mark = mx ? " ★" : "";
    console.log(
      `  ${mark}[${f.fixture?.id}] ${f.league?.name}: ${f.teams?.home?.name} vs ${f.teams?.away?.name}`,
    );
    console.log(
      `      ${f.fixture?.date} — ${f.fixture?.status?.short} ${f.goals?.home ?? "-"}-${f.goals?.away ?? "-"} (${f.fixture?.status?.elapsed ?? "-"}')`,
    );
  }
  if (response?.errors && Object.keys(response.errors).length) {
    console.log("  errors:", response.errors);
  }
  return items;
}

console.log(`api-sports.io — discover (${tz})\n`);

const status = await api("/status");
console.log("Cuenta:", status.body?.response ?? status.body);

const live = await api("/fixtures", { live: "all", timezone: tz });
printFixtures("En vivo ahora (live=all)", live.body);

const byDate = await api("/fixtures", {
  date: pilotDate,
  team: mexicoTeamId,
  timezone: tz,
});
const mxItems = printFixtures(
  `México (team=${mexicoTeamId}) el ${pilotDate}`,
  byDate.body,
);

const liveItems = live.body?.response ?? [];
const serbiaMatch =
  mxItems.find((f) =>
    /serbia/i.test(`${f.teams?.home?.name} ${f.teams?.away?.name}`),
  ) ??
  liveItems.find((f) =>
    /serbia/i.test(`${f.teams?.home?.name} ${f.teams?.away?.name}`),
  );
if (serbiaMatch) {
  console.log("\n✅ México vs Serbia encontrado:");
  console.log(`   fixture id: ${serbiaMatch.fixture.id}`);
  console.log(
    `   Cargar: POST /api/admin/cargar-partidos?modo=pilot&fixture=${serbiaMatch.fixture.id}`,
  );
  console.log(
    `   Env: API_SPORTS_PILOT_FIXTURE_ID=${serbiaMatch.fixture.id}`,
  );
} else {
  console.log("\n⚠️  No se encontró México vs Serbia en esa fecha/equipo.");
  console.log("   Prueba otra fecha o busca en dashboard api-football.");
}

const wc = await api("/fixtures", { league: 1, season: 2026, timezone: tz });
printFixtures("Mundial 2026 (league=1, season=2026) — muestra", {
  ...wc.body,
  response: (wc.body?.response ?? []).slice(0, 5),
});

console.log("\n--- Variables sugeridas (.env.local / Railway) ---");
console.log("FOOTBALL_DATA_PROVIDER=api-sports");
console.log("API_SPORTS_KEY=<tu key>");
if (serbiaMatch) {
  console.log(`API_SPORTS_PILOT_FIXTURE_ID=${serbiaMatch.fixture.id}`);
}
console.log(`API_SPORTS_PILOT_DATE=${pilotDate}`);
console.log(`API_SPORTS_PILOT_TEAM_ID=${mexicoTeamId}`);
console.log("PILOT_MODE_ENABLED=true");
console.log("APIFOOTBALL_PILOT_LABEL=Mexico_vs_Serbia_live");
