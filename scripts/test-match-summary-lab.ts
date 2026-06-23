/**
 * Smoke test: builder + Ollama para resumen post-partido (MATCH-SUMMARY-LAB-1).
 *
 * Uso:
 *   npm run test:match-summary
 *   PARTIDO_ID=<uuid> npm run test:match-summary
 */
import { loadEnvLocal } from "./load-env-local.mjs";
import { createClient } from "@supabase/supabase-js";
import { buildMatchSummaryInput } from "../src/lib/ai/match-summary/build-match-summary-input";
import {
  buildMatchSummaryPrompt,
  isMatchSummaryOutput,
  normalizeMatchSummaryOutput,
} from "../src/lib/ai/match-summary/match-summary-prompt";
import { getAiConfig } from "../src/lib/ai/ai-config";
import { ollamaJson } from "../src/lib/ai/ollama-client";
import { DEFAULT_NARRATOR_PERSONA_ID } from "../src/lib/ai/sports-narrator-personas";

loadEnvLocal();

const personaId = DEFAULT_NARRATOR_PERSONA_ID;
const partidoIdArg = process.env.PARTIDO_ID?.trim();

const REAL_COMMENTATOR_PATTERNS = [
  /\bcl[eé]ber\s+machado\b/i,
  /\bchristian\s+mart[ií]noli\b/i,
  /\bjos[eé]\s+ram[oó]n\s+fern[aá]ndez\b/i,
  /\bfernando\s+colombo\b/i,
  /\bmariano\s+closs\b/i,
];

const STATS_PATTERNS = [
  /\bposesi[oó]n\b/i,
  /\bxg\b/i,
  /\btiros\s+a\s+puerta\b/i,
  /\bcorners?\b/i,
  /\bdomin[oó]\b/i,
];

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function pass(msg: string) {
  console.log(`✓ ${msg}`);
}

async function pickFinalizadoPartidoId(): Promise<string> {
  if (partidoIdArg) return partidoIdArg;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    fail("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("partidos")
    .select("id, equipo_local_nombre, equipo_visitante_nombre, marcador_local, marcador_visitante")
    .eq("estatus", "finalizado")
    .not("marcador_local", "is", null)
    .not("marcador_visitante", "is", null)
    .order("fecha_kickoff", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) fail(`Supabase: ${error.message}`);
  if (!data?.id) fail("No hay partidos finalizados en DB");

  console.log(
    `Partido: ${data.equipo_local_nombre} vs ${data.equipo_visitante_nombre} (${data.marcador_local}-${data.marcador_visitante})`,
  );
  console.log(`partido_id: ${data.id}\n`);
  return data.id;
}

function assertOutputGuards(
  output: ReturnType<typeof normalizeMatchSummaryOutput>,
  statisticsNull: boolean,
  hasVarInTimeline: boolean,
) {
  const blob = JSON.stringify(output);

  if (!output.facts?.length) fail("facts[] vacío");
  pass("facts[] presente");

  if (!hasVarInTimeline) {
    if (/\bvar\b/i.test(blob) || /videoarbitraje/i.test(blob)) {
      fail("menciona VAR sin evento VAR en input");
    }
    pass("sin mención VAR (input sin VAR)");
  }

  if (statisticsNull) {
    for (const pattern of STATS_PATTERNS) {
      if (pattern.test(blob)) {
        fail(`menciona estadísticas con statistics=null: ${pattern}`);
      }
    }
    pass("sin mención de estadísticas (statistics=null)");
  }

  for (const pattern of REAL_COMMENTATOR_PATTERNS) {
    if (pattern.test(blob)) {
      fail(`posible comentarista real: ${pattern}`);
    }
  }
  pass("sin comentaristas reales detectados");
}

async function main() {
  console.log("=== test-match-summary-lab ===\n");

  const partidoId = await pickFinalizadoPartidoId();

  const built = await buildMatchSummaryInput(partidoId, { persona_id: personaId });
  if (!built.ok) fail(`builder: ${built.error}`);

  const input = built.input;
  pass(`builder OK — ${input.data_gaps.length} data_gaps`);
  console.log(`data_gaps: ${input.data_gaps.join(", ") || "(ninguno)"}`);

  const cfg = getAiConfig();
  const result = await ollamaJson({
    model: cfg.modelSpanish,
    messages: [
      {
        role: "system",
        content:
          "Solo JSON válido. No inventes datos. No imites comentaristas reales.",
      },
      { role: "user", content: buildMatchSummaryPrompt(input) },
    ],
    validate: (value) =>
      isMatchSummaryOutput(value, {
        partido_id: input.partido_id,
        persona_id: input.persona_id,
      }),
  });

  if (!result.ok) {
    fail(`Ollama: ${result.error}${result.rawPreview ? ` — ${result.rawPreview.slice(0, 200)}` : ""}`);
  }

  const output = normalizeMatchSummaryOutput(result.data);
  pass(`Ollama JSON válido (modelo ${result.model})`);

  const hasVar = input.timeline.some((e) =>
    String(e.detail ?? "").toLowerCase().includes("var"),
  );
  assertOutputGuards(output, input.statistics === null, hasVar);

  console.log("\n--- headline ---");
  console.log(output.headline);
  console.log("\n--- lede ---");
  console.log(output.lede);
  console.log("\n--- facts ---");
  for (const f of output.facts) console.log(`• ${f}`);

  console.log("\nListo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
