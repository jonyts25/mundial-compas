/**
 * Muestra qué ligas y partidos devuelve tu plan de apifootball.com hoy.
 * Uso: node scripts/discover-api-plan.mjs
 */
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const apiKey = process.env.API_FOOTBALL_KEY;
const tz = process.env.APIFOOTBALL_TIMEZONE || "America/Mexico_City";
const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
const apibase = "https://apiv3.apifootball.com/";

if (!apiKey) {
  console.error("Falta API_FOOTBALL_KEY");
  process.exit(1);
}

async function api(action, params) {
  const q = new URLSearchParams({ action, APIkey: apiKey, ...params });
  const res = await fetch(`${apibase}?${q}`);
  return res.json();
}

console.log(`Plan apifootball — ${today} (${tz})\n`);

const leagues = await api("get_leagues");
if (!Array.isArray(leagues)) {
  console.log("get_leagues:", leagues);
  process.exit(1);
}

console.log(`Ligas en tu plan: ${leagues.length}`);
for (const l of leagues) {
  console.log(`  · [${l.league_id}] ${l.league_name} (${l.country_name})`);
}

const all = await api("get_events", { from: today, to: today, timezone: tz });
if (!Array.isArray(all)) {
  console.log(`\nPartidos hoy: ${all.message ?? all.error ?? "ninguno"}`);
} else {
  console.log(`\nPartidos hoy: ${all.length}`);
  for (const e of all) {
    const mx = /mexico|serbia/i.test(
      (e.match_hometeam_name || "") + (e.match_awayteam_name || ""),
    );
    const mark = mx ? " ★" : "";
    console.log(
      `  ${mark}[${e.match_id}] ${e.league_name}: ${e.match_hometeam_name} vs ${e.match_awayteam_name} — ${e.match_status} (${e.match_hometeam_score}-${e.match_awayteam_score}) live=${e.match_live}`,
    );
  }
}

const mxsr = await api("get_events", { match_id: "761641", timezone: tz });
console.log(
  "\nMéxico vs Serbia (FOX fixture 761641):",
  Array.isArray(mxsr) && mxsr[0]
    ? `${mxsr[0].match_hometeam_name} vs ${mxsr[0].match_awayteam_name} ${mxsr[0].match_status}`
    : mxsr.message ?? "no en plan",
);

if (leagues.length < 5) {
  console.log(
    "\n⚠️  Tu plan parece limitado. México vs Serbia (amistoso) requiere ligas internacionales en apifootball.com.",
  );
  console.log("   Renueva o amplía el plan, luego define APIFOOTBALL_PILOT_LEAGUE_ID con la liga correcta.");
}
