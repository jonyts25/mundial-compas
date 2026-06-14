/**
 * Pick aggregates — IA falsa #1 (Sprint 1 · Fase B).
 *
 * Cálculo 100% determinístico, en TypeScript puro, sobre datos YA disponibles
 * (los pronósticos que `fetchPronosticosPartidoTodos` ya entrega al cliente).
 *
 * Restricciones cumplidas:
 *  - Solo lectura. No toca scoring, pronósticos, tablas, migraciones ni vistas.
 *  - Sin IA, sin LLM, sin APIs externas.
 *  - Reversible: borrar este archivo + su uso deja todo igual.
 *
 * No recibe PII: solo marcadores y un flag `esYo`.
 */

/** Resultado 1X2 normalizado desde la perspectiva del equipo local. */
export type Outcome = "local" | "empate" | "visitante";

/** Entrada mínima por participante (sin nombres ni IDs → sin PII). */
export interface PickInput {
  golesLocal: number;
  golesVisitante: number;
  /** Marca el pronóstico del usuario actual (para "tu marcador"). */
  esYo?: boolean;
}

/** Marcador real del partido (null si aún no finalizó / sin marcador). */
export interface RealScore {
  local: number;
  visitante: number;
}

/** Distribución de un marcador exacto concreto. */
export interface ScoreBucket {
  local: number;
  visitante: number;
  count: number;
  /** Porcentaje 0–100 redondeado al entero (para UI tipo "23%"). */
  pct: number;
}

/** Distribución de un resultado 1X2. */
export interface OutcomeBucket {
  outcome: Outcome;
  count: number;
  pct: number;
}

export interface PickAggregates {
  /** Total de pronósticos considerados. */
  total: number;
  /** Distribución de marcadores exactos, orden descendente por popularidad. */
  exactScores: ScoreBucket[];
  /** Distribución 1X2 en orden fijo: local, empate, visitante. */
  outcomes: OutcomeBucket[];
  /** Marcador exacto más elegido (null si no hay pronósticos). */
  mostPopularScore: ScoreBucket | null;
  /** Resultado 1X2 más elegido (null si no hay pronósticos). */
  mostPopularOutcome: OutcomeBucket | null;
  /** % que eligió el marcador del usuario actual (null si no hay pick propio). */
  userScoreSharePct: number | null;
  /** Marcador del usuario actual (null si no pronosticó). */
  userScore: { local: number; visitante: number } | null;
  /**
   * % que acertó el marcador EXACTO real (null si el partido no tiene
   * marcador real disponible).
   */
  exactMatchPct: number | null;
  /** true/false si el usuario acertó el marcador exacto (null si no aplica). */
  userMatchedExact: boolean | null;
}

function outcomeOf(golesLocal: number, golesVisitante: number): Outcome {
  if (golesLocal > golesVisitante) return "local";
  if (golesLocal < golesVisitante) return "visitante";
  return "empate";
}

function pct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Calcula los agregados de picks a partir de la lista de pronósticos.
 * Función pura: mismas entradas → mismas salidas, sin efectos secundarios.
 */
export function computePickAggregates(
  participantes: ReadonlyArray<PickInput>,
  resultadoReal: RealScore | null = null,
): PickAggregates {
  const total = participantes.length;

  const empty: PickAggregates = {
    total: 0,
    exactScores: [],
    outcomes: [
      { outcome: "local", count: 0, pct: 0 },
      { outcome: "empate", count: 0, pct: 0 },
      { outcome: "visitante", count: 0, pct: 0 },
    ],
    mostPopularScore: null,
    mostPopularOutcome: null,
    userScoreSharePct: null,
    userScore: null,
    exactMatchPct: null,
    userMatchedExact: null,
  };

  if (total === 0) return empty;

  const scoreCounts = new Map<string, { local: number; visitante: number; count: number }>();
  const outcomeCounts: Record<Outcome, number> = { local: 0, empate: 0, visitante: 0 };

  let userScore: { local: number; visitante: number } | null = null;

  for (const p of participantes) {
    const key = `${p.golesLocal}-${p.golesVisitante}`;
    const prev = scoreCounts.get(key);
    if (prev) {
      prev.count += 1;
    } else {
      scoreCounts.set(key, {
        local: p.golesLocal,
        visitante: p.golesVisitante,
        count: 1,
      });
    }

    outcomeCounts[outcomeOf(p.golesLocal, p.golesVisitante)] += 1;

    if (p.esYo && userScore === null) {
      userScore = { local: p.golesLocal, visitante: p.golesVisitante };
    }
  }

  // Orden determinístico: más popular primero; desempate por marcador asc.
  const exactScores: ScoreBucket[] = Array.from(scoreCounts.values())
    .map((b) => ({ ...b, pct: pct(b.count, total) }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.local - b.local ||
        a.visitante - b.visitante,
    );

  const outcomes: OutcomeBucket[] = (["local", "empate", "visitante"] as const).map(
    (outcome) => ({
      outcome,
      count: outcomeCounts[outcome],
      pct: pct(outcomeCounts[outcome], total),
    }),
  );

  const mostPopularOutcome = outcomes.reduce<OutcomeBucket | null>((best, cur) => {
    if (!best) return cur;
    return cur.count > best.count ? cur : best;
  }, null);

  // % que eligió el marcador del usuario actual.
  let userScoreSharePct: number | null = null;
  if (userScore) {
    const key = `${userScore.local}-${userScore.visitante}`;
    const bucket = scoreCounts.get(key);
    userScoreSharePct = pct(bucket?.count ?? 0, total);
  }

  // Aciertos del marcador exacto real.
  let exactMatchPct: number | null = null;
  let userMatchedExact: boolean | null = null;
  if (resultadoReal) {
    const key = `${resultadoReal.local}-${resultadoReal.visitante}`;
    const bucket = scoreCounts.get(key);
    exactMatchPct = pct(bucket?.count ?? 0, total);
    userMatchedExact =
      userScore != null &&
      userScore.local === resultadoReal.local &&
      userScore.visitante === resultadoReal.visitante;
  }

  return {
    total,
    exactScores,
    outcomes,
    mostPopularScore: exactScores[0] ?? null,
    mostPopularOutcome,
    userScoreSharePct,
    userScore,
    exactMatchPct,
    userMatchedExact,
  };
}

/** Etiqueta corta para un resultado 1X2 (UI). */
export function outcomeLabel(outcome: Outcome): string {
  switch (outcome) {
    case "local":
      return "Local";
    case "empate":
      return "Empate";
    case "visitante":
      return "Visitante";
  }
}
