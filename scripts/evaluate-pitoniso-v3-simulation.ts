/**
 * PITONISO-V3-SIMULATION-1 — Evaluación offline v2.1 vs v3 vs baselines.
 *
 * Ejecutar: npx -y tsx scripts/evaluate-pitoniso-v3-simulation.ts
 *
 * Anti-fuga: crowd filtrado por created_at < kickoff; forma/tabla solo partidos
 * finalizados antes del kickoff; sin statistics post-partido.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { computePickAggregates, type Outcome } from "@/lib/insights/pick-aggregates";
import { computeMatchPreviewVerdict } from "@/lib/sports-core/predictions/preview/match-preview";
import {
  computeClassificationPressure,
  computePitonisoV3SimulationVerdict,
  tournamentGoalInputFromStanding,
  type PitonisoV3SimulationInput,
} from "@/lib/sports-core/predictions/preview/v3-simulation";
import { lookupFifaRank } from "@/lib/sports-core/data/fifa-ranking-2026-06";
import { getFifaRankingSignal } from "@/lib/sports-core/predictions/preview/fifa-ranking-signal";
import {
  leaderFromCrowdOutcomes,
  leaderFromForm,
  leaderFromTable,
} from "@/lib/sports-core/predictions/preview/signals";
import {
  fetchGroupMiniStandings,
  fetchIsLastGroupMatch,
  fetchTeamCompetitionForm,
} from "@/lib/prediction-engine/team-competition-form";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

type ModelKey =
  | "v21"
  | "v3"
  | "baseline_fifa"
  | "baseline_crowd"
  | "baseline_table"
  | "baseline_form";

interface PartidoRow {
  id: string;
  fase: string;
  grupo: string | null;
  jornada: number | null;
  equipo_local_codigo: string;
  equipo_visitante_codigo: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  fecha_kickoff: string;
  estatus: string;
  marcador_local: number;
  marcador_visitante: number;
}

interface EvalRow {
  partido_id: string;
  partido: string;
  kickoff: string;
  actual: Outcome;
  v21: string;
  v3: string;
  v21_hit: boolean | null;
  v3_hit: boolean | null;
  v21_confidence: string;
  v3_confidence: string;
  crowd_n: number;
}

function loadEnvLocal(): void {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function actualOutcome(ml: number, mv: number): Outcome {
  if (ml > mv) return "local";
  if (mv > ml) return "visitante";
  return "empate";
}

function pct(hits: number, total: number): string {
  if (total === 0) return "n/a";
  return `${((hits / total) * 100).toFixed(1)}%`;
}

async function fetchPreKickoffCrowd(
  supabase: SupabaseClient,
  partidoId: string,
  kickoff: string,
) {
  const { data, error } = await supabase
    .from("pronosticos")
    .select("goles_local, goles_visitante, created_at")
    .eq("partido_id", partidoId)
    .eq("liga_id", LIGA_GLOBAL_ID)
    .lt("created_at", kickoff);

  if (error) throw new Error(error.message);
  return (
    data?.map((row) => ({
      golesLocal: row.goles_local as number,
      golesVisitante: row.goles_visitante as number,
    })) ?? []
  );
}

async function fetchTournamentGoalTotals(
  supabase: SupabaseClient,
  teamCode: string,
  beforeKickoff: string,
): Promise<{ gf: number; gc: number; played: number } | null> {
  const { data, error } = await supabase
    .from("partidos")
    .select(
      "equipo_local_codigo, equipo_visitante_codigo, marcador_local, marcador_visitante",
    )
    .eq("estatus", "finalizado")
    .lt("fecha_kickoff", beforeKickoff)
    .not("marcador_local", "is", null)
    .not("marcador_visitante", "is", null)
    .or(
      `equipo_local_codigo.eq.${teamCode},equipo_visitante_codigo.eq.${teamCode}`,
    );

  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  let gf = 0;
  let gc = 0;
  for (const row of data) {
    const isHome = row.equipo_local_codigo === teamCode;
    gf += isHome ? (row.marcador_local as number) : (row.marcador_visitante as number);
    gc += isHome ? (row.marcador_visitante as number) : (row.marcador_local as number);
  }
  return { gf, gc, played: data.length };
}

function baselineOutcome(
  key: ModelKey,
  input: PitonisoV3SimulationInput,
  aggregates: ReturnType<typeof computePickAggregates>,
): Outcome | null {
  if (key === "baseline_fifa") {
    const signal = getFifaRankingSignal(
      input.localCode ?? "",
      input.visitanteCode ?? "",
    );
    if (!signal || signal.leader === "neutral") return null;
    return signal.leader;
  }
  if (key === "baseline_crowd") {
    if (aggregates.total < 5) return null;
    const local = aggregates.outcomes.find((o) => o.outcome === "local")?.pct ?? 0;
    const draw = aggregates.outcomes.find((o) => o.outcome === "empate")?.pct ?? 0;
    const away = aggregates.outcomes.find((o) => o.outcome === "visitante")?.pct ?? 0;
    return leaderFromCrowdOutcomes(local, draw, away);
  }
  if (key === "baseline_table") {
    return leaderFromTable(input.local, input.visitante);
  }
  if (key === "baseline_form") {
    return leaderFromForm(input.local, input.visitante);
  }
  return null;
}

function bump(
  map: Map<string, { hits: number; total: number }>,
  key: string,
  hit: boolean,
) {
  const cur = map.get(key) ?? { hits: 0, total: 0 };
  cur.total += 1;
  if (hit) cur.hits += 1;
  map.set(key, cur);
}

function printTable(
  title: string,
  rows: { key: string; hits: number; total: number }[],
) {
  console.log(`\n${title}`);
  console.log("─".repeat(56));
  console.log(
    `${"Segmento".padEnd(28)} ${"Hits".padStart(6)} ${"Total".padStart(6)} ${"Acc".padStart(8)}`,
  );
  for (const row of rows) {
    console.log(
      `${row.key.padEnd(28)} ${String(row.hits).padStart(6)} ${String(row.total).padStart(6)} ${pct(row.hits, row.total).padStart(8)}`,
    );
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );

  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(
      "id, fase, grupo, jornada, equipo_local_codigo, equipo_visitante_codigo, equipo_local_nombre, equipo_visitante_nombre, fecha_kickoff, estatus, marcador_local, marcador_visitante",
    )
    .eq("estatus", "finalizado")
    .not("marcador_local", "is", null)
    .not("marcador_visitante", "is", null)
    .order("fecha_kickoff", { ascending: true });

  if (error) throw new Error(error.message);
  if (!partidos?.length) {
    console.log("No hay partidos finalizados.");
    return;
  }

  const evalRows: EvalRow[] = [];
  const modelStats = new Map<
    ModelKey,
    { hits: number; total: number; skipped: number }
  >();
  for (const k of [
    "v21",
    "v3",
    "baseline_fifa",
    "baseline_crowd",
    "baseline_table",
    "baseline_form",
  ] as ModelKey[]) {
    modelStats.set(k, { hits: 0, total: 0, skipped: 0 });
  }

  const byOutcomeActual = new Map<Outcome, { hits: number; total: number }>();
  const byConfidenceV21 = new Map<string, { hits: number; total: number }>();
  const byConfidenceV3 = new Map<string, { hits: number; total: number }>();
  const confusionV21 = new Map<string, number>();
  const confusionV3 = new Map<string, number>();

  let drawActual = 0;
  let drawPredV21 = 0;
  let drawPredV3 = 0;
  let drawHitV21 = 0;
  let drawHitV3 = 0;

  const v3Better: string[] = [];
  const v3Worse: string[] = [];

  for (const raw of partidos as PartidoRow[]) {
    const kickoff = raw.fecha_kickoff;
    const localCode = raw.equipo_local_codigo;
    const visitanteCode = raw.equipo_visitante_codigo;
    const isGroupPhase = raw.fase === "grupos";
    const actual = actualOutcome(raw.marcador_local, raw.marcador_visitante);

    const picks = await fetchPreKickoffCrowd(supabase, raw.id, kickoff);
    const aggregates = computePickAggregates(picks, null);

    const [localForm, visitanteForm, groupStandings, isLastGroupMatch] =
      await Promise.all([
        fetchTeamCompetitionForm(supabase, localCode, kickoff),
        fetchTeamCompetitionForm(supabase, visitanteCode, kickoff),
        raw.grupo && isGroupPhase
          ? fetchGroupMiniStandings(
              supabase,
              raw.grupo,
              localCode,
              visitanteCode,
              kickoff,
            )
          : Promise.resolve(null),
        raw.grupo && isGroupPhase
          ? fetchIsLastGroupMatch(supabase, raw.grupo, raw.jornada)
          : Promise.resolve(false),
      ]);

    const [localTotals, awayTotals] = await Promise.all([
      groupStandings?.teams.find((t) => t.teamId === localCode)
        ? Promise.resolve({
            gf: groupStandings!.teams.find((t) => t.teamId === localCode)!.goalsFor,
            gc: groupStandings!.teams.find((t) => t.teamId === localCode)!.goalsAgainst,
            played: groupStandings!.teams.find((t) => t.teamId === localCode)!.played,
          })
        : fetchTournamentGoalTotals(supabase, localCode, kickoff),
      groupStandings?.teams.find((t) => t.teamId === visitanteCode)
        ? Promise.resolve({
            gf: groupStandings!.teams.find((t) => t.teamId === visitanteCode)!.goalsFor,
            gc: groupStandings!.teams.find((t) => t.teamId === visitanteCode)!.goalsAgainst,
            played: groupStandings!.teams.find((t) => t.teamId === visitanteCode)!.played,
          })
        : fetchTournamentGoalTotals(supabase, visitanteCode, kickoff),
    ]);

    const localFifa = lookupFifaRank(localCode);
    const awayFifa = lookupFifaRank(visitanteCode);
    const rankingSignal = getFifaRankingSignal(localCode, visitanteCode);
    const groupSize = groupStandings?.groupSize ?? null;

    const v3Input: PitonisoV3SimulationInput = {
      aggregates,
      local: {
        tablePosition: groupStandings?.local?.position ?? null,
        groupSize,
        formNorm: localForm.formNorm,
        pointsFromTop2: groupStandings?.local?.pointsFromTop2 ?? null,
        fifaRank: localFifa?.rank ?? null,
        ...tournamentGoalInputFromStanding(
          localTotals
            ? {
                goalsFor: localTotals.gf,
                goalsAgainst: localTotals.gc,
                played: localTotals.played,
                goalDiff: localTotals.gf - localTotals.gc,
                position: groupStandings?.local?.position,
                pointsFromTop2: groupStandings?.local?.pointsFromTop2,
              }
            : null,
        ),
      },
      visitante: {
        tablePosition: groupStandings?.visitante?.position ?? null,
        groupSize,
        formNorm: visitanteForm.formNorm,
        pointsFromTop2: groupStandings?.visitante?.pointsFromTop2 ?? null,
        fifaRank: awayFifa?.rank ?? null,
        ...tournamentGoalInputFromStanding(
          awayTotals
            ? {
                goalsFor: awayTotals.gf,
                goalsAgainst: awayTotals.gc,
                played: awayTotals.played,
                goalDiff: awayTotals.gf - awayTotals.gc,
                position: groupStandings?.visitante?.position,
                pointsFromTop2: groupStandings?.visitante?.pointsFromTop2,
              }
            : null,
        ),
      },
      isGroupPhase,
      isKnockout: !isGroupPhase,
      isLastGroupMatch,
      localCode,
      visitanteCode,
      rankingSignal,
    };

    v3Input.local.classificationPressure = computeClassificationPressure(
      v3Input,
      "local",
    );
    v3Input.visitante.classificationPressure = computeClassificationPressure(
      v3Input,
      "visitante",
    );

    const v21 = computeMatchPreviewVerdict(v3Input);
    const v3 = computePitonisoV3SimulationVerdict(v3Input);

    const recordModel = (key: ModelKey, predicted: string | null) => {
      const st = modelStats.get(key)!;
      if (predicted == null || predicted === "unknown") {
        st.skipped += 1;
        return;
      }
      st.total += 1;
      if (predicted === actual) st.hits += 1;
    };

    recordModel("v21", v21.predictedOutcome);
    recordModel("v3", v3.predictedOutcome);

    for (const bk of [
      "baseline_fifa",
      "baseline_crowd",
      "baseline_table",
      "baseline_form",
    ] as ModelKey[]) {
      recordModel(bk, baselineOutcome(bk, v3Input, aggregates));
    }

    if (actual === "empate") drawActual += 1;

    if (v21.predictedOutcome !== "unknown") {
      const hit = v21.predictedOutcome === actual;
      bump(byOutcomeActual, actual, hit);
      bump(byConfidenceV21, v21.confidence, hit);
      confusionV21.set(
        `${actual}->${v21.predictedOutcome}`,
        (confusionV21.get(`${actual}->${v21.predictedOutcome}`) ?? 0) + 1,
      );
      if (v21.predictedOutcome === "empate") {
        drawPredV21 += 1;
        if (actual === "empate") drawHitV21 += 1;
      }
    }

    if (v3.predictedOutcome !== "unknown") {
      const hit = v3.predictedOutcome === actual;
      bump(byConfidenceV3, v3.confidence, hit);
      confusionV3.set(
        `${actual}->${v3.predictedOutcome}`,
        (confusionV3.get(`${actual}->${v3.predictedOutcome}`) ?? 0) + 1,
      );
      if (v3.predictedOutcome === "empate") {
        drawPredV3 += 1;
        if (actual === "empate") drawHitV3 += 1;
      }
    }

    const v21Hit =
      v21.predictedOutcome === "unknown" ? null : v21.predictedOutcome === actual;
    const v3Hit =
      v3.predictedOutcome === "unknown" ? null : v3.predictedOutcome === actual;

    if (v21Hit === false && v3Hit === true) {
      v3Better.push(`${raw.equipo_local_nombre} vs ${raw.equipo_visitante_nombre}`);
    }
    if (v21Hit === true && v3Hit === false) {
      v3Worse.push(`${raw.equipo_local_nombre} vs ${raw.equipo_visitante_nombre}`);
    }

    evalRows.push({
      partido_id: raw.id,
      partido: `${raw.equipo_local_nombre} vs ${raw.equipo_visitante_nombre}`,
      kickoff,
      actual,
      v21: v21.predictedOutcome,
      v3: v3.predictedOutcome,
      v21_hit: v21Hit,
      v3_hit: v3Hit,
      v21_confidence: v21.confidence,
      v3_confidence: v3.confidence,
      crowd_n: aggregates.total,
    });
  }

  const v21s = modelStats.get("v21")!;
  const v3s = modelStats.get("v3")!;

  console.log("PITONISO V3 SIMULATION — Evaluación offline (anti-fuga)\n");
  console.log(`Partidos finalizados:     ${partidos.length}`);
  console.log(`Crowd pre-kickoff:       created_at < fecha_kickoff`);
  console.log(`Forma/tabla/GF/GC:      solo partidos antes del kickoff\n`);

  console.log("Accuracy 1X2:");
  console.log(
    `  Pitoniso v2.1:          ${pct(v21s.hits, v21s.total)} (${v21s.hits}/${v21s.total}, skipped=${v21s.skipped})`,
  );
  console.log(
    `  Pitoniso v3 sim:        ${pct(v3s.hits, v3s.total)} (${v3s.hits}/${v3s.total}, skipped=${v3s.skipped})`,
  );
  for (const bk of [
    "baseline_fifa",
    "baseline_crowd",
    "baseline_table",
    "baseline_form",
  ] as ModelKey[]) {
    const st = modelStats.get(bk)!;
    console.log(
      `  ${bk.padEnd(22)} ${pct(st.hits, st.total)} (${st.hits}/${st.total}, skipped=${st.skipped})`,
    );
  }

  const delta =
    v3s.total > 0 && v21s.total > 0
      ? (v3s.hits / v3s.total - v21s.hits / v21s.total) * 100
      : 0;
  console.log(`\nDelta v3 vs v2.1:         ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pp`);

  console.log("\nEmpates:");
  console.log(`  Reales:                 ${drawActual}`);
  console.log(
    `  v2.1 pred=empate:       ${drawPredV21} (aciertos ${drawHitV21})`,
  );
  console.log(
    `  v3 pred=empate:         ${drawPredV3} (aciertos ${drawHitV3})`,
  );

  printTable(
    "v2.1 por confidence",
    [...byConfidenceV21.entries()].map(([key, v]) => ({ key, ...v })),
  );
  printTable(
    "v3 por confidence",
    [...byConfidenceV3.entries()].map(([key, v]) => ({ key, ...v })),
  );

  console.log("\nMatriz errores v2.1 (actual->pred):");
  for (const [k, n] of [...confusionV21.entries()].sort()) {
    console.log(`  ${k}: ${n}`);
  }
  console.log("\nMatriz errores v3 (actual->pred):");
  for (const [k, n] of [...confusionV3.entries()].sort()) {
    console.log(`  ${k}: ${n}`);
  }

  console.log(`\nv3 mejora vs v2.1 (${v3Better.length}):`);
  for (const m of v3Better) console.log(`  + ${m}`);
  console.log(`\nv3 empeora vs v2.1 (${v3Worse.length}):`);
  for (const m of v3Worse) console.log(`  - ${m}`);

  console.log("\nÚltimos 8 partidos:");
  for (const row of evalRows.slice(-8)) {
    const m21 = row.v21_hit === null ? "—" : row.v21_hit ? "✓" : "✗";
    const m3 = row.v3_hit === null ? "—" : row.v3_hit ? "✓" : "✗";
    console.log(
      `  ${row.partido.padEnd(32)} actual=${row.actual.padEnd(10)} v21=${m21} v3=${m3} crowd=${row.crowd_n}`,
    );
  }

  // Write report markdown
  const reportPath = path.join(ROOT, "PITONISO_V3_SIMULATION_REPORT.md");
  const report = `# PITONISO V3 SIMULATION — Reporte offline

**Fecha:** ${new Date().toISOString().slice(0, 10)}  
**Script:** \`scripts/evaluate-pitoniso-v3-simulation.ts\`  
**Motor:** \`src/lib/sports-core/predictions/preview/v3-simulation.ts\`

## Metodología anti-fuga

- Crowd: pronósticos con \`created_at < fecha_kickoff\`
- Forma, tabla, GF/GC: partidos \`finalizado\` con kickoff anterior
- Sin \`/fixtures/statistics\` ni datos post-partido en predicción
- Ranking FIFA: snapshot estático (misma limitación que v2)

## Resultados

| Modelo | Accuracy | Evaluados | Skipped |
|--------|----------|-----------|---------|
| Pitoniso v2.1 | ${pct(v21s.hits, v21s.total)} | ${v21s.total} | ${v21s.skipped} |
| Pitoniso v3 sim | ${pct(v3s.hits, v3s.total)} | ${v3s.total} | ${v3s.skipped} |
| Baseline FIFA | ${pct(modelStats.get("baseline_fifa")!.hits, modelStats.get("baseline_fifa")!.total)} | ${modelStats.get("baseline_fifa")!.total} | ${modelStats.get("baseline_fifa")!.skipped} |
| Baseline crowd | ${pct(modelStats.get("baseline_crowd")!.hits, modelStats.get("baseline_crowd")!.total)} | ${modelStats.get("baseline_crowd")!.total} | ${modelStats.get("baseline_crowd")!.skipped} |
| Baseline table | ${pct(modelStats.get("baseline_table")!.hits, modelStats.get("baseline_table")!.total)} | ${modelStats.get("baseline_table")!.total} | ${modelStats.get("baseline_table")!.skipped} |
| Baseline form | ${pct(modelStats.get("baseline_form")!.hits, modelStats.get("baseline_form")!.total)} | ${modelStats.get("baseline_form")!.total} | ${modelStats.get("baseline_form")!.skipped} |

**Delta v3 vs v2.1:** ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pp

## Empates

- Reales: ${drawActual}
- v2.1 pred=empate: ${drawPredV21} (aciertos ${drawHitV21})
- v3 pred=empate: ${drawPredV3} (aciertos ${drawHitV3})

## v3 vs v2.1

**Mejora (${v3Better.length}):** ${v3Better.length ? v3Better.join("; ") : "—"}

**Empeora (${v3Worse.length}):** ${v3Worse.length ? v3Worse.join("; ") : "—"}

## Matriz v3 (actual→pred)

${[...confusionV3.entries()].sort().map(([k, n]) => `- \`${k}\`: ${n}`).join("\n")}

## Recomendación

${delta > 1 ? "**Ajustar e integrar** — v3 supera v2.1 en muestra actual; calibrar pesos goalForm/stakes antes de prod." : delta < -1 ? "**Descartar o revisar pesos** — v3 empeora vs v2.1; no integrar sin recalibración." : "**Ajustar** — delta marginal; mantener v2.1 en prod, iterar v3 offline con más jornadas."}

## Limitaciones

- Muestra pequeña (${partidos.length} partidos finalizados)
- Crowd pre-kickoff puede ser bajo en jornada 1
- FIFA snapshot no temporal

## Reproducir

\`\`\`bash
npx -y tsx scripts/evaluate-pitoniso-v3-simulation.ts
\`\`\`
`;
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(`\nReporte escrito: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
