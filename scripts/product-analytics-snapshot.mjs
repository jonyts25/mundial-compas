#!/usr/bin/env node
/**
 * PRODUCT-ANALYTICS-REVIEW-1 — snapshot read-only de métricas Supabase.
 *
 * Uso:
 *   node scripts/product-analytics-snapshot.mjs
 *   node scripts/product-analytics-snapshot.mjs --markdown
 *   node scripts/product-analytics-snapshot.mjs --ollama
 *
 * Requiere .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * NO modifica datos. Solo SELECT / agregación en memoria.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIGA_GLOBAL_ID = "a0000000-0000-4000-8000-000000000001";
const PAGE = 1000;

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

async function fetchAll(supabase, table, select, applyFilters) {
  const rows = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function countRows(supabase, table, applyFilters) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (applyFilters) q = applyFilters(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

function tierCounts(picksByUser) {
  const values = [...picksByUser.values()];
  return {
    withAtLeast1: values.filter((n) => n >= 1).length,
    withAtLeast5: values.filter((n) => n >= 5).length,
    withAtLeast10: values.filter((n) => n >= 10).length,
  };
}

function aggregatePicksByUser(rows) {
  const map = new Map();
  for (const r of rows) {
    map.set(r.usuario_id, (map.get(r.usuario_id) ?? 0) + 1);
  }
  return map;
}

function topBottomByKey(rows, keyField, countField = "count") {
  const sorted = [...rows].sort((a, b) => b[countField] - a[countField]);
  return {
    top: sorted.slice(0, 5).map((r) => ({
      id: r[keyField],
      label: r.label ?? r[keyField],
      count: r[countField],
    })),
    bottom: sorted
      .filter((r) => r[countField] > 0)
      .slice(-5)
      .reverse()
      .map((r) => ({
        id: r[keyField],
        label: r.label ?? r[keyField],
        count: r[countField],
      })),
  };
}

function cohortRetention(pronosticosWithDates) {
  /** @type {Map<string, { users: Set<string>, firstDay: Map<string, string>, activityDays: Map<string, Set<string>> }>} */
  const byFirstWeek = new Map();

  const firstPick = new Map();
  const activityDays = new Map();

  for (const p of pronosticosWithDates) {
    const day = p.created_at.slice(0, 10);
    if (!firstPick.has(p.usuario_id) || day < firstPick.get(p.usuario_id)) {
      firstPick.set(p.usuario_id, day);
    }
    if (!activityDays.has(p.usuario_id)) activityDays.set(p.usuario_id, new Set());
    activityDays.get(p.usuario_id).add(day);
  }

  for (const [userId, firstDay] of firstPick) {
    const week = firstDay.slice(0, 7);
    if (!byFirstWeek.has(week)) {
      byFirstWeek.set(week, { cohortSize: 0, returnedNextDay: 0, returned7d: 0 });
    }
    const bucket = byFirstWeek.get(week);
    bucket.cohortSize += 1;
    const days = activityDays.get(userId);
    const nextDay = addDays(firstDay, 1);
    const day7 = addDays(firstDay, 7);
    if (days.has(nextDay)) bucket.returnedNextDay += 1;
    for (let i = 1; i <= 7; i++) {
      if (days.has(addDays(firstDay, i))) {
        bucket.returned7d += 1;
        break;
      }
    }
  }

  const cohorts = [...byFirstWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortWeek, stats]) => ({
      cohortWeek,
      cohortSize: stats.cohortSize,
      returnedNextDay: stats.returnedNextDay,
      returnedNextDayPct:
        stats.cohortSize > 0
          ? Math.round((stats.returnedNextDay / stats.cohortSize) * 1000) / 10
          : 0,
      returnedWithin7d: stats.returned7d,
      returnedWithin7dPct:
        stats.cohortSize > 0
          ? Math.round((stats.returned7d / stats.cohortSize) * 1000) / 10
          : 0,
    }));

  let multiJornadaUsers = 0;
  const jornadasByUser = new Map();
  for (const p of pronosticosWithDates) {
    if (p.jornada == null) continue;
    if (!jornadasByUser.has(p.usuario_id)) {
      jornadasByUser.set(p.usuario_id, new Set());
    }
    jornadasByUser.get(p.usuario_id).add(p.jornada);
  }
  for (const jornadas of jornadasByUser.values()) {
    if (jornadas.size > 1) multiJornadaUsers += 1;
  }

  return { cohorts, multiJornadaUsers, usersWithFirstPick: firstPick.size };
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function tryPostHogNote() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  if (!enabled || !key) {
    return {
      available: false,
      reason:
        "PostHog client-side only; sin API key de proyecto en env para consultas server-side.",
      eventsToReviewManually: [
        "match_view",
        "pitoniso_shown",
        "pitoniso_expanded",
        "prediction_updated",
        "leaderboard_viewed",
        "whats_new_shown",
        "whats_new_dismissed",
        "oracle_lab_generated",
        "ai_lab_preview_generated",
      ],
    };
  }
  return {
    available: false,
    reason:
      "NEXT_PUBLIC_POSTHOG_KEY presente pero este script no consulta PostHog API (solo documenta eventos). Ver docs/POSTHOG_PRODUCT_REVIEW.md.",
    eventsToReviewManually: [
      "match_view",
      "pitoniso_shown",
      "pitoniso_expanded",
      "prediction_updated",
      "leaderboard_viewed",
      "whats_new_shown",
      "whats_new_dismissed",
    ],
  };
}

