/**
 * Inserta trivia extra en datos_mamalones (no borra las existentes).
 * node scripts/seed-datos-mamalones-expansion.mjs
 * node scripts/seed-datos-mamalones-expansion.mjs supabase/seeds/datos_mamalones_mexico.json
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

const seedFile =
  process.argv[2] ?? "supabase/seeds/datos_mamalones_expansion.json";

const rows = JSON.parse(readFileSync(seedFile, "utf8"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const payload = rows.map((r) => ({
  tipo: r.tipo,
  titulo: r.titulo,
  contenido: r.contenido,
  mundial_anio: r.mundial_anio,
  tags: r.tags,
  contexto: r.contexto,
  prioridad: r.prioridad ?? 5,
  activo: true,
  metadata: r.metadata ?? {},
}));

const { data, error } = await supabase.from("datos_mamalones").insert(payload).select("id");

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log(`✅ ${data?.length ?? payload.length} datos insertados desde ${seedFile}`);
