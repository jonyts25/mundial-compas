import type { MatchPhaseKind } from "@/lib/api-football/push/types";
import type { PartidoPushTipo } from "@/lib/api-football/push/types";
import {
  buildFulltimePushBody,
  buildFulltimePushTitle,
  type PenaltyScorePair,
} from "@/lib/api-football/push/push-score";
import {
  generarNarracionCampeon,
  generarNarracionFase,
  PLANTILLAS_FIN,
  PLANTILLAS_INICIO,
  PLANTILLAS_MEDIO_TIEMPO,
  PLANTILLAS_MEDIO_TIEMPO_SIN_GOLES,
  PLANTILLAS_REGULATION_END,
  PLANTILLAS_SEGUNDO_TIEMPO,
} from "@/lib/narracion/comentaristas";
import { displayTeamPair } from "@/lib/teams/display-names";
import type { FaseMundial } from "@/types/database";

export function isFinalMatch(
  fase: FaseMundial | string | null | undefined,
  roundHint?: string | null,
): boolean {
  if (fase === "final") return true;
  const r = (roundHint ?? "").trim().toLowerCase();
  if (!r) return false;
  if (r.includes("semi")) return false;
  return r === "final" || r.endsWith(" - final") || /\bfinal\b/.test(r);
}

function phaseEventKey(phase: MatchPhaseKind, homeScore: number, awayScore: number): string {
  return `phase-${phase}-${homeScore}-${awayScore}`;
}

export function buildPhasePushMessage(
  phase: MatchPhaseKind,
  local: string,
  visitante: string,
  homeScore: number,
  awayScore: number,
  penaltyScores: PenaltyScorePair | null = null,
  opts: { isFinalMatch?: boolean } = {},
): { tipo: PartidoPushTipo; titulo: string; cuerpo: string; event_key: string } {
  const teams = displayTeamPair(local, visitante);
  const marcador = `${homeScore}-${awayScore}`;
  const marcadorStr = marcador;
  const event_key = phaseEventKey(phase, homeScore, awayScore);

  switch (phase) {
    case "kickoff": {
      const narracion = generarNarracionFase(
        PLANTILLAS_INICIO,
        teams.local,
        teams.visitante,
      );
      return {
        tipo: "inicio_partido",
        titulo: "🏁 Arranca el partido",
        cuerpo: narracion.texto,
        event_key,
      };
    }
    case "halftime": {
      const plantillas =
        homeScore === 0 && awayScore === 0
          ? PLANTILLAS_MEDIO_TIEMPO_SIN_GOLES
          : PLANTILLAS_MEDIO_TIEMPO;
      const narracion = generarNarracionFase(
        plantillas,
        teams.local,
        teams.visitante,
        marcadorStr,
      );
      return {
        tipo: "medio_tiempo",
        titulo: "⏸️ Medio tiempo",
        cuerpo: narracion.texto,
        event_key,
      };
    }
    case "second_half": {
      const narracion = generarNarracionFase(
        PLANTILLAS_SEGUNDO_TIEMPO,
        teams.local,
        teams.visitante,
        marcadorStr,
      );
      return {
        tipo: "inicio_segundo_tiempo",
        titulo: "▶️ Segundo tiempo",
        cuerpo: narracion.texto,
        event_key,
      };
    }
    case "regulation_end": {
      const narracion = generarNarracionFase(
        PLANTILLAS_REGULATION_END,
        teams.local,
        teams.visitante,
        marcadorStr,
      );
      return {
        tipo: "fin_tiempo_reglamentario",
        titulo: "⏱️ Fin del 90'",
        cuerpo: narracion.texto,
        event_key,
      };
    }
    case "extra_time_1st":
      return {
        tipo: "inicio_tiempo_extra",
        titulo: "⏱️ Tiempo extra",
        cuerpo: `${teams.local} ${marcador} ${teams.visitante}. ¡Arranca el primer tiempo extra!`,
        event_key,
      };
    case "extra_time_halftime":
      return {
        tipo: "medio_tiempo",
        titulo: "⏸️ Descanso (TE)",
        cuerpo: `${teams.local} ${marcador} ${teams.visitante}. Pausa entre tiempos extra.`,
        event_key,
      };
    case "extra_time_2nd":
      return {
        tipo: "inicio_tiempo_extra",
        titulo: "▶️ Segundo tiempo extra",
        cuerpo: `${teams.local} ${marcador} ${teams.visitante}. ¡Sigue el drama!`,
        event_key,
      };
    case "penalties":
      return {
        tipo: "inicio_penales",
        titulo: "🎯 Penales",
        cuerpo: `${teams.local} ${marcador} ${teams.visitante}. ¡A definir desde los 12 pasos!`,
        event_key,
      };
    case "fulltime": {
      const fulltimeParams = {
        localName: local,
        visitanteName: visitante,
        homeScore,
        awayScore,
        penaltyScores,
      };

      if (opts.isFinalMatch) {
        const narracion = generarNarracionCampeon({
          local: teams.local,
          visitante: teams.visitante,
          marcadorLocal: homeScore,
          marcadorVisitante: awayScore,
          penaltyScores,
        });
        return {
          tipo: "fin_partido",
          titulo: buildFulltimePushTitle({
            ...fulltimeParams,
            isFinalMatch: true,
          }),
          cuerpo: narracion.texto,
          event_key,
        };
      }

      const finNarracion = generarNarracionFase(
        PLANTILLAS_FIN,
        teams.local,
        teams.visitante,
        marcadorStr,
      );

      return {
        tipo: "fin_partido",
        titulo: buildFulltimePushTitle(fulltimeParams),
        cuerpo: finNarracion.texto || buildFulltimePushBody(fulltimeParams),
        event_key,
      };
    }
  }
}
