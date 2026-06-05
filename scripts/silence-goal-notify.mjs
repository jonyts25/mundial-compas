/**
 * Marca el marcador actual como ya notificado (gol_notify_score) para dejar de
 * re-enviar push del mismo gol. Uso inmediato ante spam de notificaciones.
 *
 *   node scripts/silence-goal-notify.mjs
 *   node scripts/silence-goal-notify.mjs --fixture=1528284
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const fixtureArg = process.argv.find((a) => a.startsWith("--fixture="));
const fixtureId = Number(fixtureArg?.split("=")[1] ?? process.env.API_SPORTS_PILOT_FIXTURE_ID ?? "1528284");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: partido, error } = await supabase
  .from("partidos")
  .select("id, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante, metadata")
  .eq("api_football_fixture_id", fixtureId)
  .maybeSingle();

if (error) {
  console.error("Error leyendo partido:", error.message);
  process.exit(1);
}

if (!partido) {
  console.error(`No hay partido con api_football_fixture_id=${fixtureId}`);
  process.exit(1);
}

const local = partido.marcador_local ?? 0;
const away = partido.marcador_visitante ?? 0;
const prev = partido.metadata?.gol_notify_score;

const metadata = {
  ...(typeof partido.metadata === "object" && partido.metadata !== null ? partido.metadata : {}),
  gol_notify_score: { local, away },
};

const { error: updateError } = await supabase
  .from("partidos")
  .update({ metadata, updated_at: new Date().toISOString() })
  .eq("id", partido.id);

if (updateError) {
  console.error("Error actualizando:", updateError.message);
  process.exit(1);
}

console.log(
  `OK ${partido.equipo_local_nombre} vs ${partido.equipo_visitante_nombre}`,
);
console.log(`  fixture=${fixtureId} marcador=${local}-${away}`);
console.log(`  gol_notify_score: ${JSON.stringify(prev ?? null)} → ${JSON.stringify(metadata.gol_notify_score)}`);
