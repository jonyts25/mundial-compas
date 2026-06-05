/**
 * Carga México vs Serbia como partido pilot en Supabase.
 * Uso: node scripts/cargar-pilot-mexico-serbia.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

/** FOX Sports id del amistoso; apifootball puede usar otro match_id. */
export const MEXICO_SERBIA_FOX_FIXTURE_ID = 761641;
export const MEXICO_SERBIA_FIXTURE_ID = 776604;
const MEXICO_TZ = "America/Mexico_City";

function todayMx() {
  return new Date().toLocaleDateString("en-CA", { timeZone: MEXICO_TZ });
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
    const zoned = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(utcGuess))
      .reduce((acc, p) => {
        if (p.type !== "literal") acc[p.type] = Number(p.value);
        return acc;
      }, {});
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

function buildKickoffIso(dateStr, hour = 20, minute = 0) {
  const [, y, mo, d] = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return new Date(
    zonedWallTimeToUtcMs({
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour,
      minute,
      second: 0,
    }),
  ).toISOString();
}

function goalRow(time, homeScorer, awayScorer, score) {
  return {
    time: String(time),
    home_scorer: homeScorer ?? "",
    away_scorer: awayScorer ?? "",
    score,
    score_info_time: "",
    info: "",
  };
}

export function buildMexicoSerbiaRow(options = {}) {
  const date = options.date || process.env.APIFOOTBALL_PILOT_FROM || todayMx();
  const hour = Number(options.hour ?? process.env.MEXICO_SERBIA_KICKOFF_HOUR ?? 20);
  const minute = Number(options.minute ?? process.env.MEXICO_SERBIA_KICKOFF_MINUTE ?? 0);
  const label =
    process.env.APIFOOTBALL_PILOT_LABEL ||
    "Mexico vs Serbia - partido de prueba";

  return {
    api_football_fixture_id: MEXICO_SERBIA_FIXTURE_ID,
    fase: "grupos",
    grupo: "A",
    jornada: 1,
    equipo_local_codigo: "MEX",
    equipo_visitante_codigo: "SRB",
    equipo_local_nombre: "Mexico",
    equipo_visitante_nombre: "Serbia",
    sede: "Estadio Akron",
    fecha_kickoff: buildKickoffIso(date, hour, minute),
    estatus: "programado",
    marcador_local: null,
    marcador_visitante: null,
    minuto_actual: null,
    metadata: {
      competencia: "pilot",
      pilot: true,
      competencia_label: label,
      escudo_local: "https://flagcdn.com/w80/mx.png",
      escudo_visitante: "https://flagcdn.com/w80/rs.png",
      apifootball: {
        match_id: String(MEXICO_SERBIA_FIXTURE_ID),
        league_id: "776",
        league_name: "International Friendly",
        stage_name: "Group Stage",
        match_round: "Group A - 1",
        match_status: "Not Started",
        timezone: MEXICO_TZ,
        team_home_badge: "https://flagcdn.com/w80/mx.png",
        team_away_badge: "https://flagcdn.com/w80/rs.png",
      },
    },
  };
}

async function upsertDirect() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const row = buildMexicoSerbiaRow();
  const supabase = createClient(url, key);
  const { error } = await supabase.from("partidos").upsert(row, {
    onConflict: "api_football_fixture_id",
  });

  if (error) {
    console.error("Error Supabase:", error.message);
    process.exit(1);
  }

  console.log("✅ México vs Serbia cargado (pilot)");
  console.log(`   fixture_id=${MEXICO_SERBIA_FIXTURE_ID}`);
  console.log(`   kickoff=${row.fecha_kickoff} (20:00 CDMX por defecto)`);
  console.log(`   ${row.equipo_local_nombre} vs ${row.equipo_visitante_nombre}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Solo carga desde API real. Sin --force-seed no inventa partidos. */
async function main() {
  const today = todayMx();
  const from = process.env.APIFOOTBALL_PILOT_FROM || today;
  const to = process.env.APIFOOTBALL_PILOT_TO || today;
  const league = process.env.APIFOOTBALL_PILOT_LEAGUE_ID?.trim();
  const label =
    process.env.APIFOOTBALL_PILOT_LABEL || "Mexico vs Serbia - live";

  const attempts = [];
  if (league) {
    attempts.push(["scripts/cargar-pilot-local.mjs", `--league=${league}`, `--from=${from}`, `--to=${to}`, `--label=${label}`]);
  }
  attempts.push(["scripts/cargar-pilot-local.mjs", `--from=${from}`, `--to=${to}`, `--label=${label}`]);

  for (const args of attempts) {
    console.log(`Intentando API ${args.slice(1).join(" ")}…`);
    const apiTry = spawnSync("node", args, {
      cwd: root,
      env: process.env,
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    if (apiTry.status === 0) {
      console.log(apiTry.stdout?.toString() || "");
      return;
    }
    if (apiTry.stderr?.length) console.error(apiTry.stderr.toString().slice(0, 400));
  }

  console.error("\n✗ La API no devolvió México vs Serbia.");
  console.error("  Corre: npm run discover-api-plan");
  console.error("  Renueva/ampliá tu plan en apifootball.com (amistosos internacionales).");

  if (process.argv.includes("--force-seed")) {
    console.warn("\n--force-seed: insertando partido manual (NO en vivo real)…");
    await upsertDirect();
    return;
  }

  process.exit(2);
}

const isMain = process.argv[1]?.includes("cargar-pilot-mexico-serbia");
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
