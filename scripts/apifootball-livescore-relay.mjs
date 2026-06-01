/**
 * Relay apifootball Livescore WebSocket → POST /api/webhooks/football
 *
 * apifootball NO envía HTTP a tu URL; empuja por WebSocket:
 *   wss://wss.apifootball.com/livescore
 *
 * Uso local o en Railway (servicio aparte, proceso largo):
 *   node scripts/apifootball-livescore-relay.mjs
 *
 * Variables (.env.local / Railway):
 *   API_FOOTBALL_KEY
 *   API_FOOTBALL_WEBHOOK_SECRET
 *   NEXT_PUBLIC_APP_URL  (destino del POST)
 *   APIFOOTBALL_PILOT_LEAGUE_ID  (opcional, ej. 3 = UCL)
 *   APIFOOTBALL_TIMEZONE  (default America/Mexico_City)
 */

import fs from "node:fs";
import { loadEnvLocal } from "./load-env-local.mjs";

const envPath = loadEnvLocal();

const apiKey = process.env.API_FOOTBALL_KEY;
const secret = process.env.API_FOOTBALL_WEBHOOK_SECRET;
const targetBase =
  process.env.WEBHOOK_RELAY_TARGET?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null);
const leagueId = process.env.APIFOOTBALL_PILOT_LEAGUE_ID?.trim();
const timezone = process.env.APIFOOTBALL_TIMEZONE ?? "America/Mexico_City";

if (!apiKey || !secret || !targetBase) {
  console.error(
    "Faltan API_FOOTBALL_KEY, API_FOOTBALL_WEBHOOK_SECRET y URL (NEXT_PUBLIC_APP_URL).",
  );
  console.error(`Archivo leido: ${envPath}`);
  console.error(
    `Presentes: API_FOOTBALL_KEY=${apiKey ? "si" : "no"}, API_FOOTBALL_WEBHOOK_SECRET=${secret ? "si" : "no"}, NEXT_PUBLIC_APP_URL=${targetBase ? "si" : "no"}`,
  );
  console.error("");
  console.error("Sincroniza desde Railway:");
  console.error("  powershell -File scripts/sync-env-from-railway.ps1");
  process.exit(1);
}

if (secret.includes("generate-a-long") || secret.length < 16) {
  console.warn(
    "⚠️  API_FOOTBALL_WEBHOOK_SECRET parece placeholder. Genera uno real en Railway.",
  );
}

const webhookUrl = `${targetBase}/api/webhooks/football`;
const params = new URLSearchParams({ APIkey: apiKey, timezone });
if (leagueId) params.set("league_id", leagueId);
const wsUrl = `wss://wss.apifootball.com/livescore?${params}`;

let ws;
let reconnectMs = 3000;
let lastPostAt = 0;
/** @type {Map<string, string>} */
const lastStatusByMatch = new Map();

async function forwardPayload(raw) {
  const now = Date.now();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  for (const item of items) {
    if (!item?.match_id) continue;

    const matchKey = String(item.match_id);
    const status = String(item.match_status ?? "");
    const statusChanged = lastStatusByMatch.get(matchKey) !== status;
    lastStatusByMatch.set(matchKey, status);

    if (!statusChanged && now - lastPostAt < 500) continue;
    lastPostAt = now;

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(item),
    });

    const body = await res.text();
    console.log(
      `[relay] match ${item.match_id} status=${item.match_status} → ${res.status} ${body.slice(0, 120)}`,
    );
  }
}

function connect() {
  console.log(`[relay] WebSocket → ${wsUrl.replace(apiKey, "***")}`);
  console.log(`[relay] POST → ${webhookUrl}`);

  ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    reconnectMs = 3000;
    console.log("[relay] Conectado a apifootball livescore");
  });

  ws.addEventListener("message", (ev) => {
    forwardPayload(String(ev.data)).catch((e) => {
      console.error("[relay] Error reenviando:", e.message);
    });
  });

  ws.addEventListener("close", (ev) => {
    console.warn(`[relay] Desconectado (${ev.code}). Reintento en ${reconnectMs}ms`);
    setTimeout(connect, reconnectMs);
    reconnectMs = Math.min(reconnectMs * 2, 60_000);
  });

  ws.addEventListener("error", (ev) => {
    console.error("[relay] WebSocket error:", ev.message ?? ev);
  });
}

process.on("SIGINT", () => {
  ws?.close();
  process.exit(0);
});

connect();
