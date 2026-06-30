import { getPenNotifyScore } from "@/lib/api-football/penalty-notify-state";
import { parsePenaltyScoresFromMetadata } from "@/lib/partidos/match-clock";
import type { Partido } from "@/types/database";

type PartidoResultRow = Pick<
  Partido,
  | "estatus"
  | "marcador_local"
  | "marcador_visitante"
  | "equipo_local_codigo"
  | "equipo_visitante_codigo"
  | "equipo_local_nombre"
  | "equipo_visitante_nombre"
  | "metadata"
>;

/** Ganador de un partido eliminatorio (incluye tanda de penales). */
export function resolveKnockoutSideWinner(
  partido: PartidoResultRow,
  side: "home" | "away",
): { teamId: string; teamName: string } | null {
  if (partido.estatus !== "finalizado") return null;
  if (partido.marcador_local == null || partido.marcador_visitante == null) {
    return null;
  }

  const penFromMeta = parsePenaltyScoresFromMetadata(partido.metadata);
  const penNotify = getPenNotifyScore(partido.metadata);
  const pen =
    penFromMeta.local != null && penFromMeta.visitante != null
      ? penFromMeta
      : penNotify
        ? { local: penNotify.local, visitante: penNotify.away }
        : penFromMeta;
  const hasPenalties =
    pen.local != null &&
    pen.visitante != null &&
    pen.local !== pen.visitante;

  if (partido.marcador_local === partido.marcador_visitante && hasPenalties) {
    const homeWinsPen = pen.local! > pen.visitante!;
    if (side === "home" && homeWinsPen) {
      return {
        teamId: partido.equipo_local_codigo,
        teamName: partido.equipo_local_nombre,
      };
    }
    if (side === "away" && !homeWinsPen) {
      return {
        teamId: partido.equipo_visitante_codigo,
        teamName: partido.equipo_visitante_nombre,
      };
    }
    return null;
  }

  const homeWins = partido.marcador_local > partido.marcador_visitante;
  const awayWins = partido.marcador_visitante > partido.marcador_local;
  if (!homeWins && !awayWins) return null;

  if (side === "home" && homeWins) {
    return {
      teamId: partido.equipo_local_codigo,
      teamName: partido.equipo_local_nombre,
    };
  }
  if (side === "away" && awayWins) {
    return {
      teamId: partido.equipo_visitante_codigo,
      teamName: partido.equipo_visitante_nombre,
    };
  }

  return null;
}
