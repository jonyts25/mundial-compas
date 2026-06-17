/**
 * Evaluación interna Pitoniso v2 — 1X2 vs resultados finalizados.
 *
 * Ejecutar: npx -y tsx scripts/evaluate-pitoniso-v2.ts
 *
 * Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * LIMITACIÓN: sin snapshot pre-partido guardado, usa ranking actual + pronósticos
 * actuales de la quiniela → aproximación retrospectiva, no ground truth histórico.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { LIGA_GLOBAL_ID } from "@/lib/constants";
import { computePickAggregates } from "@/lib/insights/pick-aggregates";
import type { Outcome } from "@/lib/insights/pick-aggregates";
import { computeMatchPreviewVerdict } from "@/lib/prediction-engine/match-preview";
import { intuitionSeed } from "@/lib/prediction-engine/pitoniso-intuition";
import {
  fetchGroupMiniStandings,
  fetchIsLastGroupMatch,
  fetchTeamCompetitionForm,
} from "@/lib/prediction-engine/team-competition-form";
import { lookupFifaRank } from "@/lib/sports-core/data/fifa-ranking-2026-06";
import {
  getFifaRankingSignal,
  rankingSignalAnalyticsValue,
} from "@/lib/sports-core/predictions/preview/fifa-ranking-signal";
import type { MatchPreviewConfidence } from "@/lib/sports-core/predictions/preview/match-preview";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function fifaBaselineOutcome(
  localCode: string,
  visitanteCode: string,
): Outcome | null {
  const signal = getFifaRankingSignal(localCode, visitanteCode);
  if (!signal || signal.leader === "neutral") return null;
  return signal.leader;
}

interface EvalRow {
  partido_id: string;
  partido: string;
  actual: Outcome;
  predicted: string;
  confidence: MatchPreviewConfidence;
  ranking_signal: string;
  intuition: string;
  hit: boolean | null;
  fifa_baseline_hit: boolean | null;
}

function pct(hits: number, total: number): string {
  if (total === 0) return "n/a";
  return `${((hits / total) * 100).toFixed(1)}%`;
}

function printTable(title: string, rows: { key: string; hits: number; total: number }[]) {
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
    console.log("No hay partidos finalizados para evaluar.");
    return;
  }

  const evalRows: EvalRow[] = [];
  const byConfidence = new Map<string, { hits: number; total: number }>();
  const byRanking = new Map<string, { hits: number; total: number }>();
  const byIntuition = new Map<string, { hits: number; total: number }>();

  let totalEvaluated = 0;
  let totalHits = 0;
  let skippedUnknown = 0;
  let fifaBaselineHits = 0;
  let fifaBaselineTotal = 0;

  for (const p of partidos) {
    const ml = p.marcador_local as number;
    const mv = p.marcador_visitante as number;
    const actual = actualOutcome(ml, mv);
    const kickoff = p.fecha_kickoff as string;
    const localCode = p.equipo_local_codigo as string;
    const visitanteCode = p.equipo_visitante_codigo as string;
    const isGroupPhase = p.fase === "grupos";

    const [localForm, visitanteForm, groupStandings, isLastGroupMatch] =
      await Promise.all([
        fetchTeamCompetitionForm(supabase, localCode, kickoff),
        fetchTeamCompetitionForm(supabase, visitanteCode, kickoff),
        p.grupo && isGroupPhase
          ? fetchGroupMiniStandings(
              supabase,
              p.grupo as string,
              localCode,
              visitanteCode,
              kickoff,
            )
          : Promise.resolve(null),
        p.grupo && isGroupPhase
          ? fetchIsLastGroupMatch(supabase, p.grupo as string, p.jornada as number | null)
          : Promise.resolve(false),
      ]);

    const groupSize = groupStandings?.groupSize ?? null;
    const localFifa = lookupFifaRank(localCode);
    const awayFifa = lookupFifaRank(visitanteCode);
    const rankingSignal = getFifaRankingSignal(localCode, visitanteCode);

    const { data: pronosticos } = await supabase
      .from("pronosticos")
      .select("goles_local, goles_visitante")
      .eq("partido_id", p.id as string)
      .eq("liga_id", LIGA_GLOBAL_ID);

    const picks =
      pronosticos?.map((row) => ({
        golesLocal: row.goles_local as number,
        golesVisitante: row.goles_visitante as number,
      })) ?? [];

    const aggregates = computePickAggregates(picks, null);
    const verdict = computeMatchPreviewVerdict({
      aggregates,
      local: {
        tablePosition: groupStandings?.local?.position ?? null,
        groupSize,
        formNorm: localForm.formNorm,
        pointsFromTop2: groupStandings?.local?.pointsFromTop2 ?? null,
        fifaRank: localFifa?.rank ?? null,
      },
      visitante: {
        tablePosition: groupStandings?.visitante?.position ?? null,
        groupSize,
        formNorm: visitanteForm.formNorm,
        pointsFromTop2: groupStandings?.visitante?.pointsFromTop2 ?? null,
        fifaRank: awayFifa?.rank ?? null,
      },
      isGroupPhase,
      isKnockout: !isGroupPhase,
      isLastGroupMatch,
      localCode,
      visitanteCode,
      rankingSignal,
    });

    const intuition = intuitionSeed(p.id as string);
    const rankingKey = rankingSignalAnalyticsValue(verdict.rankingSignal);

    const baseline = fifaBaselineOutcome(localCode, visitanteCode);
    if (baseline) {
      fifaBaselineTotal += 1;
      if (baseline === actual) fifaBaselineHits += 1;
    }

    if (verdict.predictedOutcome === "unknown") {
      skippedUnknown += 1;
      evalRows.push({
        partido_id: p.id as string,
        partido: `${p.equipo_local_nombre} vs ${p.equipo_visitante_nombre}`,
        actual,
        predicted: "unknown",
        confidence: verdict.confidence,
        ranking_signal: rankingKey,
        intuition,
        hit: null,
        fifa_baseline_hit: baseline === actual,
      });
      continue;
    }

    const hit = verdict.predictedOutcome === actual;
    totalEvaluated += 1;
    if (hit) totalHits += 1;

    const bump = (map: Map<string, { hits: number; total: number }>, key: string) => {
      const cur = map.get(key) ?? { hits: 0, total: 0 };
      cur.total += 1;
      if (hit) cur.hits += 1;
      map.set(key, cur);
    };

    bump(byConfidence, verdict.confidence);
    bump(byRanking, rankingKey);
    bump(byIntuition, intuition);

    evalRows.push({
      partido_id: p.id as string,
      partido: `${p.equipo_local_nombre} vs ${p.equipo_visitante_nombre}`,
      actual,
      predicted: verdict.predictedOutcome,
      confidence: verdict.confidence,
      ranking_signal: rankingKey,
      intuition,
      hit,
      fifa_baseline_hit: baseline === actual,
    });
  }

  console.log("PITONISO V2 — Evaluación 1X2 (interna)\n");
  console.log(`Partidos finalizados:     ${partidos.length}`);
  console.log(`Evaluados (≠ unknown):    ${totalEvaluated}`);
  console.log(`Skipped (indeciso):       ${skippedUnknown}`);
  console.log(`Aciertos:                 ${totalHits}`);
  console.log(`Accuracy Pitoniso v2:     ${pct(totalHits, totalEvaluated)}`);
  console.log(
    `Baseline FIFA ranking:    ${pct(fifaBaselineHits, fifaBaselineTotal)} (${fifaBaselineHits}/${fifaBaselineTotal})`,
  );

  printTable(
    "Accuracy por confidence",
    [...byConfidence.entries()].map(([key, v]) => ({ key, ...v })),
  );
  printTable(
    "Accuracy por ranking_signal",
    [...byRanking.entries()].map(([key, v]) => ({ key, ...v })),
  );
  printTable(
    "Accuracy por intuition_signal",
    [...byIntuition.entries()].map(([key, v]) => ({ key, ...v })),
  );

  console.log("\nDetalle (últimos 15):");
  console.log("─".repeat(90));
  for (const row of evalRows.slice(-15)) {
    const mark = row.hit === null ? "—" : row.hit ? "✓" : "✗";
    console.log(
      `${mark} ${row.partido.padEnd(36)} actual=${row.actual.padEnd(10)} pred=${row.predicted.padEnd(10)} conf=${row.confidence}`,
    );
  }

  console.log(
    "\n⚠️  Sin snapshot pre-partido: ranking y quiniela actuales pueden contaminar la evaluación.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
