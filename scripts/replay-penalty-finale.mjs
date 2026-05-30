/**
 * Reenvía payloads de penales + final al webhook (prueba push/chat).
 *
 * Uso:
 *   node scripts/replay-penalty-finale.mjs --reset
 *   node scripts/replay-penalty-finale.mjs --reset --semifinal
 *   node scripts/replay-penalty-finale.mjs --reset --target local
 *
 * Requiere .env.local: API_FOOTBALL_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const FIXTURE_ID = 765050;
const HOME = "PSG";
const AWAY = "Arsenal";
const REG_HOME = 1;
const REG_AWAY = 1;

const args = new Set(process.argv.slice(2));
const doReset = args.has("--reset");
const isFinal = !args.has("--semifinal");
const targetLocal = args.has("--target") && process.argv.includes("local");
const delayMs = Number.parseInt(
  process.argv.find((a, i) => process.argv[i - 1] === "--delay") ?? "800",
  10,
);

const secret = process.env.API_FOOTBALL_WEBHOOK_SECRET;
const baseUrl = (
  targetLocal
    ? "http://localhost:3000"
    : (process.env.NEXT_PUBLIC_APP_URL ?? "https://mundial-compas.up.railway.app")
).replace(/\/$/, "");

if (!secret) {
  console.error("Falta API_FOOTBALL_WEBHOOK_SECRET en .env.local");
  process.exit(1);
}

const webhookUrl = `${baseUrl}/api/webhooks/football`;

function penRow(kick, homeScorer, awayScorer, score) {
  return {
    time: String(kick),
    home_scorer: homeScorer ?? "",
    away_scorer: awayScorer ?? "",
    score,
    score_info_time: "Penalty",
    info: "",
  };
}

function buildPayload(status, penHome, penAway, goalscorer, roundLabel) {
  return {
    match_id: String(FIXTURE_ID),
    match_hometeam_name: HOME,
    match_awayteam_name: AWAY,
    match_hometeam_score: String(REG_HOME),
    match_awayteam_score: String(REG_AWAY),
    match_status: status,
    match_live: status.toLowerCase().includes("after") ? "0" : "1",
    match_round: roundLabel,
    league_round: roundLabel,
    match_hometeam_penalty_score:
      penHome != null ? String(penHome) : "",
    match_awayteam_penalty_score:
      penAway != null ? String(penAway) : "",
    goalscorer,
  };
}

const roundLabel = isFinal ? "Final" : "Semi-finals";

/** Secuencia: bootstrap → gol local → fallo visitante → gol local (2-0) → After Pen. */
const STEPS = [
  {
    label: "1/5 Bootstrap tanda (sin eventos)",
    payload: buildPayload("Penalties", null, null, [], roundLabel),
  },
  {
    label: "2/5 PSG anota (1-0 en penales)",
    payload: buildPayload(
      "Penalties",
      1,
      0,
      [penRow(1, "Ousmane Dembélé (pen.)", "", "1 - 0")],
      roundLabel,
    ),
  },
  {
    label: "3/5 Arsenal falla (sigue 1-0)",
    payload: buildPayload(
      "Penalties",
      1,
      0,
      [
        penRow(1, "Ousmane Dembélé (pen.)", "", "1 - 0"),
        penRow(2, "", "Bukayo Saka (pen.)", "1 - 0"),
      ],
      roundLabel,
    ),
  },
  {
    label: "4/5 PSG anota (2-0, gana la tanda)",
    payload: buildPayload(
      "Penalties",
      2,
      0,
      [
        penRow(1, "Ousmane Dembélé (pen.)", "", "1 - 0"),
        penRow(2, "", "Bukayo Saka (pen.)", "1 - 0"),
        penRow(3, "Désiré Doué (pen.)", "", "2 - 0"),
      ],
      roundLabel,
    ),
  },
  {
    label: `5/5 Final — ${isFinal ? "campeón" : "ganador"}`,
    payload: buildPayload(
      "After Pen.",
      2,
      0,
      [
        penRow(1, "Ousmane Dembélé (pen.)", "", "1 - 0"),
        penRow(2, "", "Bukayo Saka (pen.)", "1 - 0"),
        penRow(3, "Désiré Doué (pen.)", "", "2 - 0"),
      ],
      roundLabel,
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
  meta.penales_kicks_vistos = ["__replay_seed__"];

  meta.reloj = {
    period: "ET2",
    ticking: false,
    anchorMinute: 120,
    anchoredAt: new Date().toISOString(),
  };
  meta.apifootball_status_raw = "Break Time";
  meta.apifootball_last_status = "en_vivo";
  meta.apifootball_last_sync = new Date().toISOString();
  if (meta.apifootball && typeof meta.apifootball === "object") {
    meta.apifootball = {
      ...meta.apifootball,
      match_round: roundLabel,
      stage_name: isFinal ? "Final" : "Semi-finals",
      match_status: "Break Time",
    };
  }

  const { error: delErr } = await sb
    .from("webhook_eventos")
    .delete()
    .eq("proveedor", "apifootball")
    .like("evento_externo_id", `${FIXTURE_ID}-%`);

  if (delErr) throw new Error(`Reset webhook_eventos: ${delErr.message}`);

  const { error: updErr } = await sb
    .from("partidos")
    .update({
      estatus: "en_vivo",
      marcador_local: REG_HOME,
      marcador_visitante: REG_AWAY,
      minuto_actual: null,
      fase: isFinal ? "final" : "semifinal",
      metadata: meta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partido.id);

  if (updErr) throw new Error(`Reset partido: ${updErr.message}`);

  console.log(`✓ Reset: partido ${partido.id}, eventos ${FIXTURE_ID}-* borrados`);
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
  console.log(`  ${res.status} ${body.slice(0, 200)}`);
  if (!res.ok) {
    throw new Error(`Webhook falló en: ${step.label}`);
  }
  return JSON.parse(body);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sb = createClient(sbUrl, sbKey);
  const { data: partido, error } = await sb
    .from("partidos")
    .select("id, metadata, fase")
    .eq("api_football_fixture_id", FIXTURE_ID)
    .maybeSingle();

  if (error || !partido) {
    console.error("Partido no encontrado para fixture", FIXTURE_ID, error?.message);
    process.exit(1);
  }

  console.log(`Webhook: ${webhookUrl}`);
  console.log(`Partido: ${HOME} vs ${AWAY} | fase=${isFinal ? "final" : "semifinal"}`);

  if (doReset) {
    await resetPartido(sb, partido);
  } else {
    console.log("Sin --reset: solo se envían payloads (eventos ya vistos se omiten).");
  }

  for (const step of STEPS) {
    await postStep(step);
    await sleep(delayMs);
  }

  console.log("\n✓ Secuencia completa. Revisa push y chat del partido.");
}

main().catch((e) => {
  console.error("\n✗", e.message);
  process.exit(1);
});
