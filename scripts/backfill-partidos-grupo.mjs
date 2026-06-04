/**
 * Rellena `grupo` (A–L) en partidos de fase grupos desde la API apifootball.
 * No modifica marcadores ni otros campos salvo fase/grupo/jornada cuando aplica.
 *
 * Uso: node scripts/backfill-partidos-grupo.mjs
 *      node scripts/backfill-partidos-grupo.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const MEXICO_TZ = "America/Mexico_City";

function parseFaseGrupoFromTexts(stageName, matchRound, leagueName) {
  const stage = String(stageName ?? "").toLowerCase();
  const round = String(matchRound ?? "").toLowerCase();
  const league = String(leagueName ?? "").toLowerCase();
  const groupMatch =
    stage.match(/group\s*([a-l])\b/i) ??
    round.match(/group\s*([a-l])\b/i) ??
    league.match(/group\s*([a-l])\b/i) ??
    round.match(/\b([a-l])\s*[-–]\s*\d/i);
  if (groupMatch || stage.includes("group") || league.includes("group")) {
    const jornadaMatch = round.match(/(\d+)/);
    return {
      fase: "grupos",
      grupo: groupMatch?.[1]?.toUpperCase() ?? null,
      jornada: jornadaMatch ? Number.parseInt(jornadaMatch[1], 10) || null : null,
    };
  }
  if (round.includes("16") || stage.includes("round of 16"))
    return { fase: "dieciseisavos", grupo: null, jornada: null };
  if (round.includes("8") || stage.includes("quarter"))
    return { fase: "cuartos", grupo: null, jornada: null };
  if (stage.includes("semi"))
    return { fase: "semifinal", grupo: null, jornada: null };
  if (stage.includes("3rd") || stage.includes("third"))
    return { fase: "tercer_lugar", grupo: null, jornada: null };
  if ((stage.includes("final") && !stage.includes("semi")) || round === "final")
    return { fase: "final", grupo: null, jornada: null };
  if (round.includes("32") || stage.includes("round of 32"))
    return { fase: "dieciseisavos", grupo: null, jornada: null };
  return { fase: "grupos", grupo: null, jornada: null };
}

function parseFaseGrupoFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  const apif =
    metadata.apifootball && typeof metadata.apifootball === "object"
      ? metadata.apifootball
      : metadata;
  if (!apif.stage_name && !apif.match_round && !apif.league_name) return null;
  return parseFaseGrupoFromTexts(
    apif.stage_name,
    apif.match_round ?? apif.round,
    apif.league_name,
  );
}

function parseFaseGrupoFromEvent(ev) {
  return parseFaseGrupoFromTexts(
    ev.stage_name,
    ev.match_round,
    ev.league_name,
  );
}

async function backfillFromMetadata(supabase, dryRun) {
  const { data: partidos, error } = await supabase
    .from("partidos")
    .select("id, fase, grupo, jornada, metadata");

  if (error) throw error;

  let updated = 0;
  let skipped = 0;

  for (const p of partidos ?? []) {
    const parsed = parseFaseGrupoFromMetadata(p.metadata);
    if (!parsed) {
      skipped += 1;
      continue;
    }
    const needsUpdate =
      p.fase !== parsed.fase ||
      p.grupo !== parsed.grupo ||
      p.jornada !== parsed.jornada;
    if (!needsUpdate) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      console.log(
        `  meta #${p.id}: grupo ${p.grupo ?? "∅"}→${parsed.grupo ?? "∅"}`,
      );
      updated += 1;
      continue;
    }
    const { error: upErr } = await supabase
      .from("partidos")
      .update({
        fase: parsed.fase,
        grupo: parsed.grupo,
        jornada: parsed.jornada,
      })
      .eq("id", p.id);
    if (upErr) throw upErr;
    updated += 1;
  }

  return { total: partidos?.length ?? 0, updated, skipped };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const metadataOnly = process.argv.includes("--metadata-only");
  const apiKey = process.env.API_FOOTBALL_KEY;
  const leagueId = process.env.APIFOOTBALL_LEAGUE_ID || "28";
  const from = process.env.APIFOOTBALL_WORLD_CUP_FROM || "2026-06-01";
  const to = process.env.APIFOOTBALL_WORLD_CUP_TO || "2026-07-31";
  const timezone = process.env.APIFOOTBALL_TIMEZONE || MEXICO_TZ;

  if (!apiKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Faltan API_FOOTBALL_KEY o NEXT_PUBLIC_SUPABASE_URL en .env.local");
    process.exit(1);
  }

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) {
    console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
  );

  console.log("Paso 1: backfill desde metadata.apifootball…");
  const metaResult = await backfillFromMetadata(supabase, dryRun);
  console.log(
    `  ${metaResult.updated} actualizados, ${metaResult.skipped} sin cambios (de ${metaResult.total})`,
  );

  if (metadataOnly) {
    if (dryRun) console.log("\n(dry-run)");
    else console.log("\n✅ Backfill metadata completado.");
    return;
  }

  const q = new URLSearchParams({
    action: "get_events",
    APIkey: apiKey,
    from,
    to,
    league_id: leagueId,
    timezone,
  });

  console.log(
    `get_events league=${leagueId} ${from}→${to} tz=${timezone}${dryRun ? " (dry-run)" : ""}`,
  );

  const events = await fetch(`https://apiv3.apifootball.com/?${q}`).then((r) =>
    r.json(),
  );

  if (!Array.isArray(events)) {
    const msg =
      events?.message ?? events?.error ?? JSON.stringify(events);
    console.error(
      `API sin eventos (${msg}). El script no modificó la BD. Cuando haya fixtures en tu plan, vuelve a ejecutarlo.`,
    );
    process.exit(1);
  }

  const byFixtureId = new Map();
  for (const ev of events) {
    if (!ev.match_id) continue;
    const fixtureId = Number.parseInt(String(ev.match_id), 10);
    if (Number.isNaN(fixtureId)) continue;
    const parsed = parseFaseGrupoFromEvent(ev);
    byFixtureId.set(fixtureId, parsed);
  }

  console.log(`Eventos API con fixture_id: ${byFixtureId.size}`);

  console.log("\nPaso 2: backfill desde API get_events…");

  const { data: partidos, error } = await supabase
    .from("partidos")
    .select("id, api_football_fixture_id, fase, grupo, jornada")
    .not("api_football_fixture_id", "is", null);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let noApi = 0;

  for (const p of partidos ?? []) {
    const fid = p.api_football_fixture_id;
    const parsed = byFixtureId.get(fid);
    if (!parsed) {
      noApi += 1;
      continue;
    }

    const needsUpdate =
      p.fase !== parsed.fase ||
      p.grupo !== parsed.grupo ||
      p.jornada !== parsed.jornada;

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(
        `  #${fid}: fase ${p.fase}→${parsed.fase} grupo ${p.grupo ?? "∅"}→${parsed.grupo ?? "∅"}`,
      );
      updated += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from("partidos")
      .update({
        fase: parsed.fase,
        grupo: parsed.grupo,
        jornada: parsed.jornada,
      })
      .eq("id", p.id);

    if (upErr) {
      console.error(`Error id=${p.id}:`, upErr.message);
      process.exit(1);
    }
    updated += 1;
  }

  const conGrupo = (partidos ?? []).filter((p) => p.grupo).length;
  console.log(`\nPartidos en BD: ${partidos?.length ?? 0} (con grupo antes: ${conGrupo})`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Sin cambios: ${skipped}`);
  console.log(`Sin match en API: ${noApi}`);
  if (dryRun) console.log("\n(dry-run: no se escribió en BD)");
  else console.log("\n✅ Backfill de grupo/fase completado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
