/**
 * Carga partidos pilot (Champions) directo a Supabase.
 * Uso: node scripts/cargar-pilot-local.mjs
 * Requiere .env.local con API_FOOTBALL_KEY, SUPABASE_*, etc.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const apiKey = process.env.API_FOOTBALL_KEY;
const from = process.env.APIFOOTBALL_PILOT_FROM || "2026-05-23";
const to = process.env.APIFOOTBALL_PILOT_TO || "2026-05-24";
const leagueId = process.env.APIFOOTBALL_PILOT_LEAGUE_ID || "3";
const label =
  process.env.APIFOOTBALL_PILOT_LABEL || "UEFA Champions League — prueba";
const timezone = process.env.APIFOOTBALL_TIMEZONE || "America/Mexico_City";

const base = "https://apiv3.apifootball.com/";

async function apifootball(action, params) {
  const q = new URLSearchParams({ action, APIkey: apiKey, ...params });
  const res = await fetch(`${base}?${q}`);
  return res.json();
}

function teamCode(name, teamId) {
  const n = (name || "").trim();
  if (!n) return "UN";
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].slice(0, 1) + words[1].slice(0, 2)).toUpperCase();
  }
  return n.slice(0, 3).toUpperCase();
}

function mapStatus(s) {
  const k = String(s || "").toLowerCase();
  const m = {
    "not started": "programado",
    ns: "programado",
    live: "en_vivo",
    "1h": "en_vivo",
    "2h": "en_vivo",
    ht: "medio_tiempo",
    "half time": "medio_tiempo",
    finished: "finalizado",
    ft: "finalizado",
  };
  return m[k] ?? "programado";
}

const MEXICO_TZ = "America/Mexico_City";

function getPartsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function zonedWallTimeToUtcMs(parts, timeZone = MEXICO_TZ) {
  let utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  for (let i = 0; i < 4; i++) {
    const zoned = getPartsInTimeZone(new Date(utcGuess), timeZone);
    const desiredAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const actualAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    );
    utcGuess += desiredAsUtc - actualAsUtc;
  }
  return utcGuess;
}

function buildKickoffIsoFromApi(matchDate, matchTime, timeZone = MEXICO_TZ) {
  const [, y, mo, d] = matchDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = (matchTime?.trim() || "12:00").match(/^(\d{1,2}):(\d{2})/);
  const hour = timeMatch ? Number(timeMatch[1]) : 12;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  return new Date(
    zonedWallTimeToUtcMs(
      {
        year: Number(y),
        month: Number(mo),
        day: Number(d),
        hour,
        minute,
        second: 0,
      },
      timeZone,
    ),
  ).toISOString();
}

function mapRow(ev) {
  const estatus = mapStatus(ev.match_status);
  const local = parseInt(ev.match_hometeam_score, 10);
  const away = parseInt(ev.match_awayteam_score, 10);
  const hasScore =
    estatus !== "programado" && !Number.isNaN(local) && !Number.isNaN(away);

  return {
    api_football_fixture_id: parseInt(ev.match_id, 10),
    fase: "semifinal",
    grupo: null,
    jornada: null,
    equipo_local_codigo: teamCode(ev.match_hometeam_name, ev.match_hometeam_id),
    equipo_visitante_codigo: teamCode(
      ev.match_awayteam_name,
      ev.match_awayteam_id,
    ),
    equipo_local_nombre: ev.match_hometeam_name,
    equipo_visitante_nombre: ev.match_awayteam_name,
    sede: ev.match_stadium || null,
    fecha_kickoff: buildKickoffIsoFromApi(ev.match_date, ev.match_time, timezone),
    estatus,
    marcador_local: hasScore ? local : null,
    marcador_visitante: hasScore ? away : null,
    canal_transmision: "sin_asignar",
    minuto_actual: null,
    metadata: {
      competencia: "pilot",
      pilot: true,
      competencia_label: label,
      apifootball: {
        match_id: ev.match_id,
        league_id: ev.league_id,
        league_name: ev.league_name,
        match_round: ev.match_round,
        match_status: ev.match_status,
        timezone,
      },
    },
  };
}

async function main() {
  console.log(
    `Buscando UCL league_id=${leagueId} from=${from} to=${to}…`,
  );

  const events = await apifootball("get_events", {
    from,
    to,
    league_id: leagueId,
    timezone,
  });

  if (!Array.isArray(events)) {
    console.error("Respuesta inesperada:", JSON.stringify(events).slice(0, 500));
    process.exit(1);
  }

  const valid = events.filter((e) => e.match_id && e.match_hometeam_name);
  console.log(`Eventos API: ${events.length}, válidos: ${valid.length}`);

  if (valid.length === 0) {
    console.log("\nPrueba ampliando fechas, ej.:");
    console.log(
      "  $env:APIFOOTBALL_PILOT_FROM='2026-05-17'; $env:APIFOOTBALL_PILOT_TO='2026-05-31'",
    );
    process.exit(2);
  }

  valid.forEach((e) => {
    console.log(
      `  · ${e.match_date} ${e.match_time} — ${e.match_hometeam_name} vs ${e.match_awayteam_name} (${e.match_round || "?"})`,
    );
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const rows = valid.map(mapRow);
  const { error } = await supabase.from("partidos").upsert(rows, {
    onConflict: "api_football_fixture_id",
  });

  if (error) {
    console.error("Error Supabase:", error.message);
    process.exit(1);
  }

  console.log(`\n✅ ${rows.length} partido(s) cargados en Supabase (modo pilot).`);
  console.log("Activa PILOT_MODE_ENABLED=true en Railway para ver el banner.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
