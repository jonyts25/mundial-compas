/**
 * Audita partidos de hoy: hora CDMX vs cierre quiniela.
 * node scripts/audit-kickoff-today.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const MEXICO_TZ = "America/Mexico_City";
const LOCK_MS = 5 * 60 * 1000;

function fmt(iso) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TZ,
    dateStyle: "short",
    timeStyle: "short",
    hour12: true,
  }).format(new Date(iso));
}

function todayMexico() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const now = Date.now();
const hoy = todayMexico();

const { data, error } = await supabase
  .from("partidos")
  .select(
    "id, api_football_fixture_id, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, fase, jornada, metadata",
  )
  .order("fecha_kickoff");

if (error) {
  console.error(error);
  process.exit(1);
}

const todayMatches = (data ?? []).filter((p) => {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(p.fecha_kickoff));
  return key === hoy;
});

console.log(`Hoy CDMX: ${hoy} | Ahora: ${fmt(new Date().toISOString())}`);
console.log(`Partidos hoy: ${todayMatches.length}\n`);

for (const p of todayMatches) {
  const kick = new Date(p.fecha_kickoff).getTime();
  const lockAt = kick - LOCK_MS;
  const locked = now >= lockAt;
  console.log(`${p.equipo_local_nombre} vs ${p.equipo_visitante_nombre}`);
  console.log(`  kickoff raw: ${p.fecha_kickoff}`);
  console.log(`  CDMX: ${fmt(p.fecha_kickoff)} | estatus: ${p.estatus}`);
  console.log(`  quiniela: ${locked ? "CERRADA" : "ABIERTA"} (cierra ${fmt(new Date(lockAt).toISOString())})`);
  console.log(`  id: ${p.id}`);
  console.log("");
}
