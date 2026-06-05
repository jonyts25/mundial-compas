/**
 * Simula México vs Serbia en vivo vía webhook (sin depender de apifootball livescore).
 *
 * Uso:
 *   node scripts/replay-mexico-serbia-live.mjs --reset
 *   node scripts/replay-mexico-serbia-live.mjs --reset --delay=30000
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";
import { MEXICO_SERBIA_FIXTURE_ID } from "./cargar-pilot-mexico-serbia.mjs";

loadEnvLocal();

const FIXTURE_ID = MEXICO_SERBIA_FIXTURE_ID;
const HOME = "Mexico";
const AWAY = "Serbia";
const ROUND = "Group A - 1";

const args = new Set(process.argv.slice(2));
const doReset = args.has("--reset");
const targetLocal = args.has("--target") && process.argv.includes("local");
const delayMs = Number.parseInt(
  process.argv.find((a, i) => process.argv[i - 1] === "--delay") ?? "25000",
  10,
);

const secret = process.env.API_FOOTBALL_WEBHOOK_SECRET;
const baseUrl = (
  targetLocal
    ? "http://localhost:3000"
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://mundial-compas.up.railway.app")
).replace(/\/$/, "");

if (!secret) {
  console.error("Falta API_FOOTBALL_WEBHOOK_SECRET");
  process.exit(1);
}

const webhookUrl = `${baseUrl}/api/webhooks/football`;

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

function buildPayload(status, homeScore, awayScore, goalscorer, matchLive = "1") {
  return {
    match_id: String(FIXTURE_ID),
    match_hometeam_name: HOME,
    match_awayteam_name: AWAY,
    match_hometeam_score: String(homeScore),
    match_awayteam_score: String(awayScore),
    match_status: status,
    match_live: matchLive,
    match_round: ROUND,
    league_round: ROUND,
    league_id: "776",
    league_name: "International Friendly",
    stage_name: "Group Stage",
    goalscorer,
  };
}

const STEPS = [
  {
    label: "1/8 Pitazo — 1st Half",
    payload: buildPayload("1st Half", 0, 0, [], "1"),
  },
  {
    label: "2/8 Gol México 23' (Lozano)",
    payload: buildPayload(
      "1st Half",
      1,
      0,
      [goalRow(23, "Hirving Lozano", "", "1 - 0")],
      "1",
    ),
  },
  {
    label: "3/8 Medio tiempo",
    payload: buildPayload(
      "Half Time",
      1,
      0,
      [goalRow(23, "Hirving Lozano", "", "1 - 0")],
      "1",
    ),
  },
  {
    label: "4/8 Arranca 2nd Half",
    payload: buildPayload(
      "2nd Half",
      1,
      0,
      [goalRow(23, "Hirving Lozano", "", "1 - 0")],
      "1",
    ),
  },
  {
    label: "5/8 Gol Serbia 67' (Mitrović)",
    payload: buildPayload(
      "2nd Half",
      1,
      1,
      [
        goalRow(23, "Hirving Lozano", "", "1 - 0"),
        goalRow(67, "", "Aleksandar Mitrovic", "1 - 1"),
      ],
      "1",
    ),
  },
  {
    label: "6/8 Gol México 82' (Martín)",
    payload: buildPayload(
      "2nd Half",
      2,
      1,
      [
        goalRow(23, "Hirving Lozano", "", "1 - 0"),
        goalRow(67, "", "Aleksandar Mitrovic", "1 - 1"),
        goalRow(82, "Henry Martin", "", "2 - 1"),
      ],
      "1",
    ),
  },
  {
    label: "7/8 Final del partido",
    payload: buildPayload(
      "Finished",
      2,
      1,
      [
        goalRow(23, "Hirving Lozano", "", "1 - 0"),
        goalRow(67, "", "Aleksandar Mitrovic", "1 - 1"),
        goalRow(82, "Henry Martin", "", "2 - 1"),
      ],
      "0",
    ),
  },
  {
    label: "8/8 FT confirmado",
    payload: buildPayload(
      "FT",
      2,
      1,
      [
        goalRow(23, "Hirving Lozano", "", "1 - 0"),
        goalRow(67, "", "Aleksandar Mitrovic", "1 - 1"),
        goalRow(82, "Henry Martin", "", "2 - 1"),
      ],
      "0",
    ),
  },
];

async function resetPartido(sb, partido) {
  const meta =
    partido.metadata && typeof partido.metadata === "object"
      ? { ...partido.metadata }
      : {};

  delete meta.marcador_penales_local;
  delete meta.marcador_penales_visitante;
  delete meta.penales_kicks_vistos;
  delete meta.reloj;
  delete meta.apifootball_status_raw;
  delete meta.apifootball_last_status;
  delete meta.apifootball_last_sync;
  delete meta.announced_goals;

  const { error: delErr } = await sb
    .from("webhook_eventos")
    .delete()
    .eq("proveedor", "apifootball")
    .like("evento_externo_id", `${FIXTURE_ID}-%`);

  if (delErr) throw new Error(`Reset webhook_eventos: ${delErr.message}`);

  const { error: chatErr } = await sb
    .from("mensajes_chat")
    .delete()
    .eq("partido_id", partido.id)
    .in("tipo", ["evento_partido", "dato_mamalón"]);

  if (chatErr) {
    console.warn("Aviso: no se limpió chat de eventos:", chatErr.message);
  }

  const { error: updErr } = await sb
    .from("partidos")
    .update({
      estatus: "programado",
      marcador_local: null,
      marcador_visitante: null,
      minuto_actual: null,
      metadata: meta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partido.id);

  if (updErr) throw new Error(`Reset partido: ${updErr.message}`);

  console.log(`✓ Reset partido ${partido.id}`);
}

async function postStep(step) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(step.payload),
  });
  const body = await res.text();
  console.log(`\n→ ${step.label}`);
  console.log(`  ${res.status} ${body.slice(0, 220)}`);
  if (!res.ok) throw new Error(`Webhook falló: ${step.label}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runMexicoSerbiaReplay(options = {}) {
  const reset = options.reset ?? doReset;
  const delay = options.delayMs ?? delayMs;

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) throw new Error("Faltan credenciales Supabase");

  const sb = createClient(sbUrl, sbKey);
  const { data: partido, error } = await sb
    .from("partidos")
    .select("id, metadata")
    .eq("api_football_fixture_id", FIXTURE_ID)
    .maybeSingle();

  if (error || !partido) {
    throw new Error(`Partido fixture ${FIXTURE_ID} no encontrado. Corre cargar-pilot-mexico-serbia.mjs`);
  }

  console.log(`Webhook: ${webhookUrl}`);
  console.log(`Partido: ${HOME} vs ${AWAY} | delay=${delay}ms`);

  if (reset) await resetPartido(sb, partido);

  for (const step of STEPS) {
    await postStep(step);
    await sleep(delay);
  }

  console.log("\n✓ Secuencia México vs Serbia completa.");
}

async function main() {
  try {
    await runMexicoSerbiaReplay();
  } catch (e) {
    console.error("\n✗", e.message);
    process.exit(1);
  }
}

const isMain = process.argv[1]?.includes("replay-mexico-serbia-live");
if (isMain) main();
