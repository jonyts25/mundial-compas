import type { MatchPhaseKind } from "@/lib/apifootball/webhook/types";
import type { PartidoPushTipo } from "@/lib/apifootball/webhook/notifications";
import {
  buildFulltimePushBody,
  buildFulltimePushTitle,
  type PenaltyScorePair,
} from "@/lib/apifootball/webhook/push-score";
import { generarNarracionCampeon } from "@/lib/narracion/comentaristas";
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

export function buildPhasePushMessage(
  phase: MatchPhaseKind,
  local: string,
  visitante: string,
  homeScore: number,
  awayScore: number,
  penaltyScores: PenaltyScorePair | null = null,
  opts: { isFinalMatch?: boolean } = {},
): { tipo: PartidoPushTipo; titulo: string; cuerpo: string } {
  const marcador = `${homeScore}-${awayScore}`;

  switch (phase) {
    case "kickoff":
      return {
        tipo: "inicio_partido",
        titulo: "🏁 Arranca el partido",
        cuerpo: `${local} vs ${visitante}. ¡Ya empezó!`,
      };
    case "halftime":
      return {
        tipo: "medio_tiempo",
        titulo: "⏸️ Medio tiempo",
        cuerpo: `${local} ${marcador} ${visitante}`,
      };
    case "second_half":
      return {
        tipo: "inicio_segundo_tiempo",
        titulo: "▶️ Segundo tiempo",
        cuerpo: `${local} ${marcador} ${visitante}. ¡Arranca la segunda parte!`,
      };
    case "extra_time_1st":
      return {
        tipo: "inicio_tiempo_extra",
        titulo: "⏱️ Tiempo extra",
        cuerpo: `${local} ${marcador} ${visitante}. ¡Arranca el primer tiempo extra!`,
      };
    case "extra_time_halftime":
      return {
        tipo: "medio_tiempo",
        titulo: "⏸️ Descanso (TE)",
        cuerpo: `${local} ${marcador} ${visitante}. Pausa entre tiempos extra.`,
      };
    case "extra_time_2nd":
      return {
        tipo: "inicio_tiempo_extra",
        titulo: "▶️ Segundo tiempo extra",
        cuerpo: `${local} ${marcador} ${visitante}. ¡Sigue el drama!`,
      };
    case "penalties":
      return {
        tipo: "inicio_penales",
        titulo: "🎯 Penales",
        cuerpo: `${local} ${marcador} ${visitante}. ¡A definir desde los 12 pasos!`,
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
          local,
          visitante,
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
        };
      }

      return {
        tipo: "fin_partido",
        titulo: buildFulltimePushTitle(fulltimeParams),
        cuerpo: buildFulltimePushBody(fulltimeParams),
      };
    }
  }
}
