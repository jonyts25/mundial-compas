/**
 * Recarga partidos del Mundial con buildKickoffIsoFromApi (hora CDMX).
 * node scripts/recargar-mundial.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SEASON_ID = "b0000000-0000-4000-8000-000000000002";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

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
  const dateMatch = matchDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return new Date(matchDate).toISOString();
  const [, y, mo, d] = dateMatch;
  const timeRaw = matchTime?.trim() || "12:00";
  const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  const hour = timeMatch ? Number(timeMatch[1]) : 12;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const second = timeMatch?.[3] ? Number(timeMatch[3]) : 0;
  return new Date(
    zonedWallTimeToUtcMs(
      {
        year: Number(y),
        month: Number(mo),
        day: Number(d),
        hour,
        minute,
        second,
      },
      timeZone,
    ),
  ).toISOString();
}

function formatMexicoTime(iso) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

// --- map event (simplified from map-event-to-partido.ts) ---
function mapRow(ev, timezone) {
  const estatusMap = {
    "not started": "programado",
    ns: "programado",
    live: "en_vivo",
    finished: "finalizado",
    ft: "finalizado",
  };
  const estatus =
    estatusMap[String(ev.match_status || "").toLowerCase()] ?? "programado";

  return {
    api_football_fixture_id: parseInt(ev.match_id, 10),
    fase: "grupos",
    grupo: null,
    jornada: null,
    equipo_local_codigo: (ev.match_hometeam_name || "LOC").slice(0, 3).toUpperCase(),
    equipo_visitante_codigo: (ev.match_awayteam_name || "VIS").slice(0, 3).toUpperCase(),
    equipo_local_nombre: ev.match_hometeam_name,
    equipo_visitante_nombre: ev.match_awayteam_name,
    sede: ev.match_stadium || null,
    fecha_kickoff: buildKickoffIsoFromApi(
      ev.match_date,
      ev.match_time,
      timezone,
    ),
    estatus,
    marcador_local: null,
    marcador_visitante: null,
    canal_transmision: "sin_asignar",
    minuto_actual: null,
    metadata: {
      apifootball: {
        match_id: ev.match_id,
        league_id: ev.league_id,
        league_name: ev.league_name,
        match_status: ev.match_status,
        timezone,
      },
    },
    season_id: DEFAULT_SEASON_ID,
  };
}

async function main() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const leagueId = process.env.APIFOOTBALL_LEAGUE_ID || "28";
  const from = process.env.APIFOOTBALL_WORLD_CUP_FROM || "2026-06-01";
  const to = process.env.APIFOOTBALL_WORLD_CUP_TO || "2026-07-31";
  const timezone = process.env.APIFOOTBALL_TIMEZONE || MEXICO_TZ;

  const q = new URLSearchParams({
    action: "get_events",
    APIkey: apiKey,
    from,
    to,
    league_id: leagueId,
    timezone,
  });

  console.log(`get_events Mundial league=${leagueId} ${from} → ${to} tz=${timezone}`);

  const events = await fetch(`https://apiv3.apifootball.com/?${q}`).then((r) =>
    r.json(),
  );

  if (!Array.isArray(events)) {
    console.error(events);
    process.exit(1);
  }

  const valid = events.filter((e) => e.match_id && e.match_hometeam_name);
  console.log(`Partidos: ${valid.length}`);

  const sample = valid.find(
    (e) =>
      e.match_hometeam_name?.includes("Mexico") &&
      e.match_date === "2026-06-11",
  );
  if (sample) {
    const iso = buildKickoffIsoFromApi(
      sample.match_date,
      sample.match_time,
      timezone,
    );
    console.log(
      `Ejemplo API ${sample.match_time} → guardado ${iso} → UI ${formatMexicoTime(iso)}`,
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const rows = valid.map((e) => mapRow(e, timezone));
  const BATCH = 50;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("partidos").upsert(batch, {
      onConflict: "api_football_fixture_id",
    });
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    upserted += batch.length;
  }

  console.log(`\n✅ ${upserted} partidos del Mundial actualizados (horarios CDMX).`);
  console.log("Partidos pilot (Champions) no se tocan — otros fixture_id.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
