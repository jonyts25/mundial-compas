/**
 * Carga partidos pilot (Champions) directo a Supabase.
 * Uso: node scripts/cargar-pilot-local.mjs
 * Requiere .env.local con API_FOOTBALL_KEY, SUPABASE_*, etc.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

function loadEnv() {
  loadEnvLocal();
  if (process.env.API_FOOTBALL_KEY) return;
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

function readArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : undefined;
}

const apiKey = process.env.API_FOOTBALL_KEY;
const todayMx = new Date().toLocaleDateString("en-CA", {
  timeZone: process.env.APIFOOTBALL_TIMEZONE || "America/Mexico_City",
});
const from = readArg("from") || process.env.APIFOOTBALL_PILOT_FROM || todayMx;
const to = readArg("to") || process.env.APIFOOTBALL_PILOT_TO || todayMx;
const leagueId =
  readArg("league") || process.env.APIFOOTBALL_PILOT_LEAGUE_ID || "3";
const label =
  readArg("label") ||
  process.env.APIFOOTBALL_PILOT_LABEL ||
  "UEFA Champions League — prueba";
const timezone = process.env.APIFOOTBALL_TIMEZONE || "America/Mexico_City";

const base = "https://apiv3.apifootball.com/";

async function apifootball(action, params) {
  const q = new URLSearchParams({ action, APIkey: apiKey, ...params });
  const res = await fetch(`${base}?${q}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`API respondió HTML/no-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
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

function mapStatus(s, matchLive) {
  const raw = String(s || "").trim();
  const k = raw.toLowerCase();
  if (matchLive === "1") return "en_vivo";
  if (/^\d+$/.test(raw)) return "en_vivo";
  if (k.includes("1st") || k.includes("2nd") || k.includes("extra")) return "en_vivo";
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
    "after pen.": "finalizado",
  };
  return m[k] ?? "programado";
}

function parseMinute(ev) {
  const st = String(ev.match_status || "").trim();
  if (/^\d+$/.test(st)) return parseInt(st, 10);
  const gs = ev.goalscorer;
  if (Array.isArray(gs) && gs.length) {
    const m = parseInt(String(gs[gs.length - 1]?.time ?? ""), 10);
    if (!Number.isNaN(m)) return m;
  }
  return null;
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

function parseFase(ev) {
  const stage = (ev.stage_name ?? "").toLowerCase();
  const round = (ev.match_round ?? "").toLowerCase();
  if (round.includes("16") || stage.includes("round of 16")) return "dieciseisavos";
  if (round.includes("8") || stage.includes("quarter")) return "cuartos";
  if (stage.includes("semi")) return "semifinal";
  if (stage.includes("3rd") || stage.includes("third")) return "tercer_lugar";
  if (stage.includes("final") && !stage.includes("semi")) return "final";
  if (round === "final" || round.endsWith(" - final")) return "final";
  return "grupos";
}

function mapRow(ev) {
  const estatus = mapStatus(ev.match_status, ev.match_live);
  const local = parseInt(ev.match_hometeam_score, 10);
  const away = parseInt(ev.match_awayteam_score, 10);
  const hasScore =
    estatus !== "programado" && !Number.isNaN(local) && !Number.isNaN(away);

  return {
    api_football_fixture_id: parseInt(ev.match_id, 10),
    fase: parseFase(ev),
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
    minuto_actual: parseMinute(ev),
    metadata: {
      competencia: "pilot",
      pilot: true,
      competencia_label: label,
      ...(ev.team_home_badge ? { escudo_local: ev.team_home_badge } : {}),
      ...(ev.team_away_badge ? { escudo_visitante: ev.team_away_badge } : {}),
      apifootball: {
        match_id: ev.match_id,
        league_id: ev.league_id,
        league_name: ev.league_name,
        stage_name: ev.stage_name,
        match_round: ev.match_round,
        match_status: ev.match_status,
        timezone,
        ...(ev.team_home_badge ? { team_home_badge: ev.team_home_badge } : {}),
        ...(ev.team_away_badge ? { team_away_badge: ev.team_away_badge } : {}),
      },
    },
  };
}

async function main() {
  if (!apiKey) {
    console.error("ERROR: Falta API_FOOTBALL_KEY en .env.local");
    console.error("Sincroniza desde Railway: powershell -File scripts/sync-env-from-railway.ps1");
    process.exit(1);
  }

  console.log(
    `Buscando liga pilot league_id=${leagueId} from=${from} to=${to}…`,
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
  rows.forEach((r) => {
    console.log(
      `   → ${r.equipo_local_nombre} ${r.marcador_local ?? "-"}-${r.marcador_visitante ?? "-"} ${r.equipo_visitante_nombre} | ${r.estatus}${r.minuto_actual != null ? ` (${r.minuto_actual}')` : ""}`,
    );
  });
  console.log("Activa PILOT_MODE_ENABLED=true en Railway para ver el banner.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
