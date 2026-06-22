import type { Outcome } from "@/lib/insights/pick-aggregates";
import type { PitonisoLabInput } from "@/lib/ai/pitoniso-lab-types";
import type { PitonisoStaticContext } from "@/lib/partidos/pitoniso-signals";

function leaderText(
  outcome: Outcome | null,
  localName: string,
  awayName: string,
): string {
  if (!outcome) return "no tengo esa señal";
  if (outcome === "local") return `favorece a ${localName}`;
  if (outcome === "visitante") return `favorece a ${awayName}`;
  return "sugiere empate";
}

/** Serializa contexto Pitoniso estático → input del lab (sin multitud). */
export function pitonisoStaticContextToLabInput(
  ctx: PitonisoStaticContext,
  crowdLine?: string,
): PitonisoLabInput {
  const { partido, signalLeaders, staticSignalContradiction, rankingSignal, local, visitante } =
    ctx;

  const formLocal = local.form.formNorm;
  const formAway = visitante.form.formNorm;
  let formLine = leaderText(
    signalLeaders.form,
    partido.equipoLocalNombre,
    partido.equipoVisitanteNombre,
  );
  if (formLocal != null || formAway != null) {
    formLine += ` (forma normalizada local: ${formLocal ?? "—"}, visitante: ${formAway ?? "—"})`;
  }

  let rankingLine = "no tengo esa señal";
  if (rankingSignal) {
    rankingLine = `${rankingSignal.label}; líder ranking: ${rankingSignal.leader}; diff ${rankingSignal.rankDiff}`;
  }

  return {
    match: {
      home: partido.equipoLocalNombre,
      away: partido.equipoVisitanteNombre,
      kickoff: partido.fechaKickoff,
    },
    signals: {
      crowd: crowdLine ?? "no tengo esa señal (requiere agregados de multitud)",
      form: formLine,
      table: leaderText(
        signalLeaders.table,
        partido.equipoLocalNombre,
        partido.equipoVisitanteNombre,
      ),
      ranking: rankingLine,
      drawSignal: "no tengo esa señal (requiere agregados de multitud en cliente)",
      contradictions: staticSignalContradiction.conflicts,
    },
  };
}

export const PITONISO_LAB_MOCK_INPUT: PitonisoLabInput = {
  match: {
    home: "México",
    away: "Corea del Sur",
    kickoff: "2026-06-15T20:00:00-06:00",
  },
  signals: {
    crowd: "favorece a México (42% local, 28% empate, 30% visitante)",
    form: "favorece a México (forma normalizada local: 0.72, visitante: 0.55)",
    table: "favorece a México (2° vs 4° en grupo)",
    ranking: "favorece visitante; gap ranking 8 posiciones",
    drawSignal: "señal media de empate por multitud dividida",
    contradictions: ["crowd_vs_ranking"],
  },
};
