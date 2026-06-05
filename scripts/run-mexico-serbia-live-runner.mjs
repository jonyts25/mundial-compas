/**
 * Espera el kickoff de México vs Serbia y lanza el replay automático.
 * Pensado para Railway (servicio livescore-relay) cuando la API no tiene el fixture.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";
import { buildMexicoSerbiaRow, MEXICO_SERBIA_FIXTURE_ID } from "./cargar-pilot-mexico-serbia.mjs";
import { runMexicoSerbiaReplay } from "./replay-mexico-serbia-live.mjs";
import { createClient } from "@supabase/supabase-js";

loadEnvLocal();

const MEXICO_TZ = "America/Mexico_City";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatMx(d = new Date()) {
  return d.toLocaleString("es-MX", { timeZone: MEXICO_TZ });
}

async function ensurePartido() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan credenciales Supabase");

  const sb = createClient(url, key);
  const { data } = await sb
    .from("partidos")
    .select("id, fecha_kickoff")
    .eq("api_football_fixture_id", MEXICO_SERBIA_FIXTURE_ID)
    .maybeSingle();

  if (data) {
    console.log(`Partido ya existe (${data.id}) kickoff=${data.fecha_kickoff}`);
    return data;
  }

  console.log("Partido no encontrado → cargando…");
  const cargar = spawnSync("node", ["scripts/cargar-pilot-mexico-serbia.mjs"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (cargar.status !== 0) throw new Error("cargar-pilot-mexico-serbia falló");

  const { data: created } = await sb
    .from("partidos")
    .select("id, fecha_kickoff")
    .eq("api_football_fixture_id", MEXICO_SERBIA_FIXTURE_ID)
    .maybeSingle();

  if (!created) throw new Error("No se pudo crear el partido");
  return created;
}

async function main() {
  const forceNow = process.argv.includes("--now");
  const delayMs = Number.parseInt(
    process.env.MEXICO_SERBIA_REPLAY_DELAY_MS ?? "25000",
    10,
  );

  console.log("=== Runner México vs Serbia ===");
  console.log(`Hora CDMX: ${formatMx()}`);
  console.log(`fixture_id=${MEXICO_SERBIA_FIXTURE_ID}`);

  const partido = await ensurePartido();
  const kickoffMs = new Date(partido.fecha_kickoff).getTime();
  const nowMs = Date.now();
  const startEarlyMs = 2 * 60 * 1000;
  let waitMs = kickoffMs - nowMs - startEarlyMs;

  if (forceNow || waitMs <= 0) {
    console.log("Iniciando replay ahora…");
  } else {
    console.log(
      `Esperando kickoff ${partido.fecha_kickoff} (~${Math.ceil(waitMs / 60000)} min)…`,
    );
    await sleep(waitMs);
  }

  await runMexicoSerbiaReplay({ reset: true, delayMs });

  console.log("\n✓ Runner terminado. El servicio puede quedar en Completed.");
}

main().catch((e) => {
  console.error("\n✗ Runner:", e.message);
  process.exit(1);
});
