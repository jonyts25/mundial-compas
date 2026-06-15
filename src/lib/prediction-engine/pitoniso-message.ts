/**
 * El Pitoniso — capa de copy (PI-1).
 *
 * Plantillas rule-based. Sin score, sin fetch, sin analytics.
 */

import type { Outcome, ScoreBucket } from "@/lib/insights/pick-aggregates";
import type { PickValue } from "@/lib/prediction-engine/pick-value";
import type {
  MatchPreviewConfidence,
  MatchPreviewFavorite,
  MatchPreviewVerdict,
} from "@/lib/prediction-engine/match-preview";

export const PITONISO_DISCLAIMER_SHORT =
  "Solo entretenimiento. El Pitoniso resume datos de la quiniela y del torneo; no es predicción real ni consejo de apuesta.";

export const PITONISO_DISCLAIMER_LONG =
  "El Pitoniso es una opinión recreativa. Combina tendencias de la quiniela (picks agregados), resultados del torneo en la app y contexto del partido. No usa inteligencia artificial ni datos de casas de apuestas. No garantiza resultados y no sustituye tu criterio al pronosticar.";

export interface PitonisoMessageInput {
  verdict: MatchPreviewVerdict;
  homeName: string;
  awayName: string;
  pickValueTop: PickValue | null;
  localTablePosition: number | null;
  awayTablePosition: number | null;
  localFormDebut?: boolean;
  awayFormDebut?: boolean;
  isLastGroupMatch?: boolean;
}

export interface PitonisoMessage {
  message: string;
  confidenceLabel: string;
  confidenceEmoji: string;
}

const CONFIDENCE_UI: Record<
  MatchPreviewConfidence,
  { label: string; emoji: string }
> = {
  indeciso: { label: "El Pitoniso no se decide", emoji: "🔮❓" },
  leve: { label: "Leve inclinación", emoji: "🔮🤏" },
  bastante: { label: "El Pitoniso ve señales claras", emoji: "🔮👀" },
  presentimiento: { label: "Fuerte presentimiento", emoji: "🔮✨" },
};

export function confidenceUiLabel(confidence: MatchPreviewConfidence): string {
  return CONFIDENCE_UI[confidence].label;
}

export function confidenceUiEmoji(confidence: MatchPreviewConfidence): string {
  return CONFIDENCE_UI[confidence].emoji;
}

function favoriteTeamName(
  favorite: MatchPreviewFavorite,
  homeName: string,
  awayName: string,
): string {
  switch (favorite) {
    case "local":
      return homeName;
    case "visitante":
      return awayName;
    case "empate":
      return "el empate";
  }
}

function crowdPctForFavorite(
  favorite: MatchPreviewFavorite,
  verdict: MatchPreviewVerdict,
): number {
  const s = verdict.signals;
  switch (favorite) {
    case "local":
      return Math.round(s.crowdLocal * 100);
    case "empate":
      return Math.round(s.crowdDraw * 100);
    case "visitante":
      return Math.round(s.crowdAway * 100);
  }
}

function crowdDominantSide(verdict: MatchPreviewVerdict): Outcome {
  const { crowdLocal, crowdDraw, crowdAway } = verdict.signals;
  if (crowdLocal >= crowdDraw && crowdLocal >= crowdAway) return "local";
  if (crowdAway >= crowdDraw && crowdAway >= crowdLocal) return "visitante";
  return "empate";
}

function describeTablePosition(
  position: number | null,
  teamName: string,
): string | null {
  if (position == null) return null;
  return `${teamName} va ${position}.º en el grupo`;
}

function popularScoreLine(
  pickValueTop: PickValue | null,
  mostPopularScore: ScoreBucket | null,
): string | null {
  if (!pickValueTop?.sampleOk || !mostPopularScore) return null;
  return `El marcador más repetido en la quiniela: **${mostPopularScore.local}-${mostPopularScore.visitante}** (**${pickValueTop.scoreSharePct}%**). Eso es moda de picks, no un resultado asegurado — ojo ahí.`;
}

function closingPhrase(confidence: MatchPreviewConfidence, favoriteName: string): string {
  switch (confidence) {
    case "indeciso":
      return "Señales mezcladas — nada escrito en piedra.";
    case "leve":
      return `Leve inclinación hacia **${favoriteName}** — nada escrito en piedra.`;
    case "bastante":
      return `Inclinación recreativa hacia **${favoriteName}**.`;
    case "presentimiento":
      return `Fuerte inclinación recreativa hacia **${favoriteName}** — el balón siempre redondo.`;
  }
}

/**
 * Construye el mensaje de El Pitoniso a partir del veredicto del motor.
 */
