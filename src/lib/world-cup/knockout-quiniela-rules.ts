/**
 * Reglas de marcador para quiniela en fase eliminatoria (producto).
 * Scoring en BD usa marcador_local / marcador_visitante vía calcular_puntos_pronostico.
 */

export const KNOCKOUT_QUINIELA_RULES_SHORT =
  "En fase final, tu pronóstico cuenta hasta el final del partido. Si hay tiempo extra, cuenta el marcador tras 120'. Si se define en penales, el marcador de quiniela sigue siendo empate; los penales solo definen quién avanza.";

export const KNOCKOUT_QUINIELA_RULES_COMPACT =
  "Marcador oficial al pitazo final (120' si hay TE). Penales no cuentan en quiniela.";

/** Replica SQL calcular_puntos_pronostico (3 exacto, 1 tendencia, 0). */
export function calcularPuntosPronostico(
  marcadorLocal: number,
  marcadorVisitante: number,
  predLocal: number,
  predVisitante: number,
): number {
  if (marcadorLocal === predLocal && marcadorVisitante === predVisitante) {
    return 3;
  }
  const diff = Math.sign(marcadorLocal - marcadorVisitante);
  const predDiff = Math.sign(predLocal - predVisitante);
  return diff === predDiff ? 1 : 0;
}

export type QuinielaMarcadorSide = { local: number; visitante: number };

/**
 * Marcador que usa la quiniela = goals API-Sports (reglamentario + TE, sin tanda).
 * Penales van en score.penalty y no deben mezclarse aquí.
 */
export function resolveQuinielaMarcadorFromApiGoals(input: {
  goalsHome: number | null;
  goalsAway: number | null;
  extratimeHome?: number | null;
  extratimeAway?: number | null;
  fulltimeHome?: number | null;
  fulltimeAway?: number | null;
}): QuinielaMarcadorSide | null {
  if (input.extratimeHome != null && input.extratimeAway != null) {
    return { local: input.extratimeHome, visitante: input.extratimeAway };
  }
  if (input.goalsHome != null && input.goalsAway != null) {
    return { local: input.goalsHome, visitante: input.goalsAway };
  }
  if (input.fulltimeHome != null && input.fulltimeAway != null) {
    return { local: input.fulltimeHome, visitante: input.fulltimeAway };
  }
  return null;
}

/** Empate en quiniela aunque un equipo gane la tanda de penales. */
export function quinielaMarcadorAfterPenalties(
  regulationOrEtScore: QuinielaMarcadorSide,
): QuinielaMarcadorSide {
  return regulationOrEtScore;
}