async function tryOllamaSummary(metricsJson) {
  const base = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model =
    process.env.OLLAMA_MODEL_SPANISH ??
    process.env.OLLAMA_MODEL_FAST ??
    "llama3.2:3b";
  const timeout = Number(process.env.OLLAMA_TIMEOUT_MS ?? 60000);

  const prompt = `Eres analista de producto. Recibes SOLO métricas agregadas de una app de quiniela (Mundial Compas).
NO inventes números. Cita solo valores del JSON.
Separa claramente OBSERVACIÓN (dato del JSON) de INFERENCIA (interpretación).
Si faltan datos, dilo.

JSON:
${JSON.stringify(metricsJson, null, 2)}

Escribe en español:
1. Qué está funcionando
2. Qué no
3. Señales de retención
4. Señales de grupo/viralidad
5. Riesgos
6. Qué medir esta semana`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.3 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = await res.json();
    return { ok: true, model, text: body.response ?? "" };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

function renderMarkdown(snapshot, generatedAt) {
  const m = snapshot;
  const lines = [
    `# Product Analytics Snapshot — ${generatedAt}`,
    "",
    `Generado por \`scripts/product-analytics-snapshot.mjs\` (solo lectura).`,
    "",
    "## Usuarios",
    "",
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Total usuarios | ${m.users.total} |`,
    `| Con ≥1 pronóstico | ${m.users.withAtLeast1Pick} |`,
    `| Con ≥5 pronósticos | ${m.users.withAtLeast5Picks} |`,
    `| Con ≥10 pronósticos | ${m.users.withAtLeast10Picks} |`,
    `| Pronóstico últimas 24h | ${m.users.activeLast24h} usuarios |`,
    `| Pronóstico últimos 7d | ${m.users.activeLast7d} usuarios |`,
    "",
    "## Quiniela global",
    "",
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Total pronósticos | ${m.global.totalPicks} |`,
    `| Usuarios participando | ${m.global.participatingUsers} |`,
    `| Promedio picks/usuario | ${m.global.avgPicksPerUser} |`,
    `| Antes del kickoff | ${m.global.picksBeforeKickoff} (${m.global.picksBeforeKickoffPct}%) |`,
    `| Después del kickoff | ${m.global.picksAfterKickoff} (${m.global.picksAfterKickoffPct}%) |`,
    "",
    "### Partidos con más picks (global)",
    ...m.global.topMatches.map(
      (x) => `- ${x.label}: **${x.count}** picks`,
    ),
    "",
    "### Partidos con menos picks (global, >0)",
    ...m.global.bottomMatches.map(
      (x) => `- ${x.label}: **${x.count}** picks`,
    ),
    "",
    "## Quinielas privadas",
    "",
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Total ligas privadas | ${m.private.totalLeagues} |`,
    `| Activas con ≥2 miembros | ${m.private.activeWith2PlusMembers} |`,
    `| Activas con ≥5 miembros | ${m.private.activeWith5PlusMembers} |`,
    `| Creadas por usuarios (no sistema) | ${m.private.leaguesByDistinctCreators} creadores / ${m.private.leaguesFromUsers} ligas |`,
    `| Abandonadas (1 miembro, 0 picks, >3d) | ${m.private.abandonedLeagues} |`,
    `| Total pronósticos en privadas | ${m.private.totalPicks} |`,
    `| Promedio miembros/liga activa | ${m.private.avgMembersPerActiveLeague} |`,
    "",
    "## Retención (aprox.)",
    "",
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Usuarios con primer pronóstico | ${m.retention.usersWithFirstPick} |`,
    `| Picks en >1 jornada (global) | ${m.retention.multiJornadaUsers} usuarios |`,
    "",
    "### Cohortes por semana de primer pronóstico",
    "",
    "| Semana | Usuarios | D+1 | D+1 % | ≤7d | ≤7d % |",
    "|--------|--------:|----:|------:|----:|------:|",
    ...m.retention.cohorts.map(
      (c) =>
        `| ${c.cohortWeek} | ${c.cohortSize} | ${c.returnedNextDay} | ${c.returnedNextDayPct}% | ${c.returnedWithin7d} | ${c.returnedWithin7dPct}% |`,
    ),
    "",
    "## Engagement (chat Supabase)",
    "",
    `| Métrica | Valor |`,
    `|---------|------:|`,
    `| Mensajes usuario (total) | ${m.engagement.chatMessagesTotal} |`,
    `| Partidos con chat | ${m.engagement.chatDistinctMatches} |`,
    `| Ligas con chat | ${m.engagement.chatDistinctLeagues} |`,
  ];

  if (m.posthog) {
    lines.push(
      "",
      "## PostHog",
      "",
      `Estado: ${m.posthog.available ? "consultado" : "no consultado desde script"}`,
      "",
      m.posthog.reason ?? "",
      "",
      "Eventos a revisar manualmente:",
      ...m.posthog.eventsToReviewManually.map((e) => `- \`${e}\``),
    );
  }

  return lines.join("\n");
}

async function main() {
  loadEnvLocal();
  const writeMarkdown = process.argv.includes("--markdown");
  const runOllama = process.argv.includes("--ollama");
  const generatedAt = isoDate(new Date());

  const supabase = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  console.log("PRODUCT-ANALYTICS-SNAPSHOT — read-only\n");

  const [totalUsers, totalPrivateLeagues, globalPickCount] = await Promise.all([
    countRows(supabase, "usuarios"),
    countRows(supabase, "ligas_privadas", (q) =>
      q.eq("es_sistema", false),
    ),
    countRows(supabase, "pronosticos", (q) => q.eq("liga_id", LIGA_GLOBAL_ID)),
  ]);

  console.log("Fetching pronósticos (usuario_id, liga, partido, fechas)...");
  const allPicks = await fetchAll(
    supabase,
    "pronosticos",
    "usuario_id, liga_id, partido_id, created_at",
  );

  const globalPicks = allPicks.filter((p) => p.liga_id === LIGA_GLOBAL_ID);
  const privatePicks = allPicks.filter((p) => p.liga_id !== LIGA_GLOBAL_ID);

  const picksByUserAll = aggregatePicksByUser(allPicks);
  const picksByUserGlobal = aggregatePicksByUser(globalPicks);
  const userTiers = tierCounts(picksByUserAll);

  const since24h = daysAgo(1);
  const since7d = daysAgo(7);
  const activeLast24h = new Set(
    allPicks.filter((p) => p.created_at >= since24h).map((p) => p.usuario_id),
  ).size;
  const activeLast7d = new Set(
    allPicks.filter((p) => p.created_at >= since7d).map((p) => p.usuario_id),
  ).size;

  console.log("Fetching partidos...");
  const partidos = await fetchAll(
    supabase,
    "partidos",
    "id, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, jornada, fase",
  );
  const partidoById = new Map(partidos.map((p) => [p.id, p]));

  const globalByPartido = new Map();
  for (const p of globalPicks) {
    globalByPartido.set(p.partido_id, (globalByPartido.get(p.partido_id) ?? 0) + 1);
  }
  const matchRows = [...globalByPartido.entries()].map(([id, count]) => {
    const partido = partidoById.get(id);
    const label = partido
      ? `${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`
      : id;
    return { partido_id: id, label, count };
  });
  const { top: topMatches, bottom: bottomMatches } = topBottomByKey(
    matchRows,
    "partido_id",
  );

  let picksBeforeKickoff = 0;
  let picksAfterKickoff = 0;
  for (const p of globalPicks) {
    const partido = partidoById.get(p.partido_id);
    if (!partido?.fecha_kickoff) continue;
    if (p.created_at < partido.fecha_kickoff) picksBeforeKickoff += 1;
    else picksAfterKickoff += 1;
  }
  const kickoffKnown = picksBeforeKickoff + picksAfterKickoff;

  console.log("Fetching ligas privadas y miembros...");
  const ligas = await fetchAll(
    supabase,
    "ligas_privadas",
    "id, slug, nombre, creador_id, es_sistema, activa, created_at",
    (q) => q.eq("es_sistema", false),
  );
  const miembros = await fetchAll(
    supabase,
    "liga_miembros",
    "liga_id, usuario_id, joined_at",
  );

  const membersByLiga = new Map();
  for (const m of miembros) {
    if (!membersByLiga.has(m.liga_id)) membersByLiga.set(m.liga_id, []);
    membersByLiga.get(m.liga_id).push(m);
  }

  const picksByLiga = new Map();
  for (const p of privatePicks) {
    picksByLiga.set(p.liga_id, (picksByLiga.get(p.liga_id) ?? 0) + 1);
  }

  const threeDaysAgo = daysAgo(3);
  let activeWith2 = 0;
  let activeWith5 = 0;
  let abandonedLeagues = 0;
  const memberCountsActive = [];

  for (const liga of ligas) {
    const members = membersByLiga.get(liga.id) ?? [];
    const memberCount = members.length;
    const pickCount = picksByLiga.get(liga.id) ?? 0;
    if (liga.activa) {
      if (memberCount >= 2) activeWith2 += 1;
      if (memberCount >= 5) activeWith5 += 1;
      if (memberCount > 0) memberCountsActive.push(memberCount);
    }
    if (
      liga.activa &&
      memberCount === 1 &&
      pickCount === 0 &&
      liga.created_at < threeDaysAgo
    ) {
      abandonedLeagues += 1;
    }
  }

  const distinctCreators = new Set(
    ligas.filter((l) => l.creador_id).map((l) => l.creador_id),
  ).size;

  const pronosticosForRetention = globalPicks.map((p) => {
    const partido = partidoById.get(p.partido_id);
    return {
      usuario_id: p.usuario_id,
      created_at: p.created_at,
      jornada: partido?.jornada ?? null,
    };
  });
  const retention = cohortRetention(pronosticosForRetention);

  console.log("Fetching mensajes_chat...");
  const chatRows = await fetchAll(
    supabase,
    "mensajes_chat",
    "partido_id, liga_id, tipo",
    (q) => q.eq("tipo", "usuario"),
  );

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: "supabase_read_only",
    users: {
      total: totalUsers,
      withAtLeast1Pick: userTiers.withAtLeast1,
      withAtLeast5Picks: userTiers.withAtLeast5,
      withAtLeast10Picks: userTiers.withAtLeast10,
      activeLast24h,
      activeLast7d,
    },
    global: {
      ligaId: LIGA_GLOBAL_ID,
      totalPicks: globalPickCount,
      participatingUsers: picksByUserGlobal.size,
      avgPicksPerUser:
        picksByUserGlobal.size > 0
          ? Math.round((globalPickCount / picksByUserGlobal.size) * 10) / 10
          : 0,
      topMatches,
      bottomMatches,
      picksBeforeKickoff,
      picksAfterKickoff,
      picksBeforeKickoffPct:
        kickoffKnown > 0
          ? Math.round((picksBeforeKickoff / kickoffKnown) * 1000) / 10
          : null,
      picksAfterKickoffPct:
        kickoffKnown > 0
          ? Math.round((picksAfterKickoff / kickoffKnown) * 1000) / 10
          : null,
    },
    private: {
      totalLeagues: totalPrivateLeagues,
      activeWith2PlusMembers: activeWith2,
      activeWith5PlusMembers: activeWith5,
      leaguesFromUsers: ligas.length,
      leaguesByDistinctCreators: distinctCreators,
      abandonedLeagues,
      totalPicks: privatePicks.length,
      avgMembersPerActiveLeague:
        memberCountsActive.length > 0
          ? Math.round(
              (memberCountsActive.reduce((a, b) => a + b, 0) /
                memberCountsActive.length) *
                10,
            ) / 10
          : 0,
    },
    retention: {
      usersWithFirstPick: retention.usersWithFirstPick,
      multiJornadaUsers: retention.multiJornadaUsers,
      cohorts: retention.cohorts,
    },
    engagement: {
      chatMessagesTotal: chatRows.length,
      chatDistinctMatches: new Set(chatRows.map((c) => c.partido_id)).size,
      chatDistinctLeagues: new Set(chatRows.map((c) => c.liga_id)).size,
    },
    posthog: await tryPostHogNote(),
  };

  const jsonPath = path.join(ROOT, `product-analytics-snapshot-${generatedAt}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`\nJSON: ${jsonPath}`);

  console.log("\n--- Métricas ---\n");
  console.log(JSON.stringify(snapshot, null, 2));

  const mdPath = path.join(
    ROOT,
    `PRODUCT_ANALYTICS_SNAPSHOT_${generatedAt.replace(/-/g, "_")}.md`,
  );
  const md = renderMarkdown(snapshot, generatedAt);
  fs.writeFileSync(mdPath, md, "utf8");
  console.log(`\nMarkdown: ${mdPath}`);

  if (writeMarkdown) {
    console.log("\n(Markdown escrito; flag --markdown es default implícito)");
  }

  if (runOllama) {
    console.log("\nConsultando Ollama...");
    const ollama = await tryOllamaSummary(snapshot);
    const ollamaPath = path.join(ROOT, "PRODUCT_ANALYTICS_OLLAMA_SUMMARY.md");
    if (ollama.ok) {
      const content = [
        "# Product Analytics — Resumen Ollama",
        "",
        `Modelo: \`${ollama.model}\``,
        `Fecha snapshot: ${generatedAt}`,
        "",
        "> Solo métricas agregadas del JSON. Sin PII.",
        "",
        ollama.text,
      ].join("\n");
      fs.writeFileSync(ollamaPath, content, "utf8");
      console.log(`Ollama summary: ${ollamaPath}`);
    } else {
      console.log(`Ollama no disponible: ${ollama.error}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