export function buildPitonisoMessage(input: PitonisoMessageInput): PitonisoMessage {
  const {
    verdict,
    homeName,
    awayName,
    pickValueTop,
    localTablePosition,
    awayTablePosition,
    localFormDebut,
    awayFormDebut,
    isLastGroupMatch,
  } = input;

  const ui = CONFIDENCE_UI[verdict.confidence];
  const favoriteName = favoriteTeamName(verdict.favorite, homeName, awayName);
  const crowdPct = crowdPctForFavorite(verdict.favorite, verdict);
  const parts: string[] = [];

  if (!verdict.crowdSampleOk && verdict.totalPicks === 0) {
    parts.push(
      "Aún no hay señales suficientes en la quiniela. El Pitoniso necesita más pronósticos o resultados del torneo para orientarse.",
    );
    return {
      message: parts.join(" "),
      confidenceLabel: ui.label,
      confidenceEmoji: ui.emoji,
    };
  }

  if (!verdict.crowdSampleOk && verdict.totalPicks > 0) {
    parts.push(
      "Todavía hay pocos pronósticos. Por ahora El Pitoniso se guía más por la tabla y la racha que por la multitud.",
    );
  }

  if (localFormDebut && awayFormDebut) {
    parts.push(
      `Debut de **${homeName}** y **${awayName}** en el torneo. El Pitoniso mira sobre todo la quiniela hasta que haya más historial en la cancha.`,
    );
  } else if (localFormDebut) {
    parts.push(
      `Debut de **${homeName}** en el torneo. El Pitoniso se fija mucho en lo que dice la quiniela por ahora.`,
    );
  } else if (awayFormDebut) {
    parts.push(
      `Debut de **${awayName}** en el torneo. El Pitoniso se fija mucho en lo que dice la quiniela por ahora.`,
    );
  }

  if (verdict.confidence === "indeciso") {
    parts.push(
      "El Pitoniso movió las cartas y sigue en duda. Típico partido donde cualquiera se complica la vida.",
    );
    const popular = popularScoreLine(pickValueTop, verdict.mostPopularScore);
    if (popular) parts.push(popular);
    return {
      message: parts.join(" "),
      confidenceLabel: ui.label,
      confidenceEmoji: ui.emoji,
    };
  }

  const crowdSide = crowdDominantSide(verdict);
  const crowdSideName =
    crowdSide === "local"
      ? homeName
      : crowdSide === "visitante"
        ? awayName
        : "el empate";
  const crowdSidePct = crowdPctForFavorite(crowdSide, verdict);

  const tableLocalLine = describeTablePosition(localTablePosition, homeName);
  const tableAwayLine = describeTablePosition(awayTablePosition, awayName);
  const formFavorsAway =
    verdict.signals.formAway > verdict.signals.formLocal + 0.08;
  const formFavorsLocal =
    verdict.signals.formLocal > verdict.signals.formAway + 0.08;
  const crowdVsFavorite = crowdSide !== verdict.favorite;

  if (isLastGroupMatch) {
    parts.push(
      "Última jornada de grupo y el pase en juego. El Pitoniso nota presión en la tabla.",
    );
  }

  if (verdict.favorite === "empate") {
    parts.push(
      `A El Pitoniso le huele a partido cerrado: **${crowdPct}%** en la quiniela inclinan al empate y la tabla está pareja. Puede ser un día de empates y nervios.`,
    );
  } else if (crowdVsFavorite && formFavorsAway && verdict.favorite === "visitante") {
    parts.push(
      `La multitud apunta hacia **${crowdSideName}** (**${crowdSidePct}%**), pero el torneo cuenta otra historia: **${awayName}** llega con mejor forma. El Pitoniso inclina hacia el visitante con cautela.`,
    );
  } else if (crowdVsFavorite && formFavorsLocal && verdict.favorite === "local") {
    parts.push(
      `La multitud apunta hacia **${crowdSideName}** (**${crowdSidePct}%**), pero **${homeName}** trae mejor racha en el torneo. El Pitoniso no mete las manos al fuego por un solo bando.`,
    );
  } else if (verdict.crowdSampleOk) {
    parts.push(
      `El Pitoniso ve señales interesantes: **${crowdPct}%** de la quiniela inclina al ${verdict.favorite === "local" ? "local" : verdict.favorite === "visitante" ? "visitante" : "empate"}.`,
    );
    if (tableLocalLine && verdict.favorite === "local") {
      parts.push(`${tableLocalLine} con mejor forma reciente.`);
    } else if (tableAwayLine && verdict.favorite === "visitante") {
      parts.push(`${tableAwayLine} con mejor forma reciente.`);
    } else if (tableLocalLine || tableAwayLine) {
      const hint = [tableLocalLine, tableAwayLine].filter(Boolean).join("; ");
      if (hint) parts.push(`${hint}.`);
    }
  } else {
    if (tableLocalLine || tableAwayLine) {
      parts.push(
        `Sin multitud confiable aún. ${[tableLocalLine, tableAwayLine].filter(Boolean).join("; ")}.`,
      );
    }
  }

  parts.push(closingPhrase(verdict.confidence, favoriteName));

  const popular = popularScoreLine(pickValueTop, verdict.mostPopularScore);
  if (popular) parts.push(popular);

  return {
    message: parts.join(" "),
    confidenceLabel: ui.label,
    confidenceEmoji: ui.emoji,
  };
}

/** Nombre legible del favorito para UI (sin markdown). */
export function favoriteDisplayName(
  favorite: MatchPreviewFavorite,
  homeName: string,
  awayName: string,
): string {
  if (favorite === "empate") return "Empate";
  return favorite === "local" ? homeName : awayName;
}
