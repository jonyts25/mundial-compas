#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data } = await sb
  .from("partidos")
  .select(
    "fase, estatus, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, metadata, fecha_kickoff",
  )
  .neq("fase", "grupos")
  .order("fecha_kickoff");

const byPhase = {};
for (const p of data ?? []) {
  const phase = p.fase;
  if (!byPhase[phase]) byPhase[phase] = { total: 0, confirmed: 0, tbd: 0 };
  byPhase[phase].total += 1;
  const tbd =
    ["TBD", "TBD2"].includes(p.equipo_local_codigo) ||
    ["TBD", "TBD2"].includes(p.equipo_visitante_codigo);
  if (tbd) byPhase[phase].tbd += 1;
  else byPhase[phase].confirmed += 1;
}

console.log(JSON.stringify(byPhase, null, 2));
