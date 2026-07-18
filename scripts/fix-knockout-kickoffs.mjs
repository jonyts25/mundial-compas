/**
 * Corrige fecha_kickoff de partidos eliminatorios (73–104) en BD.
 * node scripts/fix-knockout-kickoffs.mjs
 * node scripts/fix-knockout-kickoffs.mjs --dry-run
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const KNOCKOFF = {
  73: "2026-06-28T19:00:00.000Z",
  74: "2026-06-29T20:30:00.000Z",
  75: "2026-06-30T01:00:00.000Z",
  76: "2026-06-29T17:00:00.000Z",
  77: "2026-06-30T21:00:00.000Z",
  78: "2026-06-30T17:00:00.000Z",
  79: "2026-07-01T01:00:00.000Z",
  80: "2026-07-01T16:00:00.000Z",
  81: "2026-07-02T00:00:00.000Z",
  82: "2026-07-01T20:00:00.000Z",
  83: "2026-07-02T23:00:00.000Z",
  84: "2026-07-02T19:00:00.000Z",
  85: "2026-07-03T03:00:00.000Z",
  86: "2026-07-03T18:00:00.000Z",
  87: "2026-07-04T01:30:00.000Z",
  88: "2026-07-03T22:00:00.000Z",
  89: "2026-07-04T21:00:00.000Z",
  90: "2026-07-04T17:00:00.000Z",
  91: "2026-07-05T20:00:00.000Z",
  92: "2026-07-06T00:00:00.000Z",
  93: "2026-07-06T19:00:00.000Z",
  94: "2026-07-07T00:00:00.000Z",
  95: "2026-07-07T16:00:00.000Z",
  96: "2026-07-07T20:00:00.000Z",
  97: "2026-07-09T22:00:00.000Z",
  98: "2026-07-10T19:00:00.000Z",
  99: "2026-07-11T20:00:00.000Z",
  100: "2026-07-11T23:00:00.000Z",
  101: "2026-07-14T19:00:00.000Z",
  102: "2026-07-15T19:00:00.000Z",
  103: "2026-07-18T21:00:00.000Z", // 17:00 ET / 15:00 CDMX — Miami
  104: "2026-07-19T19:00:00.000Z", // 15:00 ET / 13:00 CDMX — MetLife
};

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const dryRun = process.argv.includes("--dry-run");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data, error } = await supabase
  .from("partidos")
  .select("id, fecha_kickoff, metadata, equipo_local_nombre, equipo_visitante_nombre, estatus")
  .neq("fase", "grupos");

if (error) {
  console.error(error.message);
  process.exit(1);
}

let updated = 0;
for (const row of data ?? []) {
  const meta = row.metadata ?? {};
  const n = meta.fifa_match_number;
  if (typeof n !== "number" || !(n in KNOCKOFF)) continue;

  const next = KNOCKOFF[n];
  if (row.fecha_kickoff === next) continue;

  console.log(
    `M${n} ${row.equipo_local_nombre} vs ${row.equipo_visitante_nombre}: ${row.fecha_kickoff} → ${next}`,
  );

  if (!dryRun) {
    const { error: upErr } = await supabase
      .from("partidos")
      .update({ fecha_kickoff: next })
      .eq("id", row.id);
    if (upErr) {
      console.error(upErr.message);
      process.exit(1);
    }
  }
  updated += 1;
}

console.log(dryRun ? `Dry-run: ${updated} partidos por actualizar` : `Actualizados: ${updated}`);
