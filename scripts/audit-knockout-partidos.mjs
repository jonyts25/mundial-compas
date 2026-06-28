import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const { data, error } = await sb
  .from("partidos")
  .select(
    "id,fase,estatus,equipo_local_codigo,equipo_visitante_codigo,equipo_local_nombre,equipo_visitante_nombre,api_football_fixture_id,metadata,fecha_kickoff",
  );

if (error) {
  console.error(error);
  process.exit(1);
}

const byFase = {};
const byEstatus = {};
for (const p of data) {
  byFase[p.fase] = (byFase[p.fase] || 0) + 1;
  byEstatus[p.estatus] = (byEstatus[p.estatus] || 0) + 1;
}

const ko = data.filter((p) => p.fase !== "grupos");
const tbd = ko.filter(
  (p) =>
    ["TBD", "TBD2"].includes(p.equipo_local_codigo) ||
    ["TBD", "TBD2"].includes(p.equipo_visitante_codigo) ||
    /por definir/i.test(p.equipo_local_nombre ?? "") ||
    /por definir/i.test(p.equipo_visitante_nombre ?? ""),
);

const dupFix = new Map();
for (const p of data) {
  if (p.api_football_fixture_id) {
    dupFix.set(
      p.api_football_fixture_id,
      (dupFix.get(p.api_football_fixture_id) || 0) + 1,
    );
  }
}
const dups = [...dupFix.entries()].filter(([, c]) => c > 1);

const withMatchNum = ko.filter((p) => p.metadata?.fifa_match_number != null);
const withApi = ko.filter((p) => p.api_football_fixture_id && p.api_football_fixture_id < 9_000_000);

console.log(JSON.stringify({
  total: data.length,
  byFase,
  byEstatus,
  knockout: ko.length,
  knockoutTbd: tbd.length,
  knockoutWithFifaMatchNum: withMatchNum.length,
  knockoutWithRealApiId: withApi.length,
  duplicateFixtureIds: dups.length,
  knockoutPhases: Object.fromEntries(
    [...new Set(ko.map((p) => p.fase))].map((f) => [
      f,
      ko.filter((p) => p.fase === f).length,
    ]),
  ),
}, null, 2));
